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
    layer.hidden = state === 'off';
    if (state !== 'off') {
      const ifr = layer.querySelector('iframe');
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

applyBg();
