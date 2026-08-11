// convert - 格式转换：图片互转（PNG/JPG/WebP）与音频转 WAV，全部在浏览器本地完成
var cvState = { file: null, kind: null, url: null, width: 0, height: 0 };

var CV_IMAGE_FORMATS = [
  { value: 'image/png', label: 'PNG（无损）', ext: 'png' },
  { value: 'image/jpeg', label: 'JPG（有损）', ext: 'jpg' },
  { value: 'image/webp', label: 'WebP', ext: 'webp' }
];
var CV_AUDIO_FORMATS = [
  { value: 'audio/wav', label: 'WAV（无损 PCM）', ext: 'wav' }
];

// cvPick - 选择或拖入文件，识别类型并给出目标格式选项
function cvPick(file) {
  if (!file) return;
  var type = file.type || '';
  var kind = null;
  if (type.indexOf('image/') === 0) kind = 'image';
  else if (type.indexOf('audio/') === 0) kind = 'audio';
  else if (/\.(mp3|m4a|aac|ogg|oga|wav|flac|weba)$/i.test(file.name)) kind = 'audio';
  if (!kind) {
    alert('暂不支持该文件类型，请选择图片或音频文件');
    return;
  }
  cvState.file = file;
  cvState.kind = kind;
  document.getElementById('cvDrop').style.display = 'none';
  document.getElementById('cvMeta').style.display = 'block';
  document.getElementById('cvOptions').style.display = 'block';

  var fmtEl = document.getElementById('cvFormat');
  fmtEl.innerHTML = '';
  var formats = kind === 'image' ? CV_IMAGE_FORMATS : CV_AUDIO_FORMATS;
  var currentMime = (kind === 'image' && type === 'image/jpg') ? 'image/jpeg' : type;
  formats.forEach(function (f) {
    if (f.value === currentMime) return;
    var opt = document.createElement('option');
    opt.value = f.value;
    opt.textContent = f.label;
    fmtEl.appendChild(opt);
  });

  var qualityRow = document.getElementById('cvQualityRow');
  if (kind === 'image' && fmtEl.value === 'image/jpeg') {
    qualityRow.style.display = 'flex';
  } else {
    qualityRow.style.display = 'none';
  }

  if (kind === 'image') {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      cvState.width = img.naturalWidth;
      cvState.height = img.naturalHeight;
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  document.getElementById('cvMeta').innerHTML =
    '<div class="filehash-cards"><div class="filehash-row"><span class="filehash-row-label">文件</span>' +
    '<span class="filehash-row-value filehash-name">' + escapeHtml(file.name) + '</span></div>' +
    '<div class="filehash-row"><span class="filehash-row-label">类型</span>' +
    '<span class="filehash-row-value">' + (kind === 'image' ? '图片' : '音频') + '</span></div>' +
    '<div class="filehash-row"><span class="filehash-row-label">大小</span>' +
    '<span class="filehash-row-value">' + formatSize(file.size) + '</span></div></div>';
  document.getElementById('cvResult').innerHTML =
    '<div class="empty-state"><i class="fas fa-file-import" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>选择目标格式后点击转换</div>';
}

// cvConvert - 执行转换并渲染结果
function cvConvert() {
  if (!cvState.file) return;
  if (cvState.kind === 'image') {
    cvConvertImage();
  } else {
    cvConvertAudio();
  }
}

// cvConvertImage - 图片通过 canvas 重编码
function cvConvertImage() {
  var mime = document.getElementById('cvFormat').value;
  var quality = parseInt(document.getElementById('cvQuality').value, 10) / 100;
  var btn = document.getElementById('cvConvertBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 转换中...';
  var img = new Image();
  var url = URL.createObjectURL(cvState.file);
  img.onload = function () {
    var canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    var ctx = canvas.getContext('2d');
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(function (blob) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-exchange-alt"></i> 转换';
      if (!blob) {
        alert('转换失败，请重试');
        return;
      }
      cvRenderResult(blob, mime);
    }, mime, quality);
  };
  img.onerror = function () {
    URL.revokeObjectURL(url);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-exchange-alt"></i> 转换';
    alert('无法读取图片文件');
  };
  img.src = url;
}

// cvConvertAudio - 音频解码后编码为 WAV（PCM 16bit）
function cvConvertAudio() {
  var btn = document.getElementById('cvConvertBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 转换中...';
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-exchange-alt"></i> 转换';
    alert('当前浏览器不支持音频解码，请更换浏览器');
    return;
  }
  var ctx = new AudioCtx();
  cvState.file.arrayBuffer().then(function (buf) {
    return ctx.decodeAudioData(buf);
  }).then(function (audioBuffer) {
    var wavBlob = audioToWav(audioBuffer);
    ctx.close();
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-exchange-alt"></i> 转换';
    cvRenderResult(wavBlob, 'audio/wav');
  }).catch(function () {
    ctx.close();
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-exchange-alt"></i> 转换';
    alert('音频解码失败，可能是不受支持的编码格式');
  });
}

// audioToWav - AudioBuffer 编码为 WAV（RIFF/PCM 16bit 单声道混音）
function audioToWav(buffer) {
  var numChannels = 1;
  var sampleRate = buffer.sampleRate;
  var numFrames = buffer.length;
  var samples = new Float32Array(numFrames);
  for (var ch = 0; ch < buffer.numberOfChannels; ch++) {
    var chan = buffer.getChannelData(ch);
    for (var i = 0; i < numFrames; i++) samples[i] += chan[i] / buffer.numberOfChannels;
  }
  var dataSize = numFrames * 2;
  var arrayBuffer = new ArrayBuffer(44 + dataSize);
  var view = new DataView(arrayBuffer);
  function writeStr(offset, str) {
    for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  var offset = 44;
  for (var i = 0; i < numFrames; i++) {
    var s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// cvRenderResult - 渲染转换结果与下载入口
function cvRenderResult(blob, mime) {
  var ext = mime === 'image/jpeg' ? 'jpg' : (mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : 'wav'));
  var outUrl = URL.createObjectURL(blob);
  var oldSize = cvState.file.size;
  var newSize = blob.size;
  var isImage = cvState.kind === 'image';
  var resultEl = document.getElementById('cvResult');
  resultEl.innerHTML =
    '<div class="imgtool-card">' +
    '<div class="imgtool-compare">' +
    '<div class="imgtool-stat"><span class="imgtool-stat-label">转换前</span><span class="imgtool-stat-val" style="color:var(--up)">' + formatSize(oldSize) + '</span></div>' +
    '<div class="imgtool-arrow"><i class="fas fa-arrow-right"></i></div>' +
    '<div class="imgtool-stat"><span class="imgtool-stat-label">转换后</span><span class="imgtool-stat-val" style="color:var(--down)">' + formatSize(newSize) + '</span></div>' +
    (isImage ? '<div class="imgtool-arrow"><i class="fas fa-arrow-down"></i></div><div class="imgtool-stat"><span class="imgtool-stat-label">尺寸</span><span class="imgtool-stat-val">' + cvState.width + '×' + cvState.height + '</span></div>' : '') +
    '</div>' +
    (isImage ? '<div class="imgtool-preview"><img src="' + outUrl + '" alt="转换预览"></div>' : '') +
    '<div class="ts-row">' +
    '<a class="btn btn-primary" download="' + cvState.file.name.replace(/\.[^.]+$/, '') + '-converted.' + ext + '" href="' + outUrl + '"><i class="fas fa-download"></i> 下载 ' + ext.toUpperCase() + '</a>' +
    '<button class="btn btn-outline" id="cvRedoBtn"><i class="fas fa-sync-alt"></i> 再转一次</button>' +
    '</div>' +
    '</div>';
  document.getElementById('cvRedoBtn').addEventListener('click', function () {
    cvConvert();
  });
}

// cvReset - 清除当前文件，回到初始状态
function cvReset() {
  cvState = { file: null, kind: null, url: null, width: 0, height: 0 };
  document.getElementById('cvDrop').style.display = 'block';
  document.getElementById('cvMeta').style.display = 'none';
  document.getElementById('cvMeta').innerHTML = '';
  document.getElementById('cvOptions').style.display = 'none';
  document.getElementById('cvResult').innerHTML =
    '<div class="empty-state"><i class="fas fa-file-import" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>选择文件后选择目标格式并转换</div>';
}

var cvDropEl = document.getElementById('cvDrop');
cvDropEl.addEventListener('click', function () {
  document.getElementById('cvFile').click();
});
document.getElementById('cvFile').addEventListener('change', function (e) {
  cvPick(e.target.files[0]);
  e.target.value = '';
});
['dragenter', 'dragover'].forEach(function (ev) {
  cvDropEl.addEventListener(ev, function (e) {
    e.preventDefault();
    cvDropEl.classList.add('filehash-drop-active');
  });
});
['dragleave', 'drop'].forEach(function (ev) {
  cvDropEl.addEventListener(ev, function (e) {
    e.preventDefault();
    cvDropEl.classList.remove('filehash-drop-active');
  });
});
cvDropEl.addEventListener('drop', function (e) {
  cvPick(e.dataTransfer.files[0]);
});
document.getElementById('cvFormat').addEventListener('change', function () {
  var qualityRow = document.getElementById('cvQualityRow');
  qualityRow.style.display = this.value === 'image/jpeg' ? 'flex' : 'none';
});
document.getElementById('cvQuality').addEventListener('input', function () {
  document.getElementById('cvQualityVal').textContent = this.value + '%';
});
document.getElementById('cvConvertBtn').addEventListener('click', function () {
  cvConvert();
});
document.getElementById('cvResetBtn').addEventListener('click', function () {
  cvReset();
});
