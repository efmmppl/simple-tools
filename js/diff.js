function computeLCS(oldArr, newArr) {
  var m = oldArr.length;
  var n = newArr.length;
  var dp = new Array(m + 1);
  for (var i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1);
    for (var j = 0; j <= n; j++) dp[i][j] = 0;
  }
  for (var i = 1; i <= m; i++) {
    for (var j = 1; j <= n; j++) {
      if (oldArr[i - 1] === newArr[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  var pairs = [];
  var i = m, j = n;
  while (i > 0 && j > 0) {
    if (oldArr[i - 1] === newArr[j - 1]) {
      pairs.unshift({ oldIdx: i - 1, newIdx: j - 1 });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return pairs;
}

function diffLines(oldLines, newLines) {
  var pairs = computeLCS(oldLines, newLines);
  var result = [];
  var oldIdx = 0, newIdx = 0;
  for (var pi = 0; pi < pairs.length; pi++) {
    var p = pairs[pi];
    while (oldIdx < p.oldIdx) {
      result.push({ type: 'del', oldNum: oldIdx + 1, text: oldLines[oldIdx] });
      oldIdx++;
    }
    while (newIdx < p.newIdx) {
      result.push({ type: 'add', newNum: newIdx + 1, text: newLines[newIdx] });
      newIdx++;
    }
    if (oldLines[oldIdx] === newLines[newIdx]) {
      result.push({ type: 'same', oldNum: oldIdx + 1, newNum: newIdx + 1, text: oldLines[oldIdx], oldParts: null, newParts: null });
    } else {
      var cd = charDiff(oldLines[oldIdx], newLines[newIdx]);
      result.push({ type: 'same', oldNum: oldIdx + 1, newNum: newIdx + 1, oldParts: cd.oldParts, newParts: cd.newParts });
    }
    oldIdx++; newIdx++;
  }
  while (oldIdx < oldLines.length) {
    result.push({ type: 'del', oldNum: oldIdx + 1, text: oldLines[oldIdx] });
    oldIdx++;
  }
  while (newIdx < newLines.length) {
    result.push({ type: 'add', newNum: newIdx + 1, text: newLines[newIdx] });
    newIdx++;
  }
  return result;
}

function charDiff(oldStr, newStr) {
  var oldChars = oldStr.split('');
  var newChars = newStr.split('');
  var pairs = computeLCS(oldChars, newChars);
  var oldParts = [], newParts = [];
  var o = 0, n = 0;
  for (var pi = 0; pi < pairs.length; pi++) {
    var p = pairs[pi];
    if (o < p.oldIdx) {
      oldParts.push({ type: 'del', text: oldChars.slice(o, p.oldIdx).join('') });
    }
    if (n < p.newIdx) {
      newParts.push({ type: 'add', text: newChars.slice(n, p.newIdx).join('') });
    }
    oldParts.push({ type: 'same', text: oldChars[p.oldIdx] });
    newParts.push({ type: 'same', text: newChars[p.newIdx] });
    o = p.oldIdx + 1; n = p.newIdx + 1;
  }
  if (o < oldChars.length) oldParts.push({ type: 'del', text: oldChars.slice(o).join('') });
  if (n < newChars.length) newParts.push({ type: 'add', text: newChars.slice(n).join('') });
  return { oldParts: oldParts, newParts: newParts };
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderParts(parts) {
  if (!parts) return '';
  var html = '';
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p.type === 'del') html += '<span class="diff-char-l">' + escHtml(p.text) + '</span>';
    else if (p.type === 'add') html += '<span class="diff-char-r">' + escHtml(p.text) + '</span>';
    else html += escHtml(p.text);
  }
  return html;
}

var diffState = { positions: [], current: -1 };

function diffNavigate(dir) {
  if (!diffState.positions.length) return;
  diffState.current += dir;
  if (diffState.current < 0) diffState.current = diffState.positions.length - 1;
  if (diffState.current >= diffState.positions.length) diffState.current = 0;
  var row = diffState.positions[diffState.current];
  var el = document.querySelector('.diff-line[data-row="' + row + '"]');
  if (el) el.scrollIntoView({ block: 'start', behavior: 'auto' });
  document.getElementById('diffNavLabel').textContent = (diffState.current + 1) + ' / ' + diffState.positions.length;
}

function runDiff() {
  var oldText = document.getElementById('diffOldInput').value;
  var newText = document.getElementById('diffNewInput').value;
  var result = document.getElementById('diffResult');

  diffState.positions = [];
  diffState.current = -1;

  if (!oldText.trim() && !newText.trim()) {
    result.innerHTML = '<div class="empty-state"><i class="fas fa-code-branch" style="font-size:2rem;display:block;margin-bottom:8px;color:#d4cdbc"></i>输入文本后点击"对比"查看差异</div>';
    document.getElementById('diffNav').style.display = 'none';
    return;
  }

  var oldLines = oldText.split('\n');
  var newLines = newText.split('\n');
  var diffs = diffLines(oldLines, newLines);

  var oldHtml = '', newHtml = '';
  var addCount = 0, delCount = 0, modCount = 0;
  var rowIdx = 0;
  var inChangeGroup = false;

  for (var i = 0; i < diffs.length; i++) {
    var d = diffs[i];
    var isChange = d.type !== 'same' || (d.oldParts && d.newParts);
    var marker = isChange ? ' diff-line-change' : '';
    if (isChange && !inChangeGroup) {
      diffState.positions.push(rowIdx);
      inChangeGroup = true;
    } else if (!isChange) {
      inChangeGroup = false;
    }
    if (d.type === 'del') {
      delCount++;
      oldHtml += '<div class="diff-line diff-line-l' + marker + '" data-row="' + rowIdx + '"><span class="diff-gutter">' + d.oldNum + '</span><span class="diff-content">' + escHtml(d.text) + '</span></div>';
      newHtml += '<div class="diff-line diff-line-pad"></div>';
    } else if (d.type === 'add') {
      addCount++;
      oldHtml += '<div class="diff-line diff-line-pad"></div>';
      newHtml += '<div class="diff-line diff-line-r' + marker + '" data-row="' + rowIdx + '"><span class="diff-gutter">' + d.newNum + '</span><span class="diff-content">' + escHtml(d.text) + '</span></div>';
    } else {
      if (d.oldParts && d.newParts) {
        modCount++;
        oldHtml += '<div class="diff-line diff-line-l' + marker + '" data-row="' + rowIdx + '"><span class="diff-gutter">' + d.oldNum + '</span><span class="diff-content">' + renderParts(d.oldParts) + '</span></div>';
        newHtml += '<div class="diff-line diff-line-r' + marker + '" data-row="' + rowIdx + '"><span class="diff-gutter">' + d.newNum + '</span><span class="diff-content">' + renderParts(d.newParts) + '</span></div>';
      } else {
        oldHtml += '<div class="diff-line" data-row="' + rowIdx + '"><span class="diff-gutter">' + d.oldNum + '</span><span class="diff-content">' + escHtml(d.text) + '</span></div>';
        newHtml += '<div class="diff-line" data-row="' + rowIdx + '"><span class="diff-gutter">' + d.newNum + '</span><span class="diff-content">' + escHtml(d.text) + '</span></div>';
      }
    }
    rowIdx++;
  }

  result.innerHTML = '<div class="diff-stats">共 <b>' + diffs.length + '</b> 处变更：<span style="color:#a33">' + delCount + ' 行删除</span> · <span style="color:#1a7a1a">' + addCount + ' 行新增</span> · <span style="color:#b07d30">' + modCount + ' 行修改</span></div>' +
    '<div class="diff-output">' +
      '<div class="diff-panel diff-panel-l">' +
        '<div class="diff-panel-header"><i class="fas fa-minus-circle" style="color:#a33;margin-right:4px"></i>旧文本</div>' +
        '<div class="diff-lines" id="diffOldLines">' + oldHtml + '</div>' +
      '</div>' +
      '<div class="diff-panel diff-panel-r">' +
        '<div class="diff-panel-header"><i class="fas fa-plus-circle" style="color:#1a7a1a;margin-right:4px"></i>新文本</div>' +
        '<div class="diff-lines" id="diffNewLines">' + newHtml + '</div>' +
      '</div>' +
    '</div>';

  var oldContainer = document.getElementById('diffOldLines');
  var newContainer = document.getElementById('diffNewLines');
  oldContainer.addEventListener('scroll', function () { newContainer.scrollTop = oldContainer.scrollTop; });
  newContainer.addEventListener('scroll', function () { oldContainer.scrollTop = newContainer.scrollTop; });

  var navEl = document.getElementById('diffNav');
  if (diffState.positions.length > 0) {
    navEl.style.display = '';
    diffState.current = 0;
    var row = diffState.positions[0];
    var el = document.querySelector('.diff-line[data-row="' + row + '"]');
    if (el) el.scrollIntoView({ block: 'start', behavior: 'auto' });
    document.getElementById('diffNavLabel').textContent = '1 / ' + diffState.positions.length;
  } else {
    navEl.style.display = 'none';
  }
}

document.getElementById('diffBtn').addEventListener('click', runDiff);
document.getElementById('diffPrev').addEventListener('click', function () { diffNavigate(-1); });
document.getElementById('diffNext').addEventListener('click', function () { diffNavigate(1); });
