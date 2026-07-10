function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showNav() {
  document.getElementById('navView').style.display = 'grid';
  document.querySelectorAll('.tool-view.active').forEach(v => v.classList.remove('active'));
}

function showTool(name) {
  document.getElementById('navView').style.display = 'none';
  document.querySelectorAll('.tool-view').forEach(v => v.classList.remove('active'));
  document.getElementById('tool-' + name).classList.add('active');
}

document.querySelectorAll('.nav-card').forEach(card => {
  card.addEventListener('click', () => showTool(card.dataset.tool));
});
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', showNav);
});

function updateFooterClock() {
  const now = new Date();
  const date = now.toLocaleDateString('zh-CN');
  const time = now.toLocaleTimeString('zh-CN', { hour12: false });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  document.getElementById('footerClock').textContent = `${date} ${time} · ${tz}`;
}
updateFooterClock();
setInterval(updateFooterClock, 1000);

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
