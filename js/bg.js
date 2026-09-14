// 动画背景开关键：localStorage 存 'on' | 'off'，默认关闭（原始纯色背景）
const BG_STORAGE_KEY = 'toolbox_bg';

// isBgOn - 读取动画背景开关状态
function isBgOn() {
  return localStorage.getItem(BG_STORAGE_KEY) === 'on';
}

// applyBg - 按状态显示/隐藏动画背景层并更新按钮标题
function applyBg() {
  const layer = document.getElementById('bgPelican');
  if (!layer) return;
  const on = isBgOn();
  layer.hidden = !on;
  const btn = document.getElementById('bgToggle');
  if (!btn) return;
  btn.classList.toggle('active', on);
  btn.title = on ? '动画背景已开启（点击切换）' : '切换动画背景';
}

// 切换按钮点击：on ↔ off
document.getElementById('bgToggle').addEventListener('click', () => {
  localStorage.setItem(BG_STORAGE_KEY, isBgOn() ? 'off' : 'on');
  applyBg();
});

applyBg();
