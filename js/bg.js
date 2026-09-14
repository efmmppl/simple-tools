// 动画背景：localStorage 存 'off' | 'pelican' | 'ninja'，默认忍者跑（未设置时）
const BG_STORAGE_KEY = 'toolbox_bg';
const BG_ORDER = ['off', 'pelican', 'ninja'];
const BG_SCENES = { pelican: 'bg-pelican.html', ninja: 'bg-ninja.html' };
const BG_DEFAULT = 'ninja';

// getBgState - 读取并规范化背景状态（旧值 'on' 视为鹈鹕）
function getBgState() {
  const v = localStorage.getItem(BG_STORAGE_KEY);
  if (v === 'on') return 'pelican';
  return BG_ORDER.includes(v) ? v : BG_DEFAULT;
}

// applyBg - 按状态显示/隐藏背景层，设置 iframe 源与按钮状态
function applyBg() {
  const layer = document.getElementById('bgPelican');
  const state = getBgState();
  if (layer) {
    const ifr = layer.querySelector('iframe');
    if (state === 'off') {
      layer.hidden = true;
      if (ifr && ifr.getAttribute('src') !== 'about:blank') ifr.setAttribute('src', 'about:blank');
    } else {
      layer.hidden = false;
      const src = BG_SCENES[state];
      if (ifr && ifr.getAttribute('src') !== src) ifr.setAttribute('src', src);
    }
  }
  const btn = document.getElementById('bgToggle');
  if (!btn) return;
  btn.classList.toggle('active', state !== 'off');
  const icon = btn.querySelector('i');
  const titles = {
    off: '切换动画背景：鹈鹕骑车',
    pelican: '切换动画背景：忍者跑',
    ninja: '关闭动画背景'
  };
  const icons = { off: 'fa-bicycle', pelican: 'fa-bicycle', ninja: 'fa-user-ninja' };
  if (icon) icon.className = 'fas ' + icons[state];
  btn.title = titles[state];
}

// 切换按钮点击：off → pelican → ninja → off
document.getElementById('bgToggle').addEventListener('click', () => {
  const next = BG_ORDER[(BG_ORDER.indexOf(getBgState()) + 1) % BG_ORDER.length];
  localStorage.setItem(BG_STORAGE_KEY, next);
  applyBg();
});

// 纯背景模式：双击空白处全屏只显示动画背景
let zenActive = false;
let zenTempScene = null;

// enterZen - 进入纯背景模式（背景为关闭时临时显示默认忍者跑，不写入设置）
function enterZen() {
  const layer = document.getElementById('bgPelican');
  if (!layer || zenActive) return;
  if (getBgState() === 'off') {
    zenTempScene = 'ninja';
    const ifr = layer.querySelector('iframe');
    if (ifr && ifr.getAttribute('src') !== BG_SCENES[zenTempScene]) ifr.setAttribute('src', BG_SCENES[zenTempScene]);
    layer.hidden = false;
  }
  zenActive = true;
  document.body.classList.add('zen-mode');
}

// exitZen - 退出纯背景模式，恢复原设置
function exitZen() {
  if (!zenActive) return;
  zenActive = false;
  document.body.classList.remove('zen-mode');
  if (zenTempScene) {
    zenTempScene = null;
    applyBg();
  }
}

// 双击空白处（非交互元素/工具视图内）切换纯背景模式
document.addEventListener('dblclick', (e) => {
  if (e.target.closest('a, button, input, textarea, select, header, .tool-view, .nav-card, .nav-category, .nav-tools-bar, .recent-tools')) return;
  if (zenActive) exitZen(); else enterZen();
});

// Esc 退出纯背景模式
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && zenActive) exitZen();
});

// 右上角退出按钮
const zenExitBtn = document.getElementById('zenExit');
if (zenExitBtn) zenExitBtn.addEventListener('click', exitZen);

applyBg();
