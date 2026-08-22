// escapeHtml - HTML 转义，防止 XSS
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

var RECENT_TOOLS_KEY = 'toolbox_recent_tools';
var FAVORITE_TOOLS_KEY = 'toolbox_favorite_tools';
var navCategory = 'all';

function readToolList(key) {
  try {
    var value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(function (name, index) { return typeof name === 'string' && value.indexOf(name) === index; }) : [];
  } catch (e) {
    return [];
  }
}

function getNavCards() {
  return Array.prototype.slice.call(document.querySelectorAll('.nav-card'));
}

function getNavCardText(card) {
  var name = card.querySelector('.nav-name');
  var desc = card.querySelector('.nav-desc');
  return ((name ? name.textContent : '') + ' ' + (desc ? desc.textContent : '')).toLowerCase();
}

function filterNavCards(query) {
  var normalized = (query || '').trim().toLowerCase();
  var visible = 0;
  getNavCards().forEach(function (card) {
    var categoryMatch = navCategory === 'all' || card.dataset.category === navCategory;
    var match = categoryMatch && (!normalized || getNavCardText(card).indexOf(normalized) !== -1);
    card.hidden = !match;
    if (match) visible++;
  });
  var noResults = document.getElementById('navNoResults');
  if (noResults) noResults.hidden = visible !== 0;
  var recent = document.getElementById('recentTools');
  if (recent) recent.hidden = !!normalized || !readToolList(RECENT_TOOLS_KEY).length;
  var favorites = document.getElementById('favoriteTools');
  if (favorites) favorites.hidden = !!normalized || !readToolList(FAVORITE_TOOLS_KEY).length;
}

function filterNavCategory(category) {
  navCategory = category || 'all';
  document.querySelectorAll('.nav-category').forEach(function (button) {
    var active = button.dataset.category === navCategory;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  var search = document.getElementById('navSearch');
  filterNavCards(search ? search.value : '');
}

function recordRecentTool(name) {
  var recent = readToolList(RECENT_TOOLS_KEY).filter(function (item) { return item !== name; });
  recent.unshift(name);
  try { localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(recent.slice(0, 6))); } catch (e) {}
  renderRecentTools();
}

function renderRecentTools() {
  var section = document.getElementById('recentTools');
  var list = document.getElementById('recentToolsList');
  if (!section || !list) return;
  var cards = getNavCards();
  var byTool = {};
  cards.forEach(function (card) { byTool[card.dataset.tool] = card; });
  var recent = readToolList(RECENT_TOOLS_KEY).filter(function (name) { return byTool[name]; });
  section.hidden = !recent.length || !!(document.getElementById('navSearch') || {}).value;
  var layout = document.querySelector ? document.querySelector('.nav-layout') : null;
  if (layout) layout.classList.toggle('has-recent', !section.hidden);
  list.innerHTML = recent.map(function (name) {
    var card = byTool[name];
    var icon = card.querySelector('.nav-icon');
    var title = card.querySelector('.nav-name');
    return '<button class="recent-tool" type="button" data-tool="' + escapeHtml(name) + '">' +
      (icon ? icon.innerHTML : '') + '<span>' + escapeHtml(title ? title.textContent : name) + '</span></button>';
  }).join('');
  list.querySelectorAll('.recent-tool').forEach(function (button) {
    button.addEventListener('click', function () { showTool(button.dataset.tool); });
  });
}

function renderFavoriteTools() {
  var section = document.getElementById('favoriteTools');
  var list = document.getElementById('favoriteToolsList');
  if (!section || !list) return;
  var cards = getNavCards();
  var byTool = {};
  cards.forEach(function (card) { byTool[card.dataset.tool] = card; });
  var favorites = readToolList(FAVORITE_TOOLS_KEY).filter(function (name) { return byTool[name]; });
  var search = document.getElementById('navSearch');
  section.hidden = !favorites.length || !!(search && search.value);
  var layout = document.querySelector ? document.querySelector('.nav-layout') : null;
  if (layout) layout.classList.toggle('has-favorites', !section.hidden);
  list.innerHTML = favorites.map(function (name) {
    var card = byTool[name];
    var icon = card.querySelector('.nav-icon');
    var title = card.querySelector('.nav-name');
    return '<button class="favorite-tool" type="button" data-tool="' + escapeHtml(name) + '">' +
      (icon ? icon.innerHTML : '') + '<span>' + escapeHtml(title ? title.textContent : name) + '</span></button>';
  }).join('');
  list.querySelectorAll('.favorite-tool').forEach(function (button) {
    button.addEventListener('click', function () { showTool(button.dataset.tool); });
  });
}

function toggleNavFavorite(name) {
  var favorites = readToolList(FAVORITE_TOOLS_KEY);
  var index = favorites.indexOf(name);
  if (index === -1) favorites.unshift(name);
  else favorites.splice(index, 1);
  try { localStorage.setItem(FAVORITE_TOOLS_KEY, JSON.stringify(favorites)); } catch (e) {}
  updateNavFavoriteButtons();
  renderFavoriteTools();
}

function updateNavFavoriteButtons() {
  var favorites = readToolList(FAVORITE_TOOLS_KEY);
  getNavCards().forEach(function (card) {
    var button = card.querySelector('.nav-favorite');
    if (!button) return;
    var active = favorites.indexOf(card.dataset.tool) !== -1;
    button.classList.toggle('active', active);
    button.setAttribute('aria-label', active ? '取消常用' : '设为常用');
    button.innerHTML = '<i class="fas fa-star"></i>';
  });
}

function showToast(message, type) {
  var toast = document.getElementById('appToast');
  if (!toast) return;
  clearTimeout(showToast.timer);
  toast.textContent = message;
  toast.className = 'app-toast show ' + (type || 'info');
  showToast.timer = setTimeout(function () { toast.className = 'app-toast'; }, 4000);
}

// parseToolFromHash - 解析当前 hash 中的工具名，无匹配返回 null
function parseToolFromHash() {
  var m = (location.hash || '').match(/^#\/tool\/([\w-]+)$/);
  return m ? m[1] : null;
}

// renderView - 根据当前 hash 渲染导航页或对应工具视图，并滚动到顶部
function renderView() {
  var name = parseToolFromHash();
  var view = name && document.getElementById('tool-' + name);
  if (!view) {
    document.getElementById('navView').style.display = 'grid';
    document.querySelectorAll('.tool-view.active').forEach(v => v.classList.remove('active'));
  } else {
    document.getElementById('navView').style.display = 'none';
    document.querySelectorAll('.tool-view.active').forEach(v => v.classList.remove('active'));
    view.classList.add('active');
  }
  window.scrollTo(0, 0);
}

// showNav - 显示导航主页（更新 hash，触发渲染）
function showNav() {
  if (location.hash && location.hash !== '#/') location.hash = '#/';
  else renderView();
}

// showTool - 切换到指定工具视图（更新 hash，触发渲染）
function showTool(name) {
  var target = '#/tool/' + name;
  recordRecentTool(name);
  if (location.hash !== target) location.hash = target;
  else renderView();
}

// 导航卡片点击事件 - 进入对应工具
document.querySelectorAll('.nav-card').forEach(card => {
  card.addEventListener('click', () => showTool(card.dataset.tool));
});
// 返回按钮点击事件 - 返回导航主页
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', showNav);
});

// updateFooterClock - 更新底部栏实时时钟
function updateFooterClock() {
  const now = new Date();
  const date = now.toLocaleDateString('zh-CN');
  const time = now.toLocaleTimeString('zh-CN', { hour12: false });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  document.getElementById('footerClock').textContent = `${date} ${time} · ${tz}`;
}
updateFooterClock(); // 初始立即显示
setInterval(updateFooterClock, 1000); // 每秒更新

// 复制按钮点击事件 - 将目标内容复制到剪贴板
document.querySelectorAll('.ts-copy').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    const text = target.textContent;
    if (!text || text.startsWith('请') || text.startsWith('点击')) return;
    navigator.clipboard.writeText(text).then(() => {
      var icon = btn.querySelector('i');
      icon.className = 'fas fa-check';
      setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500);
      showToast('已复制', 'success');
    }).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      var icon = btn.querySelector('i');
      icon.className = copied ? 'fas fa-check' : 'far fa-copy';
      setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500);
      showToast(copied ? '已复制' : '复制失败，请手动复制', copied ? 'success' : 'error');
    });
  });
});

document.querySelectorAll('.nav-card').forEach(function (card) {
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.insertAdjacentHTML('afterbegin', '<button class="nav-favorite" type="button" aria-label="设为常用" title="设为常用"><i class="fas fa-star"></i></button>');
  card.querySelector('.nav-favorite').addEventListener('click', function (e) {
    e.stopPropagation();
    toggleNavFavorite(card.dataset.tool);
  });
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showTool(card.dataset.tool);
    }
  });
});

updateNavFavoriteButtons();
renderRecentTools();
renderFavoriteTools();

var navSearch = document.getElementById('navSearch');
if (navSearch) {
  navSearch.addEventListener('input', function () { filterNavCards(navSearch.value); });
}
var navSearchClear = document.getElementById('navSearchClear');
if (navSearchClear) {
  navSearchClear.addEventListener('click', function () {
    if (!navSearch) return;
    navSearch.value = '';
    filterNavCards('');
    navSearch.focus();
  });
}
document.querySelectorAll('.nav-category').forEach(function (button) {
  button.addEventListener('click', function () { filterNavCategory(button.dataset.category); });
});
filterNavCategory('all');

document.addEventListener('keydown', function (e) {
  var target = e.target;
  var editing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
  if (e.key === '/' && !editing && navSearch) {
    e.preventDefault();
    navSearch.focus();
  } else if (e.key === 'Escape' && !editing && parseToolFromHash()) {
    showNav();
  }
});

// hash 变化时重新渲染视图（后退/前进、直接改 URL 均触发）
window.addEventListener('hashchange', renderView);
// 首次加载按当前 hash 渲染；延迟到 DOMContentLoaded 等工具脚本就绪，确保数据工具的 MutationObserver 已挂载
document.addEventListener('DOMContentLoaded', renderView);
