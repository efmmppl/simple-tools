// 主题模式键：localStorage 存 'auto' | 'light' | 'dark'，默认跟随系统
const THEME_STORAGE_KEY = 'theme';
// 三种模式循环顺序
const THEME_MODES = ['auto', 'light', 'dark'];

// getThemeMode - 读取用户选择的主题模式
function getThemeMode() {
  const m = localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_MODES.includes(m) ? m : 'auto';
}

// applyTheme - 将主题模式落地为 data-theme 并更新按钮图标
function applyTheme() {
  const mode = getThemeMode();
  const dark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (mode === 'light') { icon.className = 'fas fa-sun'; btn.title = '亮色主题（点击切换）'; }
  else if (mode === 'dark') { icon.className = 'fas fa-moon'; btn.title = '暗色主题（点击切换）'; }
  else { icon.className = 'fas fa-circle-half-stroke'; btn.title = '跟随系统（点击切换）'; }
}

// 切换按钮点击：auto → light → dark 循环
document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = THEME_MODES.indexOf(getThemeMode());
  const next = THEME_MODES[(cur + 1) % THEME_MODES.length];
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme();
});

// 系统主题变化时，自动模式下即时跟随
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

applyTheme();