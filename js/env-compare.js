function parseEnvText(text) {
  var values = {};
  String(text || '').split(/\r?\n/).forEach(function (line) {
    var clean = line.trim();
    if (!clean || clean.charAt(0) === '#') return;
    if (clean.indexOf('export ') === 0) clean = clean.slice(7).trim();
    var index = clean.indexOf('=');
    if (index < 1) return;
    var key = clean.slice(0, index).trim();
    var value = clean.slice(index + 1).trim();
    if ((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') || (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")) value = value.slice(1, -1);
    values[key] = value;
  });
  return { keys: Object.keys(values), values: values };
}

function compareEnvFiles(exampleText, actualText) {
  var example = parseEnvText(exampleText);
  var actual = parseEnvText(actualText);
  var missing = example.keys.filter(function (key) { return !Object.prototype.hasOwnProperty.call(actual.values, key); });
  var extra = actual.keys.filter(function (key) { return !Object.prototype.hasOwnProperty.call(example.values, key); });
  var empty = example.keys.concat(actual.keys).filter(function (key, index, keys) { return keys.indexOf(key) === index && (!example.values[key] && Object.prototype.hasOwnProperty.call(example.values, key) || !actual.values[key] && Object.prototype.hasOwnProperty.call(actual.values, key)); });
  var matched = example.keys.filter(function (key) { return Object.prototype.hasOwnProperty.call(actual.values, key) && example.values[key] && actual.values[key]; });
  return { missing: missing, extra: extra, empty: empty, matched: matched };
}

function escapeList(list) { return list.map(escapeHtml).join('<br>') || '无'; }

function renderEnvComparison(result) {
  var target = document.getElementById('envCompareResult');
  if (!target) return;
  target.innerHTML = '<div class="env-summary"><span>缺失 <b>' + result.missing.length + '</b></span><span>多余 <b>' + result.extra.length + '</b></span><span>空值 <b>' + result.empty.length + '</b></span><span>匹配 <b>' + result.matched.length + '</b></span></div>' +
    '<div class="env-columns"><div><h4>缺失变量</h4><p>' + escapeList(result.missing) + '</p></div><div><h4>多余变量</h4><p>' + escapeList(result.extra) + '</p></div><div><h4>空值变量</h4><p>' + escapeList(result.empty) + '</p></div></div>';
}

if (typeof document !== 'undefined') {
  var envCompareBtn = document.getElementById('envCompareBtn');
  var envClearBtn = document.getElementById('envClearBtn');
  if (envCompareBtn) envCompareBtn.addEventListener('click', function () { renderEnvComparison(compareEnvFiles(document.getElementById('envExample').value, document.getElementById('envActual').value)); });
  if (envClearBtn) envClearBtn.addEventListener('click', function () { document.getElementById('envExample').value = ''; document.getElementById('envActual').value = ''; renderEnvComparison(compareEnvFiles('', '')); });
}
