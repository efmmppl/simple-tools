function normalizeLogMessage(line) {
  return line
    .replace(/^\s*(?:\[[^\]]+\]|\d{4}-\d{2}-\d{2}[T ][^ ]+)\s*/, '')
    .replace(/\b(?:id|request[-_ ]?id|trace[-_ ]?id)=[^\s]+/gi, '$1=<id>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '<uuid>')
    .replace(/\s+/g, ' ')
    .trim();
}

function analyzeLogs(text) {
  var lines = String(text || '').split(/\r?\n/).filter(function (line) { return line.trim(); });
  var groups = [];
  var byMessage = {};
  var errors = 0;
  var warnings = 0;
  var parsed = lines.map(function (line, index) {
    var level = /\b(?:error|fatal|exception|failed|failure)\b/i.test(line) ? 'error' : /\b(?:warn|warning|retry)\b/i.test(line) ? 'warning' : 'info';
    if (level === 'error') errors++;
    if (level === 'warning') warnings++;
    var message = normalizeLogMessage(line);
    if (!byMessage[message]) {
      byMessage[message] = { message: message, level: level, count: 0, lines: [] };
      groups.push(byMessage[message]);
    }
    byMessage[message].count++;
    byMessage[message].lines.push(index + 1);
    return { line: line, level: level, message: message, number: index + 1 };
  });
  groups.sort(function (a, b) { return b.count - a.count; });
  return { total: lines.length, errors: errors, warnings: warnings, groups: groups, lines: parsed };
}

function renderLogAnalysis(result) {
  var summary = document.getElementById('logAnalysisSummary');
  var groups = document.getElementById('logAnalysisGroups');
  if (!summary || !groups) return;
  summary.innerHTML = '<span>总行数 <b>' + result.total + '</b></span><span class="log-stat-error">错误 <b>' + result.errors + '</b></span><span class="log-stat-warning">警告 <b>' + result.warnings + '</b></span>';
  groups.innerHTML = result.groups.length ? result.groups.map(function (group) {
    return '<div class="log-group"><div><span class="log-level ' + group.level + '">' + group.level.toUpperCase() + '</span><b>' + escapeHtml(group.message) + '</b></div><span class="log-group-count">' + group.count + ' 次 · 行 ' + group.lines.join(', ') + '</span></div>';
  }).join('') : '<div class="empty-state">没有可分析的日志</div>';
}

if (typeof document !== 'undefined') {
  var logInput = document.getElementById('logInput');
  var logAnalyzeBtn = document.getElementById('logAnalyzeBtn');
  var logClearBtn = document.getElementById('logClearBtn');
  if (logAnalyzeBtn) logAnalyzeBtn.addEventListener('click', function () { renderLogAnalysis(analyzeLogs(logInput ? logInput.value : '')); });
  if (logClearBtn && logInput) logClearBtn.addEventListener('click', function () { logInput.value = ''; renderLogAnalysis(analyzeLogs('')); });
}
