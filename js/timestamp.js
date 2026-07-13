// pad2 - 数字补零至两位
function pad2(n) { return String(n).padStart(2, '0'); }
// formatDate - 格式化日期对象为 "YYYY-MM-DD HH:mm:ss"
function formatDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

// updateClock - 实时更新当前时间戳与日期显示
function updateClock() {
  const now = Date.now();
  document.getElementById('tsNowSec').textContent = Math.floor(now / 1000);
  document.getElementById('tsNowMs').textContent = now;
  document.getElementById('tsNowDate').textContent = formatDate(new Date());
}
updateClock(); // 初始立即显示
setInterval(updateClock, 500);

// 时间戳转日期输入框 - 默认填入当前时间戳，回车触发转换
document.getElementById('tsToDateInput').value = Math.floor(Date.now() / 1000);
document.getElementById('tsToDateInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('tsToDateBtn').click(); });

// 时间戳 → 日期：将输入的时间戳转为可读日期
document.getElementById('tsToDateBtn').addEventListener('click', () => {
  const input = document.getElementById('tsToDateInput').value.trim();
  const result = document.getElementById('tsToDateResult');
  const ts = Number(input);
  if (isNaN(ts) || input === '') {
    result.innerHTML = '<span style="color:#b85454">请输入有效数字</span>';
    return;
  }
  const ms = ts > 1e10 ? ts : ts * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) {
    result.innerHTML = '<span style="color:#b85454">无效时间戳</span>';
    return;
  }
  result.textContent = formatDate(d) + ' (UTC' + (d.getTimezoneOffset() === 0 ? '+0' : (d.getTimezoneOffset() > 0 ? '-' : '+') + Math.abs(d.getTimezoneOffset() / 60)) + ')';
});

// 日期 → 时间戳：将输入的日期转为秒级和毫秒级时间戳
document.getElementById('tsFromDateBtn').addEventListener('click', () => {
  const input = document.getElementById('tsFromDateInput').value;
  const secEl = document.getElementById('tsFromDateSec');
  const msEl = document.getElementById('tsFromDateMs');
  if (!input) {
    secEl.innerHTML = '<span style="color:#b85454">请选择日期时间</span>';
    msEl.innerHTML = '<span style="color:#b85454">请选择日期时间</span>';
    return;
  }
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    secEl.innerHTML = '<span style="color:#b85454">无效日期</span>';
    msEl.innerHTML = '<span style="color:#b85454">无效日期</span>';
    return;
  }
  const ms = d.getTime();
  secEl.textContent = Math.floor(ms / 1000);
  msEl.textContent = ms;
});

// 日期转时间戳输入框默认填入当前时间
document.getElementById('tsFromDateInput').value = formatDate(new Date()).slice(0, 16);
// 页面加载后自动执行一次转换，显示初始结果
document.getElementById('tsToDateBtn').click();
document.getElementById('tsFromDateBtn').click();
