// Base64 编码按钮事件：将输入文本编码为 Base64
document.getElementById('b64EncodeBtn').addEventListener('click', () => {
  const input = document.getElementById('b64EncodeInput').value;
  const result = document.getElementById('b64EncodeResult');
  if (!input) { result.innerHTML = '<span style="color:#b85454">请输入要编码的文本</span>'; return; }
  try {
    // 先 UTF-8 编码再转 Base64
    result.textContent = btoa(unescape(encodeURIComponent(input)));
  } catch (e) {
    result.innerHTML = '<span style="color:#b85454">编码失败: ' + escapeHtml(e.message) + '</span>';
  }
});

// Base64 解码按钮事件：将 Base64 字符串解码为原文或十六进制
document.getElementById('b64DecodeBtn').addEventListener('click', () => {
  const input = document.getElementById('b64DecodeInput').value.trim();
  const result = document.getElementById('b64DecodeResult');
  const asHex = document.getElementById('b64DecodeBinary').checked;
  if (!input) { result.innerHTML = '<span style="color:#b85454">请输入 Base64 字符串</span>'; return; }
  try {
    const raw = atob(input);
    if (asHex) {
      // 输出十六进制格式
      const hex = [];
      for (let i = 0; i < raw.length; i++) hex.push(raw.charCodeAt(i).toString(16).padStart(2, '0'));
      result.textContent = hex.join(' ');
    } else {
      result.textContent = decodeURIComponent(escape(raw));
    }
  } catch (e) {
    result.innerHTML = '<span style="color:#b85454">解码失败: Base64 格式无效</span>';
  }
});

// 文件选择事件：读取文件并转为 DataURL Base64
document.getElementById('b64FileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  const info = document.getElementById('b64FileInfo');
  if (!file) { info.textContent = ''; return; }
  info.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    document.getElementById('b64EncodeInput').value = file.name + ' (' + file.type + ')';
    document.getElementById('b64EncodeResult').textContent = base64;
  };
  reader.readAsDataURL(file);
});

// 编码/解码输入框回车事件：按 Enter 快速触发对应按钮
document.getElementById('b64EncodeInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('b64EncodeBtn').click(); } });
document.getElementById('b64DecodeInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('b64DecodeBtn').click(); } });
