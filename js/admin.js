const ADMIN_STORAGE_KEY = 'toolbox_admin_auth';
const ADMIN_EXPIRY = 2 * 60 * 60 * 1000;
const ADMIN_PASSWORD_HASH = 'a8220b56e46a8e760371eb99df89fd9be38eb226933e4f6f88aa7bad68cc58b1';

function getAdminAuth() {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.expires || Date.now() > parsed.expires) {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

async function adminLogin() {
  const pwdInput = document.getElementById('adminPwd');
  const errBox = document.getElementById('adminLoginErr');
  if (!window.crypto || !crypto.subtle) {
    errBox.textContent = '当前环境不支持安全加密，请通过 https 或 localhost 访问';
    errBox.style.display = 'block';
    return;
  }
  const hash = await sha256(pwdInput.value.trim());
  if (hash === ADMIN_PASSWORD_HASH) {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ expires: Date.now() + ADMIN_EXPIRY, at: Date.now() }));
    errBox.style.display = 'none';
    pwdInput.value = '';
    showAdminPanel();
  } else {
    errBox.style.display = 'block';
  }
}

function adminLogout() {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  showAdminLogin();
}

function showAdminLogin() {
  document.getElementById('adminLoginCard').style.display = 'block';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('adminPwd').value = '';
  document.getElementById('adminLoginErr').style.display = 'none';
}

function showAdminPanel() {
  document.getElementById('adminLoginCard').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  adminLoadStats();
}

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function adminLoadStats() {
  const timeEl = document.getElementById('adminCacheTime');
  const biliEl = document.getElementById('adminBiliCount');
  const tiebaEl = document.getElementById('adminTiebaCount');
  fetch('hotlist.json?_=' + Date.now())
    .then(function (res) { return res.json(); })
    .then(function (data) {
      timeEl.textContent = data.updated ? data.updated.replace('T', ' ').slice(0, 16) : '-';
      biliEl.textContent = data.data && data.data.biliHot ? data.data.biliHot.length : 0;
      tiebaEl.textContent = data.data && data.data.tieba ? data.data.tieba.length : 0;
    })
    .catch(function () {
      timeEl.textContent = '读取失败';
      biliEl.textContent = '-';
      tiebaEl.textContent = '-';
    });
}

function adminInit() {
  document.getElementById('adminToggle').addEventListener('click', function () {
    if (getAdminAuth()) {
      showTool('admin');
    } else {
      showTool('admin');
      showAdminLogin();
    }
  });
  document.getElementById('adminLoginBtn').addEventListener('click', adminLogin);
  document.getElementById('adminPwd').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') adminLogin();
  });
  document.getElementById('adminLogout').addEventListener('click', adminLogout);
  document.getElementById('adminRefreshBtn').addEventListener('click', adminLoadStats);
}

document.addEventListener('DOMContentLoaded', adminInit);
