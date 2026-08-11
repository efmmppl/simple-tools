// imgtool - 图片压缩：调整宽高与质量，输出压缩前后大小对比
var imgToolState = { file: null, srcUrl: null, origSize: 0, origName: '', width: 0, height: 0, ratio: 1 };

// imgToolLoadImage - 读取文件为 Image 对象
function imgToolLoadImage(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { resolve({ img: img, url: url }); };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('无法读取图片')); };
    img.src = url;
  });
}

// imgToolPick - 选择或拖入文件后展示预览与参数区
function imgToolPick(file) {
  if (!file) return;
  if (file.type.indexOf('image/') !== 0) {
    alert('请选择图片文件');
    return;
  }
  imgToolLoadImage(file).then(function (r) {
    imgToolState.file = file;
    imgToolState.srcUrl = r.url;
    imgToolState.origSize = file.size;
    imgToolState.origName = file.name;
    imgToolState.width = r.img.naturalWidth;
    imgToolState.height = r.img.naturalHeight;
    imgToolState.ratio = r.img.naturalWidth / r.img.naturalHeight;
    document.getElementById('imgDrop').style.display = 'none';
    document.getElementById('imgMeta').style.display = 'block';
    document.getElementById('imgOptions').style.display = 'block';
    document.getElementById('imgMeta').innerHTML =
      '<div class="filehash-cards"><div class="filehash-row"><span class="filehash-row-label">文件</span>' +
      '<span class="filehash-row-value filehash-name">' + escapeHtml(file.name) + '</span></div>' +
      '<div class="filehash-row"><span class="filehash-row-label">原始尺寸</span>' +
      '<span class="filehash-row-value">' + r.img.naturalWidth + ' × ' + r.img.naturalHeight + '</span></div>' +
      '<div class="filehash-row"><span class="filehash-row-label">原始大小</span>' +
      '<span class="filehash-row-value">' + formatSize(file.size) + '</span></div></div>';
    document.getElementById('imgWidth').value = '';
    document.getElementById('imgWidth').placeholder = '保持原宽 ' + r.img.naturalWidth;
    document.getElementById('imgHeight').value = '';
    document.getElementById('imgHeight').placeholder = '保持原高 ' + r.img.naturalHeight;
    document.getElementById('imgResult').innerHTML =
      '<div class="empty-state"><i class="fas fa-image" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>调整参数后点击压缩，查看压缩前后大小</div>';
  }).catch(function (err) {
    alert(err.message);
  });
}

// imgToolCompress - 按当前参数压缩图片并显示结果
function imgToolCompress() {
  if (!imgToolState.file) return;
  var quality = parseInt(document.getElementById('imgQuality').value, 10) / 100;
  var widthInput = parseInt(document.getElementById('imgWidth').value, 10);
  var heightInput = parseInt(document.getElementById('imgHeight').value, 10);
  var targetWidth = widthInput && widthInput >= 16 ? widthInput : imgToolState.width;
  var targetHeight = heightInput && heightInput >= 16 ? heightInput : imgToolState.height;

  var canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  var url = imgToolState.srcUrl;
  var img = new Image();
  img.onload = function () {
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    var mime = imgToolState.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    canvas.toBlob(function (blob) {
      if (!blob) {
        alert('压缩失败，请重试');
        return;
      }
      imgToolRenderResult(blob);
    }, mime, quality);
  };
  img.src = url;
}

// imgToolSyncRatio - 勾选保持纵横比时，根据另一侧输入联动更新
function imgToolSyncRatio(changed) {
  if (!imgToolState.file || !document.getElementById('imgLockRatio').checked) return;
  var widthInput = parseInt(document.getElementById('imgWidth').value, 10);
  var heightInput = parseInt(document.getElementById('imgHeight').value, 10);
  if (changed === 'width' && widthInput && widthInput >= 16) {
    document.getElementById('imgHeight').value = Math.max(1, Math.round(widthInput / imgToolState.ratio));
  } else if (changed === 'height' && heightInput && heightInput >= 16) {
    document.getElementById('imgWidth').value = Math.max(1, Math.round(heightInput * imgToolState.ratio));
  }
}

// imgToolRenderResult - 渲染压缩前后对比与下载入口
function imgToolRenderResult(blob) {
  var oldSize = imgToolState.origSize;
  var newSize = blob.size;
  var ratio = oldSize > 0 ? Math.round((1 - newSize / oldSize) * 100) : 0;
  var outUrl = URL.createObjectURL(blob);
  var resultEl = document.getElementById('imgResult');
  resultEl.innerHTML =
    '<div class="imgtool-card">' +
    '<div class="imgtool-compare">' +
    '<div class="imgtool-stat"><span class="imgtool-stat-label">压缩前</span><span class="imgtool-stat-val" style="color:var(--up)">' + formatSize(oldSize) + '</span></div>' +
    '<div class="imgtool-arrow"><i class="fas fa-arrow-right"></i></div>' +
    '<div class="imgtool-stat"><span class="imgtool-stat-label">压缩后</span><span class="imgtool-stat-val" style="color:var(--down)">' + formatSize(newSize) + '</span></div>' +
    '<div class="imgtool-arrow"><i class="fas fa-arrow-down"></i></div>' +
    '<div class="imgtool-stat"><span class="imgtool-stat-label">缩减</span><span class="imgtool-stat-val">' + ratio + '%</span></div>' +
    '</div>' +
    '<div class="imgtool-preview"><img src="' + outUrl + '" alt="压缩后预览"></div>' +
    '<div class="ts-row">' +
    '<a class="btn btn-primary" id="imgDownloadBtn" download="' + imgToolState.origName.replace(/\.[^.]+$/, '') + '-compressed.jpg" href="' + outUrl + '"><i class="fas fa-download"></i> 下载图片</a>' +
    '<button class="btn btn-outline" id="imgRedoBtn"><i class="fas fa-sync-alt"></i> 重新压缩</button>' +
    '</div>' +
    '</div>';
  document.getElementById('imgRedoBtn').addEventListener('click', function () {
    imgToolCompress();
  });
}

// imgToolReset - 清除当前图片，回到初始状态
function imgToolReset() {
  imgToolState = { file: null, srcUrl: null, origSize: 0, origName: '' };
  document.getElementById('imgDrop').style.display = 'block';
  document.getElementById('imgMeta').style.display = 'none';
  document.getElementById('imgMeta').innerHTML = '';
  document.getElementById('imgOptions').style.display = 'none';
  document.getElementById('imgResult').innerHTML =
    '<div class="empty-state"><i class="fas fa-image" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>选择图片后调整参数并压缩，查看压缩前后大小</div>';
}

var imgDropEl = document.getElementById('imgDrop');
imgDropEl.addEventListener('click', function () {
  document.getElementById('imgInput').click();
});
document.getElementById('imgInput').addEventListener('change', function (e) {
  imgToolPick(e.target.files[0]);
  e.target.value = '';
});
['dragenter', 'dragover'].forEach(function (ev) {
  imgDropEl.addEventListener(ev, function (e) {
    e.preventDefault();
    imgDropEl.classList.add('filehash-drop-active');
  });
});
['dragleave', 'drop'].forEach(function (ev) {
  imgDropEl.addEventListener(ev, function (e) {
    e.preventDefault();
    imgDropEl.classList.remove('filehash-drop-active');
  });
});
imgDropEl.addEventListener('drop', function (e) {
  imgToolPick(e.dataTransfer.files[0]);
});
document.getElementById('imgQuality').addEventListener('input', function () {
  document.getElementById('imgQualityVal').textContent = this.value + '%';
});
document.getElementById('imgWidth').addEventListener('input', function () {
  imgToolSyncRatio('width');
});
document.getElementById('imgHeight').addEventListener('input', function () {
  imgToolSyncRatio('height');
});
document.getElementById('imgCompressBtn').addEventListener('click', function () {
  imgToolCompress();
});
document.getElementById('imgResetBtn').addEventListener('click', function () {
  imgToolReset();
});
