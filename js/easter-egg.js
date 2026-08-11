// easter-egg - 彩蛋集合：
// 1. 黑客帝国数字雨：连续点击标题 7 次触发，点击画面或按 Esc 退出
// 2. 神秘像素风模式：键盘输入 mario 触发/关闭，按 Esc 退出
// 3. 迷你打地鼠：连续点击 footer 时钟 3 次触发，30 秒计分

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

// ======== 彩蛋 2：神秘像素风模式（输入 mario 触发） ========
var EGG_PIXEL_KEYS = [];
var EGG_PIXEL_CODE = 'mario';

function eggHandlePixelKey(e) {
  if (e.key === 'Escape') {
    if (document.body.classList.contains('pixel-mode')) togglePixelMode();
    return;
  }
  if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
  EGG_PIXEL_KEYS.push(e.key.toLowerCase());
  if (EGG_PIXEL_KEYS.length > EGG_PIXEL_CODE.length) EGG_PIXEL_KEYS.shift();
  if (EGG_PIXEL_KEYS.join('') === EGG_PIXEL_CODE) {
    EGG_PIXEL_KEYS = [];
    togglePixelMode();
  }
}

function togglePixelMode() {
  document.body.classList.toggle('pixel-mode');
  if (document.body.classList.contains('pixel-mode')) {
    var note = document.createElement('div');
    note.id = 'pixelNote';
    note.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9998;background:#3d3a35;color:#fff;padding:8px 16px;border-radius:6px;font-size:0.82rem;font-family:monospace';
    note.textContent = '像素风模式已开启 - 再输 mario 或按 Esc 关闭';
    document.body.appendChild(note);
    var overlay = document.createElement('div');
    overlay.className = 'pixel-overlay';
    document.body.appendChild(overlay);
    var scanline = document.createElement('div');
    scanline.className = 'pixel-scanline';
    document.body.appendChild(scanline);
  } else {
    var n = document.getElementById('pixelNote');
    if (n) n.remove();
    var o = document.querySelector('.pixel-overlay');
    if (o) o.remove();
    var s = document.querySelector('.pixel-scanline');
    if (s) s.remove();
  }
}

document.addEventListener('keydown', eggHandlePixelKey);

// ======== 彩蛋 3：迷你打地鼠（连点 footer 时钟 3 次触发） ========
var EGG_MOLE_CLICKS = 0;
var EGG_MOLE_LAST = 0;
var EGG_MOLE_LIMIT = 3;

function eggHandleFooterClick() {
  var now = Date.now();
  if (now - EGG_MOLE_LAST > 800) EGG_MOLE_CLICKS = 0;
  EGG_MOLE_LAST = now;
  EGG_MOLE_CLICKS++;
  if (EGG_MOLE_CLICKS >= EGG_MOLE_LIMIT) {
    EGG_MOLE_CLICKS = 0;
    startWhackAMole();
  }
}

function startWhackAMole() {
  if (document.getElementById('moleOverlay')) return;
  var overlay = document.createElement('div');
  overlay.id = 'moleOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9997;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = '<div style="background:var(--card);border-radius:12px;padding:20px 24px;width:min(340px,90vw);text-align:center;color:var(--text)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
    + '<b style="font-size:1rem"><i class="fas fa-hammer" style="color:var(--primary);margin-right:6px"></i>迷你打地鼠</b>'
    + '<button id="moleClose" class="btn btn-outline btn-sm"><i class="fas fa-times"></i> 关闭</button></div>'
    + '<div style="font-size:0.82rem;color:var(--text-soft);margin-bottom:10px">30 秒内尽可能多地砸中地鼠！</div>'
    + '<div id="moleGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px"></div>'
    + '<div style="font-size:0.9rem"><b id="moleScore" style="color:var(--primary)">0</b> 分　<i class="far fa-clock"></i> <b id="moleTimer" style="color:var(--text)">30</b>s</div></div>';
  document.body.appendChild(overlay);
  var grid = document.getElementById('moleGrid');
  for (var i = 0; i < 9; i++) {
    var hole = document.createElement('div');
    hole.className = 'mole-hole';
    hole.dataset.hole = String(i);
    hole.style.cssText = 'width:80px;height:80px;border-radius:50%;background:radial-gradient(circle at 50% 60%,#3a3328,#241f16);display:flex;align-items:center;justify-content:center;font-size:2rem;cursor:pointer;user-select:none';
    grid.appendChild(hole);
  }
  var score = 0;
  var timeLeft = 30;
  var scoreEl = document.getElementById('moleScore');
  var timerEl = document.getElementById('moleTimer');
  var holes = Array.prototype.slice.call(grid.children);
  var moleTimer;
  var spawnTimer;

  function spawnMole() {
    holes.forEach(function (h) { h.textContent = ''; });
    var target = holes[Math.floor(Math.random() * holes.length)];
    target.textContent = '🐹';
    setTimeout(function () { if (target.textContent === '🐹') target.textContent = ''; }, 1100);
  }

  grid.addEventListener('click', function (e) {
    var hole = e.target.closest('.mole-hole');
    if (!hole || hole.textContent !== '🐹') return;
    score++;
    scoreEl.textContent = String(score);
    hole.textContent = '';
  });

  spawnTimer = setInterval(spawnMole, 900);
  moleTimer = setInterval(function () {
    timeLeft--;
    timerEl.textContent = String(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(moleTimer);
      clearInterval(spawnTimer);
      holes.forEach(function (h) { h.textContent = ''; });
      var head = overlay.querySelector('b');
      head.innerHTML = '<i class="fas fa-trophy" style="color:var(--gold-rgb,var(--primary));margin-right:6px"></i>游戏结束！得分 ' + score + ' 分';
      return;
    }
  }, 1000);

  document.getElementById('moleClose').addEventListener('click', function () {
    clearInterval(moleTimer);
    clearInterval(spawnTimer);
    overlay.remove();
  });
}

document.getElementById('footerClock').addEventListener('click', eggHandleFooterClick);
