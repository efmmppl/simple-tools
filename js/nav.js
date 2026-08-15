// escapeHtml - HTML 转义，防止 XSS
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// showNav - 显示导航主页，隐藏所有工具视图
function showNav() {
  document.getElementById('navView').style.display = 'grid';
  document.querySelectorAll('.tool-view.active').forEach(v => v.classList.remove('active'));
}

// showTool - 切换到指定工具视图
function showTool(name) {
  document.getElementById('navView').style.display = 'none';
  document.querySelectorAll('.tool-view').forEach(v => v.classList.remove('active'));
  document.getElementById('tool-' + name).classList.add('active');
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
    }).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      var icon = btn.querySelector('i');
      icon.className = 'fas fa-check';
      setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500);
    });
  });
});

// 导航卡片拖拽排序 - 长按拖动调整顺序，保存到 localStorage
var NAV_ORDER_KEY = 'toolbox_nav_order';
var navGridEl = document.getElementById('navView');
var navDragCard = null;

// saveNavOrder - 把当前卡片顺序写入 localStorage
function saveNavOrder() {
  var order = [];
  document.querySelectorAll('.nav-card').forEach(function (c) { order.push(c.dataset.tool); });
  try { localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order)); } catch (e) {}
}

// loadNavOrder - 按保存的顺序重排卡片，新工具追加在末尾
function loadNavOrder() {
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(NAV_ORDER_KEY)); } catch (e) {}
  if (!Array.isArray(saved) || !saved.length) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.nav-card'));
  var byTool = {};
  cards.forEach(function (c) { byTool[c.dataset.tool] = c; });
  var ordered = [];
  var known = {};
  saved.forEach(function (tool) {
    if (byTool[tool] && !known[tool]) { ordered.push(byTool[tool]); known[tool] = true; }
  });
  cards.forEach(function (c) {
    if (!known[c.dataset.tool]) ordered.push(c);
  });
  ordered.forEach(function (c) { navGridEl.appendChild(c); });
}

document.querySelectorAll('.nav-card').forEach(function (card) {
  card.draggable = true;
  card.addEventListener('dragstart', function (e) {
    navDragCard = card;
    card.classList.add('nav-dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', card.dataset.tool); } catch (err) {}
  });
  card.addEventListener('dragend', function () {
    card.classList.remove('nav-dragging');
    navDragCard = null;
    saveNavOrder();
  });
  card.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!navDragCard || navDragCard === card) return;
    var rect = card.getBoundingClientRect();
    var dx = e.clientX - (rect.left + rect.width / 2);
    var dy = e.clientY - (rect.top + rect.height / 2);
    var before = Math.abs(dx) > Math.abs(dy) ? dx < 0 : dy < 0;
    if (before) navGridEl.insertBefore(navDragCard, card);
    else navGridEl.insertBefore(navDragCard, card.nextSibling);
  });
  card.addEventListener('drop', function (e) { e.preventDefault(); });
});

loadNavOrder();
