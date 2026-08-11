// easter-egg - 黑客帝国数字雨彩蛋：连续点击标题 7 次触发全屏特效
// 点击画面或按 Esc 退出

var EGG_CLICKS = 0;
var EGG_LAST = 0;
var EGG_LIMIT = 7;

function eggHandleTitleClick() {
  var now = Date.now();
  if (now - EGG_LAST > 800) EGG_CLICKS = 0;
  EGG_LAST = now;
  EGG_CLICKS++;
  if (EGG_CLICKS >= EGG_LIMIT) {
    EGG_CLICKS = 0;
    startMatrixRain();
  }
}

function startMatrixRain() {
  if (document.getElementById('eggCanvas')) return;
  var canvas = document.createElement('canvas');
  canvas.id = 'eggCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:pointer;background:rgba(0,0,0,0.92)';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var fontSize = 24;
  var columns;
  var drops;
  var eggFrame;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = [];
    for (var i = 0; i < columns; i++) drops[i] = Math.floor(Math.random() * -canvas.height / fontSize);
  }
  resize();
  window.addEventListener('resize', resize);

  var chars = '01';

  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    ctx.font = fontSize + 'px monospace';
    for (var i = 0; i < columns; i++) {
      var ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    eggFrame = requestAnimationFrame(draw);
  }
  eggFrame = requestAnimationFrame(draw);

  function stop() {
    cancelAnimationFrame(eggFrame);
    window.removeEventListener('resize', resize);
    document.removeEventListener('keydown', escHandler);
    canvas.remove();
  }
  function escHandler(e) {
    if (e.key === 'Escape') stop();
  }
  canvas.addEventListener('click', stop);
  document.addEventListener('keydown', escHandler);
}

document.getElementById('eggTitle').addEventListener('click', eggHandleTitleClick);
