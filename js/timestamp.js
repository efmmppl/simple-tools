function pad2(n) { return String(n).padStart(2, '0'); }
function formatDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function updateClock() {
  const now = Date.now();
  document.getElementById('tsNowSec').textContent = Math.floor(now / 1000);
  document.getElementById('tsNowMs').textContent = now;
  document.getElementById('tsNowDate').textContent = formatDate(new Date());
}
updateClock();
setInterval(updateClock, 100);

document.getElementById('tsToDateInput').value = Math.floor(Date.now() / 1000);
document.getElementById('tsToDateInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('tsToDateBtn').click(); });

document.getElementById('tsToDateBtn').addEventListener('click', () => {
  const input = document.getElementById('tsToDateInput').value.trim();
  const result = document.getElementById('tsToDateResult');
  const ts = Number(input);
  if (isNaN(ts) || input === '') {
    result.innerHTML = '<span style="color:#b85454">请输入有效数字</span>';
    return;
  }
  const ms = ts > 1e11 ? ts : ts * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) {
    result.innerHTML = '<span style="color:#b85454">无效时间戳</span>';
    return;
  }
  result.textContent = formatDate(d) + ' (UTC' + (d.getTimezoneOffset() === 0 ? '+0' : (d.getTimezoneOffset() > 0 ? '-' : '+') + Math.abs(d.getTimezoneOffset() / 60)) + ')';
});

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

document.getElementById('tsFromDateInput').value = formatDate(new Date()).slice(0, 16);
document.getElementById('tsToDateBtn').click();
document.getElementById('tsFromDateBtn').click();
