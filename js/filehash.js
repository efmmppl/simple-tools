// md5 - 计算 Uint8Array 的 MD5 摘要（RFC 1321 自实现），返回 32 位小写十六进制
// Web Crypto 不支持 MD5，故在此内联实现
function md5(data) {
  var s1 = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22];
  var s2 = [5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20];
  var s3 = [4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23];
  var s4 = [6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  var K = new Array(64);
  for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) & 0xffffffff;

  var origLen = data.length;
  var bitLen = origLen * 8;
  var paddedLen = ((((origLen + 8) >> 6) + 1) << 6);
  var padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[origLen] = 0x80;
  var dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 8, bitLen >>> 0, true);
  dv.setUint32(paddedLen - 4, Math.floor(bitLen / 4294967296), true);

  var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (var off = 0; off < paddedLen; off += 64) {
    var x = new Uint32Array(16);
    for (var j = 0; j < 16; j++) x[j] = dv.getUint32(off + j * 4, true);
    var a = a0, b = b0, c = c0, d = d0;
    for (var k = 0; k < 64; k++) {
      var f, g, s;
      if (k < 16) { f = (b & c) | (~b & d); g = k; s = s1[k]; }
      else if (k < 32) { f = (d & b) | (~d & c); g = (5 * k + 1) % 16; s = s2[k - 16]; }
      else if (k < 48) { f = b ^ c ^ d; g = (3 * k + 5) % 16; s = s3[k - 32]; }
      else { f = c ^ (b | ~d); g = (7 * k) % 16; s = s4[k - 48]; }
      f = (f + a + K[k] + x[g]) >>> 0;
      a = d; d = c; c = b;
      b = (b + (((f << s) | (f >>> (32 - s))) >>> 0)) >>> 0;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  var out = '';
  var words = [a0, b0, c0, d0];
  for (var wi = 0; wi < 4; wi++) {
    for (var bi = 0; bi < 4; bi++) out += ((words[wi] >>> (bi * 8)) & 0xff).toString(16).padStart(2, '0');
  }
  return out;
}

// formatSize - 人类可读的文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

// computeFileHashes - 计算文件的 MD5 与 SHA-256 摘要
function computeFileHashes(file) {
  return file.arrayBuffer().then(function (buf) {
    var bytes = new Uint8Array(buf);
    var md5Hex = md5(bytes);
    return crypto.subtle.digest('SHA-256', buf).then(function (digest) {
      var shaHex = '';
      new Uint8Array(digest).forEach(function (b) { shaHex += b.toString(16).padStart(2, '0'); });
      return { name: file.name, size: file.size, md5: md5Hex, sha256: shaHex };
    });
  });
}

// 文件校验状态
var fhState = { a: null, b: null };

// handleFileChange - 选择或拖拽文件后计算摘要并更新界面
function handleFileChange(slot, file) {
  if (!file) return;
  var metaId = slot === 'a' ? 'fhMetaA' : 'fhMetaB';
  var metaEl = document.getElementById(metaId);
  metaEl.innerHTML = '<i class="fas fa-spinner fa-pulse" style="margin-right:4px;color:var(--primary)"></i>' + escapeHtml(file.name) + ' 计算中...';
  computeFileHashes(file).then(function (r) {
    fhState[slot] = r;
    renderFileHash(metaEl, r);
    renderComparison();
  }).catch(function () {
    metaEl.innerHTML = '<span style="color:var(--up)">计算失败，请重试</span>';
  });
}

// renderFileHash - 渲染单个文件的摘要
function renderFileHash(metaEl, r) {
  metaEl.innerHTML = '<div class="filehash-cards">' +
    '<div class="filehash-row"><span class="filehash-row-label">文件</span><span class="filehash-row-value filehash-name">' + escapeHtml(r.name) + '</span></div>' +
    '<div class="filehash-row"><span class="filehash-row-label">大小</span><span class="filehash-row-value">' + formatSize(r.size) + '</span></div>' +
    '<div class="filehash-row"><span class="filehash-row-label">MD5</span><span class="filehash-row-value filehash-hash">' + r.md5 + '</span></div>' +
    '<div class="filehash-row"><span class="filehash-row-label">SHA-256</span><span class="filehash-row-value filehash-hash">' + r.sha256 + '</span></div>' +
    '</div>';
}

// renderComparison - 两个文件都就绪时输出比对结论
function renderComparison() {
  var resultEl = document.getElementById('fhResult');
  if (!fhState.a && !fhState.b) {
    resultEl.innerHTML = '<div class="empty-state"><i class="fas fa-fingerprint" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>选择两个文件后自动计算摘要并比对</div>';
    return;
  }
  if (!fhState.a || !fhState.b) return;
  var a = fhState.a, b = fhState.b;
  var same = a.md5 === b.md5 && a.sha256 === b.sha256;
  resultEl.innerHTML = '<div class="filehash-verdict ' + (same ? 'filehash-match' : 'filehash-mismatch') + '">' +
    '<i class="fas ' + (same ? 'fa-check-circle' : 'fa-times-circle') + '" style="margin-right:6px"></i>' +
    (same ? '两个文件完全一致' : '两个文件不一致') +
    '</div>';
}

// 拖拽事件绑定
function bindDrop(zoneId, slot) {
  var zone = document.getElementById(zoneId);
  ['dragenter', 'dragover'].forEach(function (ev) {
    zone.addEventListener(ev, function (e) {
      e.preventDefault();
      zone.classList.add('filehash-drop-active');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    zone.addEventListener(ev, function (e) {
      e.preventDefault();
      zone.classList.remove('filehash-drop-active');
    });
  });
  zone.addEventListener('drop', function (e) {
    var file = e.dataTransfer.files[0];
    if (file) handleFileChange(slot, file);
  });
}

document.getElementById('fhFileA').addEventListener('change', function (e) {
  handleFileChange('a', e.target.files[0]);
  e.target.value = '';
});
document.getElementById('fhFileB').addEventListener('change', function (e) {
  handleFileChange('b', e.target.files[0]);
  e.target.value = '';
});
bindDrop('fhDropA', 'a');
bindDrop('fhDropB', 'b');
