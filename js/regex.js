// 防抖定时器 ID
let rxHighlightTimer = null;

// getRegexFlags - 从复选框获取正则表达式标志位
function getRegexFlags() {
  let f = '';
  if (document.getElementById('rxFlagG').checked) f += 'g';
  if (document.getElementById('rxFlagI').checked) f += 'i';
  if (document.getElementById('rxFlagM').checked) f += 'm';
  if (document.getElementById('rxFlagS').checked) f += 's';
  if (document.getElementById('rxFlagU').checked) f += 'u';
  if (document.getElementById('rxFlagY').checked) f += 'y';
  return f;
}


// testRegex - 执行正则匹配测试并渲染结果
function testRegex() {
  const patternStr = document.getElementById('rxPattern').value.trim();
  const text = document.getElementById('rxTestText').value;
  const output = document.getElementById('rxOutput');
  const stats = document.getElementById('rxStats');
  const matchList = document.getElementById('rxMatchList');
  const groups = document.getElementById('rxGroups');

  if (!patternStr) {
    output.innerHTML = '<span style="color:#b8ad9e">请输入正则表达式</span>';
    stats.innerHTML = '<i class="fas fa-chart-bar" style="margin-right:6px"></i> 匹配结果';
    matchList.style.display = 'none';
    return;
  }

  let re;
  try {
    re = new RegExp(patternStr, getRegexFlags());
  } catch (e) {
    output.innerHTML = '<span style="color:#b85454">' + escapeHtml(e.message) + '</span>';
    stats.innerHTML = '<i class="fas fa-chart-bar" style="margin-right:6px"></i> 匹配结果';
    matchList.style.display = 'none';
    return;
  }

  if (!text) {
    output.innerHTML = '<span style="color:#b8ad9e">请输入测试文本</span>';
    stats.innerHTML = '<i class="fas fa-chart-bar" style="margin-right:6px"></i> 匹配结果';
    matchList.style.display = 'none';
    return;
  }

  var matches = [];
  var global = re.global || re.sticky;
  var regexStart = Date.now();
  var REGEX_TIMEOUT = 5000;
  if (global) {
    var m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ full: m[0], index: m.index, groups: m.slice(1) });
      if (m.index === re.lastIndex) re.lastIndex++;
      if (Date.now() - regexStart > REGEX_TIMEOUT) {
        output.innerHTML = '<span style="color:#b85454">正则匹配超时，表达式可能过于复杂</span>';
        stats.innerHTML = '<i class="fas fa-chart-bar" style="margin-right:6px"></i> 匹配结果';
        matchList.style.display = 'none';
        return;
      }
    }
  } else {
    const m = re.exec(text);
    if (m) matches.push({ full: m[0], index: m.index, groups: m.slice(1) });
  }

  stats.innerHTML = '<i class="fas fa-chart-bar" style="margin-right:6px"></i> 匹配结果' +
    ' <span style="font-weight:normal;font-size:0.82rem;color:#8c8273">— 共 ' + matches.length + ' 处匹配</span>';

  if (matches.length === 0) {
    output.innerHTML = '<span style="color:#8c8273">无匹配结果</span>';
    matchList.style.display = 'none';
    return;
  }

  let lastIdx = 0;
  let html = '';
  for (const m of matches) {
    html += escapeHtml(text.slice(lastIdx, m.index));
    html += '<span style="background:rgba(107,143,94,0.2);border-radius:3px;padding:1px 2px">' + escapeHtml(m.full) + '</span>';
    lastIdx = m.index + m.full.length;
  }
  html += escapeHtml(text.slice(lastIdx));
  output.innerHTML = html;

  const hasGroups = matches.some(m => m.groups.length > 0);
  if (hasGroups) {
    matchList.style.display = 'flex';
    let gHtml = '';
    matches.forEach((m, i) => {
      if (m.groups.length > 0) {
        gHtml += '<div style="margin:4px 0"><span style="color:#8c8273">#' + (i + 1) + '</span> <span style="color:#6b6058">"' + escapeHtml(m.full) + '"</span> → ';
        gHtml += m.groups.map((g, j) => {
          if (g !== undefined) {
            return '<span style="background:rgba(107,143,94,0.08);border-radius:3px;padding:0 4px;margin:0 2px"><b style="color:#6b8f5e">$' + (j + 1) + '</b> ' + escapeHtml(g) + '</span>';
          }
          return '';
        }).filter(Boolean).join(' ');
        gHtml += '</div>';
      }
    });
    groups.innerHTML = gHtml || '（无捕获组）';
  } else {
    matchList.style.display = 'none';
  }
}

// scheduleRxTest - 防抖触发正则测试（200ms 延迟）
function scheduleRxTest() {
  if (rxHighlightTimer) clearTimeout(rxHighlightTimer);
  rxHighlightTimer = setTimeout(testRegex, 200);
}

// 正则面板事件绑定：输入框变化和标志位切换均触发测试
document.getElementById('rxPattern').addEventListener('input', scheduleRxTest);
document.getElementById('rxTestText').addEventListener('input', scheduleRxTest);
document.querySelectorAll('#tool-regex input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', scheduleRxTest);
});
