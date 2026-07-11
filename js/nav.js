// escapeHtml - HTML 转义，防止 XSS
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
      const icon = btn.querySelector('i');
      icon.className = 'fas fa-check';
      setTimeout(() => { icon.className = 'fas fa-copy'; }, 1500);
    });
  });
});
