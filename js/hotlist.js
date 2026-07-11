// 平台中文名映射
const HOT_PLATFORMS = {
  biliHot: 'B站热门', tieba: '贴吧热榜'
};
// 平台对应卡片背景色
const HOT_BG_COLORS = {
  biliHot: 'rgba(0,169,232,0.08)', tieba: 'rgba(68,145,247,0.06)'
};
// 平台对应卡片边框色
const HOT_BORDER_COLORS = {
  biliHot: 'rgba(0,169,232,0.12)', tieba: 'rgba(68,145,247,0.1)'
};

// 定时器引用
let hotTimer = null;
// 监听热榜面板切换，切换到此面板时自动加载数据
const hotObserver = new MutationObserver(() => {
  if (document.getElementById('tool-hotlist').classList.contains('active')) {
    fetchHotData();
  }
});
hotObserver.observe(document.getElementById('tool-hotlist'), { attributes: true, attributeFilter: ['class'] });

// 热榜面板事件绑定：切换平台、切换数量、点击刷新均重新加载
document.getElementById('hotPlatform').addEventListener('change', fetchHotData);
document.getElementById('hotCount').addEventListener('change', fetchHotData);
document.getElementById('hotRefreshBtn').addEventListener('click', fetchHotData);

// fetchHotData - 从 hotlist.json 获取热榜数据并渲染
function fetchHotData() {
  const type = document.getElementById('hotPlatform').value;
  const count = parseInt(document.getElementById('hotCount').value) || 20;
  const container = document.getElementById('hotListContainer');
  const status = document.getElementById('hotStatus');
  const updateTime = document.getElementById('hotUpdateTime');

  status.textContent = '加载中...';
  container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-pulse" style="font-size:2rem;display:block;margin-bottom:8px;color:#d4cdbc"></i>加载中...</div>';

  if (window.location.protocol === 'file:') {
    container.innerHTML = '<div class="empty-state" style="color:#b85454"><i class="fas fa-exclamation-triangle" style="font-size:2rem;display:block;margin-bottom:8px"></i>file:// 协议无法读取数据<br><span style="font-size:0.8rem">请使用本地服务器访问（如 python -m http.server 8000）</span></div>';
    status.textContent = '未就绪';
    return;
  }

  let fileTime = '';
  fetch('hotlist.json?_=' + Date.now())
    .then(r => {
      const lastMod = r.headers.get('Last-Modified');
      if (lastMod) fileTime = new Date(lastMod).toLocaleString('zh-CN');
      return r.json();
    })
    .then(all => {
      if (all && all.data && all.data[type] && Array.isArray(all.data[type]) && all.data[type].length) {
        renderHotList(all.data[type].slice(0, count), type, container, status, updateTime);
        updateTime.textContent = '数据时间: ' + (fileTime || (all.updated || '').replace('T', ' ').slice(0, 19));
        return;
      }
      throw new Error('no data');
    })
    .catch(() => {
      container.innerHTML = '<div class="empty-state" style="color:#b85454"><i class="fas fa-exclamation-triangle" style="font-size:2rem;display:block;margin-bottom:8px"></i>等待 GitHub Actions 生成数据<br><span style="font-size:0.8rem">或手动去 Actions 页面触发更新</span></div>';
      status.textContent = '未就绪';
    });
}

// renderHotList - 渲染热榜列表 HTML
function renderHotList(items, type, container, status, updateTime) {
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="far fa-frown" style="font-size:2rem;display:block;margin-bottom:8px;color:#d4cdbc"></i>暂无数据</div>';
    status.textContent = '就绪';
    return;
  }

  const bgColor = HOT_BG_COLORS[type] || 'rgba(107,143,94,0.06)';
  const borderColor = HOT_BORDER_COLORS[type] || 'rgba(107,143,94,0.1)';
  const platformName = HOT_PLATFORMS[type] || type;

  let html = '<div style="background:#fcfaf5;border:1px solid ' + borderColor + ';border-radius:10px;overflow:hidden">';
  html += '<div style="padding:10px 14px;font-size:0.82rem;font-weight:600;color:#6b8f5e;background:' + bgColor + ';border-bottom:1px solid ' + borderColor + '"><i class="fas fa-fire" style="margin-right:6px"></i>' + platformName + '</div>';

  items.forEach((item, i) => {
    const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : 'normal';
    const title = escapeHtml(item.title || '无标题');
    const hot = item.hot ? escapeHtml(String(item.hot)) : '';
    const url = item.url || '';
    html += '<div class="hot-item">';
    html += '<div class="hot-rank ' + rankClass + '">' + (i + 1) + '</div>';
    html += '<div style="flex:1;min-width:0">';
    if (url) {
      html += '<div class="hot-title" onclick="window.open(\'' + url.replace(/'/g, "\\'") + '\',\'_blank\')" title="' + title + '">' + title + '</div>';
    } else {
      html += '<div class="hot-title" title="' + title + '">' + title + '</div>';
    }
    if (hot) html += '<div class="hot-hot">' + hot + '</div>';
    html += '</div></div>';
  });

  html += '</div>';
  container.innerHTML = html;
  status.textContent = '已更新';
}
