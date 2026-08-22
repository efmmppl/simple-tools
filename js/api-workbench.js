function getDefaultApiHeaders(method, body) {
  var upper = (method || 'GET').toUpperCase();
  var headers = [];
  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(upper) !== -1) headers.push('Content-Type: application/json');
  headers.push('Accept: application/json');
  return headers.join('\n');
}

function getDefaultApiBody(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].indexOf((method || 'GET').toUpperCase()) !== -1 ? JSON.stringify({ key: 'value', message: 'hello world' }, null, 2) : '';
}

function replaceApiText(text, search, replacement, all) {
  if (!search) return text;
  if (all) return text.split(search).join(replacement);
  var index = text.indexOf(search);
  return index === -1 ? text : text.slice(0, index) + replacement + text.slice(index + search.length);
}

function parseApiHeaders(text) {
  var headers = {};
  String(text || '').split(/\r?\n/).forEach(function (line) {
    var index = line.indexOf(':');
    if (index < 1) return;
    var name = line.slice(0, index).trim();
    var value = line.slice(index + 1).trim();
    if (name) headers[name] = value;
  });
  return headers;
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
}

function buildApiRequestCode(method, url, headers, body) {
  var upper = (method || 'GET').toUpperCase();
  var headerEntries = Object.keys(headers || {});
  var curl = 'curl ' + shellQuote(url);
  if (upper !== 'GET') curl += ' -X ' + upper;
  headerEntries.forEach(function (name) { curl += ' -H ' + shellQuote(name + ': ' + headers[name]); });
  if (body && upper !== 'GET' && upper !== 'HEAD') curl += ' --data-raw ' + shellQuote(body);
  var fetchOptions = [];
  if (upper !== 'GET') fetchOptions.push('  method: ' + JSON.stringify(upper));
  if (headerEntries.length) fetchOptions.push('  headers: ' + JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ') + ',');
  if (body && upper !== 'GET' && upper !== 'HEAD') fetchOptions.push('  body: ' + JSON.stringify(body));
  var fetchCode = 'fetch(' + JSON.stringify(url) + (fetchOptions.length ? ', {\n' + fetchOptions.join('\n') + '\n}' : '') + ')';
  var python = 'import requests\n\nresponse = requests.' + upper.toLowerCase() + '(' + JSON.stringify(url);
  if (headerEntries.length) python += ', headers=' + JSON.stringify(headers);
  if (body && upper !== 'GET' && upper !== 'HEAD') python += ', data=' + JSON.stringify(body);
  python += ')\nprint(response.status_code)\nprint(response.text)';
  return { curl: curl, fetch: fetchCode, python: python };
}

function renderApiCode(code) {
  var targets = { curl: 'apiCodeCurl', fetch: 'apiCodeFetch', python: 'apiCodePython' };
  Object.keys(targets).forEach(function (key) {
    var target = document.getElementById(targets[key]);
    if (target) target.textContent = code[key];
  });
}

function appendApiQuery(url, text) {
  var target = new URL(url);
  String(text || '').split(/\r?\n/).forEach(function (line) {
    var index = line.indexOf('=');
    if (index < 1) return;
    target.searchParams.append(line.slice(0, index).trim(), line.slice(index + 1).trim());
  });
  return target.toString();
}

if (typeof document !== 'undefined') {
  var apiSendBtn = document.getElementById('apiSendBtn');
  var apiGenerateBtn = document.getElementById('apiGenerateBtn');
  var apiResult = document.getElementById('apiResult');
  var apiMethodInput = document.getElementById('apiMethod');
  var apiBodyInput = document.getElementById('apiBody');
  var apiHeadersInput = document.getElementById('apiHeaders');
  var apiHeadersAuto = true;
  var apiBodyAuto = true;
  var apiSearchInput = document.getElementById('apiSearchInput');
  var apiReplaceInput = document.getElementById('apiReplaceInput');
  var apiReplaceStatus = document.getElementById('apiReplaceStatus');
  function syncApiHeaders() {
    if (!apiHeadersAuto || !apiHeadersInput) return;
    apiHeadersInput.value = getDefaultApiHeaders(apiMethodInput.value, apiBodyInput.value.trim());
  }
  function syncApiBody() {
    if (apiBodyAuto && apiBodyInput) apiBodyInput.value = getDefaultApiBody(apiMethodInput.value);
    syncApiHeaders();
  }
  if (apiHeadersInput) apiHeadersInput.addEventListener('input', function () { apiHeadersAuto = false; });
  if (apiMethodInput) apiMethodInput.addEventListener('change', syncApiBody);
  if (apiBodyInput) apiBodyInput.addEventListener('input', function () { apiBodyAuto = false; syncApiHeaders(); });
  syncApiBody();
  function selectApiMatch() {
    if (!apiSearchInput || !apiBodyInput || !apiSearchInput.value) return;
    var start = apiBodyInput.value.indexOf(apiSearchInput.value, apiBodyInput.selectionEnd || 0);
    if (start === -1) start = apiBodyInput.value.indexOf(apiSearchInput.value);
    if (start === -1) { if (apiReplaceStatus) apiReplaceStatus.textContent = '未找到匹配文本'; return; }
    apiBodyInput.focus();
    apiBodyInput.setSelectionRange(start, start + apiSearchInput.value.length);
    if (apiReplaceStatus) apiReplaceStatus.textContent = '已定位';
  }
  function applyApiReplacement(all) {
    if (!apiSearchInput || !apiBodyInput || !apiSearchInput.value) return;
    var before = apiBodyInput.value;
    apiBodyInput.value = replaceApiText(before, apiSearchInput.value, apiReplaceInput ? apiReplaceInput.value : '', all);
    apiBodyAuto = false;
    syncApiHeaders();
    if (apiReplaceStatus) apiReplaceStatus.textContent = before === apiBodyInput.value ? '未找到匹配文本' : (all ? '已全部替换' : '已替换');
  }
  var apiFindBtn = document.getElementById('apiFindBtn');
  var apiReplaceBtn = document.getElementById('apiReplaceBtn');
  var apiReplaceAllBtn = document.getElementById('apiReplaceAllBtn');
  if (apiFindBtn) apiFindBtn.addEventListener('click', selectApiMatch);
  if (apiReplaceBtn) apiReplaceBtn.addEventListener('click', function () { applyApiReplacement(false); });
  if (apiReplaceAllBtn) apiReplaceAllBtn.addEventListener('click', function () { applyApiReplacement(true); });
  function getApiInput() {
    return {
      method: apiMethodInput.value,
      url: document.getElementById('apiUrl').value.trim(),
      query: document.getElementById('apiQuery').value,
      headers: parseApiHeaders(apiHeadersInput.value),
      body: apiBodyInput.value
    };
  }
  function getApiRequestInput() {
    var input = getApiInput();
    if (input.query) input.url = appendApiQuery(input.url, input.query);
    return input;
  }
  if (apiGenerateBtn) apiGenerateBtn.addEventListener('click', function () {
    var input;
    try { input = getApiRequestInput(); } catch (e) { if (apiResult) apiResult.textContent = 'URL 格式错误：' + e.message; return; }
    renderApiCode(buildApiRequestCode(input.method, input.url, input.headers, input.body));
  });
  if (apiSendBtn) apiSendBtn.addEventListener('click', function () {
    var input;
    try { input = getApiRequestInput(); } catch (e) { apiResult.textContent = 'URL 格式错误：' + e.message; return; }
    if (!input.url) { apiResult.textContent = '请输入请求 URL'; return; }
    var options = { method: input.method, headers: input.headers };
    if (input.body && input.method !== 'GET' && input.method !== 'HEAD') {
      try { JSON.parse(input.body); } catch (e) { apiResult.textContent = 'JSON Body 格式错误：' + e.message; return; }
      options.body = input.body;
    }
    var started = Date.now();
    apiResult.textContent = '请求中...';
    fetch(input.url, options).then(function (response) {
      return response.text().then(function (body) { return { response: response, body: body }; });
    }).then(function (result) {
      var body = result.body;
      try { body = JSON.stringify(JSON.parse(body), null, 2); } catch (e) {}
      var responseHeaders = [];
      result.response.headers.forEach(function (value, key) { responseHeaders.push(key + ': ' + value); });
      apiResult.textContent = result.response.status + ' ' + result.response.statusText + ' · ' + (Date.now() - started) + ' ms\n\n[响应头]\n' + responseHeaders.join('\n') + '\n\n[响应体]\n' + body;
    }).catch(function (error) { apiResult.textContent = '请求失败，可能是 CORS 或网络问题：' + error.message; });
  });
}
