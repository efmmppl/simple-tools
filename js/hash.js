// hash - 文本摘要计算：MD5（复用 filehash.js 的全局 md5）与 SHA-1/256/384/512（Web Crypto）
// 注意：本文件依赖 js/filehash.js 先加载（提供全局 md5 函数）

var HASH_ALGOS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

function hashBytesToHex(buf) {
  return Array.prototype.map.call(new Uint8Array(buf), function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

function shaHex(algo, data) {
  return crypto.subtle.digest(algo, data).then(hashBytesToHex);
}

function hashComputeAll() {
  var input = document.getElementById('hashInput').value;
  var box = document.getElementById('hashResult');
  if (!input) {
    box.innerHTML = '<div class="empty-state"><i class="fas fa-hashtag" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>请输入要计算摘要的文本</div>';
    return;
  }
  if (!window.crypto || !crypto.subtle) {
    box.innerHTML = '<div class="error-msg"><i class="fas fa-exclamation-circle"></i> 当前环境不支持 Web Crypto，请通过 https 或 localhost 访问</div>';
    return;
  }
  var data = new TextEncoder().encode(input);
  box.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--primary)"></i>计算中...</div>';
  var jobs = [];
  HASH_ALGOS.forEach(function (algo) {
    if (algo === 'MD5') {
      jobs.push(Promise.resolve(md5(data)));
    } else {
      jobs.push(shaHex(algo, data));
    }
  });
  Promise.all(jobs).then(function (results) {
    var html = '';
    HASH_ALGOS.forEach(function (algo, i) {
      html += '<div class="ts-card" style="margin-bottom:10px">'
        + '<div class="ts-card-title"><i class="fas fa-key" style="margin-right:6px"></i> ' + algo
        + ' <button class="btn btn-outline btn-sm ts-copy" data-target="hashVal' + i + '" style="float:right"><i class="far fa-copy"></i> 复制</button></div>'
        + '<div class="hash-value" id="hashVal' + i + '" style="font-family:\'SF Mono\',\'Fira Code\',Consolas,monospace;word-break:break-all;font-size:0.82rem;color:var(--text)">' + results[i] + '</div>'
        + '</div>';
    });
    box.innerHTML = html;
    box.querySelectorAll('.ts-copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.dataset.target);
        var text = target.textContent;
        navigator.clipboard.writeText(text).then(function () {
          var icon = btn.querySelector('i');
          icon.className = 'fas fa-check';
          setTimeout(function () { icon.className = 'fas fa-copy'; }, 1500);
        });
      });
    });
  });
}

function hashClearInput() {
  document.getElementById('hashInput').value = '';
  document.getElementById('hashResult').innerHTML = '<div class="empty-state"><i class="fas fa-hashtag" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>输入文本后点击计算，输出 MD5 与 SHA 系列摘要</div>';
}

document.getElementById('hashCalcBtn').addEventListener('click', hashComputeAll);
document.getElementById('hashClearBtn').addEventListener('click', hashClearInput);
