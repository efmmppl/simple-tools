// asciiart — ASCII 文字艺术：文字转大字字符画、图片转字符画
var ASCII_FONT = {
  'A': ['.XX.', 'X..X', 'X..X', 'XXXX', 'X..X', 'X..X', 'X..X'],
  'B': ['XXX.', 'X..X', 'X..X', 'XXX.', 'X..X', 'X..X', 'XXX.'],
  'C': ['.XX.', 'X..X', 'X...', 'X...', 'X...', 'X..X', '.XX.'],
  'D': ['XXX.', 'X..X', 'X..X', 'X..X', 'X..X', 'X..X', 'XXX.'],
  'E': ['XXXX', 'X...', 'X...', 'XXX.', 'X...', 'X...', 'XXXX'],
  'F': ['XXXX', 'X...', 'X...', 'XXX.', 'X...', 'X...', 'X...'],
  'G': ['.XX.', 'X..X', 'X...', 'X.XX', 'X..X', 'X..X', '.XXX'],
  'H': ['X..X', 'X..X', 'X..X', 'XXXX', 'X..X', 'X..X', 'X..X'],
  'I': ['XXX.', '.X..', '.X..', '.X..', '.X..', '.X..', 'XXX.'],
  'J': ['..X.', '..X.', '..X.', '..X.', '..X.', 'X.X.', '.X..'],
  'K': ['X..X', 'X.X.', 'XX..', 'X...', 'XX..', 'X.X.', 'X..X'],
  'L': ['X...', 'X...', 'X...', 'X...', 'X...', 'X...', 'XXXX'],
  'M': ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
  'N': ['XX..', 'X.X.', 'X.X.', 'X..X', 'X..X', 'X..X', 'X..X'],
  'O': ['.XX.', 'X..X', 'X..X', 'X..X', 'X..X', 'X..X', '.XX.'],
  'P': ['XXX.', 'X..X', 'X..X', 'XXX.', 'X...', 'X...', 'X...'],
  'Q': ['.XX.', 'X..X', 'X..X', 'X..X', 'X..X', 'X.X.', '.XX.'],
  'R': ['XXX.', 'X..X', 'X..X', 'XXX.', 'XX..', 'X.X.', 'X..X'],
  'S': ['.XXX', 'X...', 'X...', '.XX.', '...X', '...X', 'XXX.'],
  'T': ['XXXX', '.X..', '.X..', '.X..', '.X..', '.X..', '.X..'],
  'U': ['X..X', 'X..X', 'X..X', 'X..X', 'X..X', 'X..X', '.XX.'],
  'V': ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '..X..'],
  'W': ['X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X'],
  'X': ['X...X', 'X...X', '.X.X.', '..X..', '.X.X.', 'X...X', 'X...X'],
  'Y': ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'],
  'Z': ['XXXX', '...X', '..X.', '.X..', 'X...', 'X...', 'XXXX'],
  '0': ['.XX.', 'X..X', 'X..X', 'X..X', 'X..X', 'X..X', '.XX.'],
  '1': ['..X.', '.XX.', '..X.', '..X.', '..X.', '..X.', '.XXX'],
  '2': ['.XX.', 'X..X', '...X', '..X.', '.X..', 'X...', 'XXXX'],
  '3': ['XXX.', '...X', '...X', '.XX.', '...X', '...X', 'XXX.'],
  '4': ['..X.', '.XX.', 'X.X.', 'X.X.', 'XXXX', '..X.', '..X.'],
  '5': ['XXXX', 'X...', 'XXX.', '...X', '...X', 'X..X', '.XX.'],
  '6': ['.XX.', 'X...', 'X...', 'XXX.', 'X..X', 'X..X', '.XX.'],
  '7': ['XXXX', '...X', '..X.', '..X.', '.X..', '.X..', '.X..'],
  '8': ['.XX.', 'X..X', 'X..X', '.XX.', 'X..X', 'X..X', '.XX.'],
  '9': ['.XX.', 'X..X', 'X..X', '.XXX', '...X', '...X', '.XX.'],
  ' ': ['    ', '    ', '    ', '    ', '    ', '    ', '    '],
  '.': ['....', '....', '....', '....', '....', '..X.', '..X.'],
  ',': ['....', '....', '....', '....', '....', '..X.', '.X..'],
  '!': ['..X.', '..X.', '..X.', '..X.', '..X.', '....', '..X.'],
  '?': ['.XX.', 'X..X', '...X', '..X.', '..X.', '....', '..X.'],
  '-': ['....', '....', '....', 'XXXX', '....', '....', '....'],
  ':': ['....', '..X.', '..X.', '....', '..X.', '..X.', '....'],
  ';': ['....', '..X.', '..X.', '....', '..X.', '..X.', '.X..'],
  '_': ['....', '....', '....', '....', '....', '....', 'XXXX'],
  '(': ['.X..', 'XX..', 'X...', 'X...', 'X...', 'XX..', '.X..'],
  ')': ['..X.', '..XX', '...X', '...X', '...X', '..XX', '..X.'],
  '/': ['...X', '...X', '..X.', '..X.', '.X..', '.X..', 'X...'],
  '+': ['....', '..X.', '..X.', 'XXXX', '..X.', '..X.', '....'],
  '=': ['....', '....', 'XXXX', '....', 'XXXX', '....', '....'],
  '*': ['....', 'X..X', '.XX.', 'XXXX', '.XX.', 'X..X', '....'],
  '#': ['X.X.', 'XXXX', 'X.X.', 'X.X.', 'XXXX', 'X.X.', 'X.X.'],
  '\'': ['..X.', '..X.', '....', '....', '....', '....', '....'],
  '"': ['X.X.', 'X.X.', '....', '....', '....', '....', '....'],
  '@': ['.XX.', 'X..X', 'X.XX', 'X.XX', 'X.XX', 'X..X', '.XX.'],
  '&': ['.X..', 'X.X.', 'X.X.', '.X..', 'X.XX', 'X..X', '.XX.'],
  '$': ['.XX.', 'X.X.', 'XX..', '.XX.', '..XX', 'X.X.', 'XX..'],
  '%': ['X..X', 'X..X', '..X.', '.X..', 'X...', 'X..X', 'X..X'],
  '<': ['...X', '..X.', '.X..', 'X...', '.X..', '..X.', '...X'],
  '>': ['X...', '.X..', '..X.', '...X', '..X.', '.X..', 'X...'],
  '[': ['.XX.', '.X..', '.X..', '.X..', '.X..', '.X..', '.XX.'],
  ']': ['.XX.', '..X.', '..X.', '..X.', '..X.', '..X.', '.XX.'],
  '{': ['...X', '..X.', '..X.', '.X..', '..X.', '..X.', '...X'],
  '}': ['X...', '.X..', '.X..', '..X.', '.X..', '.X..', 'X...'],
  '|': ['..X.', '..X.', '..X.', '..X.', '..X.', '..X.', '..X.']
};

var ASCII_RAMPS = {
  dense: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^\'. ",
  normal: '@%#*+=-:. ',
  coarse: '@#%= '
};

var ASCII_IMG_STATE = { img: null, url: null, name: '', width: 0, height: 0, outUrl: null };

function asciiArtRenderGlyph(g, style) {
  var out = [];
  for (var r = 0; r < 7; r++) {
    var row = g[r];
    var s = '';
    for (var c = 0; c < row.length; c++) {
      if (row[c] !== 'X') { s += ' '; continue; }
      if (style === 'solid') { s += '\u2588'; continue; }
      var edge = false;
      var around = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
      for (var k = 0; k < 4; k++) {
        var nr = around[k][0];
        var nc = around[k][1];
        if (nr < 0 || nr > 6 || nc < 0 || nc >= g[nr].length || g[nr][nc] !== 'X') { edge = true; break; }
      }
      s += edge ? '\u2588' : ' ';
    }
    out.push(s);
  }
  return out;
}

function asciiArtFallbackGlyph(ch) {
  var rows = [' ', ' ', ' ', ' ', ' ', ' ', ' '];
  rows[3] = ch;
  return rows;
}

function asciiArtText() {
  var text = document.getElementById('asciiTextInput').value;
  var style = document.getElementById('asciiFontStyle').value;
  var up = text.toUpperCase();
  var rows = ['', '', '', '', '', '', ''];
  for (var i = 0; i < up.length; i++) {
    var g = ASCII_FONT[up[i]] || asciiArtFallbackGlyph(up[i]);
    var rendered = asciiArtRenderGlyph(g, style);
    for (var r = 0; r < 7; r++) {
      rows[r] += rendered[r] + ' ';
    }
  }
  var out = rows.map(function (row) { return row.replace(/\s+$/, ''); }).join('\n');
  document.getElementById('asciiTextResult').textContent = out;
}

function asciiArtLoadImage(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { resolve({ img: img, url: url }); };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('无法读取图片')); };
    img.src = url;
  });
}

function asciiArtPick(file) {
  if (!file) return;
  if (file.type.indexOf('image/') !== 0) { alert('请选择图片文件'); return; }
  asciiArtLoadImage(file).then(function (r) {
    ASCII_IMG_STATE.img = r.img;
    ASCII_IMG_STATE.url = r.url;
    ASCII_IMG_STATE.name = file.name;
    ASCII_IMG_STATE.width = r.img.naturalWidth;
    ASCII_IMG_STATE.height = r.img.naturalHeight;
    document.getElementById('asciiImgMeta').textContent = file.name + '（' + r.img.naturalWidth + ' × ' + r.img.naturalHeight + '）';
  }).catch(function (err) { alert(err.message); });
}

function asciiArtReset() {
  if (ASCII_IMG_STATE.url) URL.revokeObjectURL(ASCII_IMG_STATE.url);
  if (ASCII_IMG_STATE.outUrl) URL.revokeObjectURL(ASCII_IMG_STATE.outUrl);
  ASCII_IMG_STATE = { img: null, url: null, name: '', width: 0, height: 0, outUrl: null };
  document.getElementById('asciiImgMeta').textContent = '';
  document.getElementById('asciiImgResult').textContent = '';
  var dl = document.getElementById('asciiDownload');
  dl.removeAttribute('href');
  dl.removeAttribute('download');
}

function asciiArtImg() {
  if (!ASCII_IMG_STATE.img) { alert('请先选择图片'); return; }
  var width = parseInt(document.getElementById('asciiWidth').value, 10);
  if (!width || width < 10) width = 80;
  width = Math.min(240, width);
  var ramp = ASCII_RAMPS[document.getElementById('asciiCharset').value];
  var invert = document.getElementById('asciiInvert').checked;
  var height = Math.max(1, Math.round(width * ASCII_IMG_STATE.height / ASCII_IMG_STATE.width * 0.5));
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(ASCII_IMG_STATE.img, 0, 0, width, height);
  var data;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch (e) {
    alert('无法读取图片数据');
    return;
  }
  var lines = [];
  for (var y = 0; y < height; y++) {
    var line = '';
    for (var x = 0; x < width; x++) {
      var i = (y * width + x) * 4;
      var luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (invert) luma = 255 - luma;
      var idx = Math.round(luma / 255 * (ramp.length - 1));
      line += ramp[idx];
    }
    lines.push(line);
  }
  var out = lines.join('\n');
  document.getElementById('asciiImgResult').textContent = out;
  if (ASCII_IMG_STATE.outUrl) URL.revokeObjectURL(ASCII_IMG_STATE.outUrl);
  var blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  ASCII_IMG_STATE.outUrl = url;
  var dl = document.getElementById('asciiDownload');
  dl.href = url;
  dl.download = 'ascii-art.txt';
}

var asciiDropEl = document.getElementById('asciiDrop');
asciiDropEl.addEventListener('click', function () {
  document.getElementById('asciiImgInput').click();
});
document.getElementById('asciiImgInput').addEventListener('change', function (e) {
  asciiArtPick(e.target.files[0]);
  e.target.value = '';
});
['dragenter', 'dragover'].forEach(function (ev) {
  asciiDropEl.addEventListener(ev, function (e) {
    e.preventDefault();
    asciiDropEl.classList.add('filehash-drop-active');
  });
});
['dragleave', 'drop'].forEach(function (ev) {
  asciiDropEl.addEventListener(ev, function (e) {
    e.preventDefault();
    asciiDropEl.classList.remove('filehash-drop-active');
  });
});
asciiDropEl.addEventListener('drop', function (e) {
  asciiArtPick(e.dataTransfer.files[0]);
});
document.getElementById('asciiTextBtn').addEventListener('click', asciiArtText);
document.getElementById('asciiImgBtn').addEventListener('click', asciiArtImg);
document.getElementById('asciiResetBtn').addEventListener('click', asciiArtReset);
