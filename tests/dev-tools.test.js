const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function loadTool(file) {
  const context = { console, URL, fetch() {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
  return context;
}

test('analyzeLogs counts levels and groups repeated messages', () => {
  const { analyzeLogs } = loadTool('js/log-analyzer.js');
  const result = analyzeLogs('[2026-08-20 10:00:00] ERROR request failed id=abc\n[2026-08-20 10:01:00] ERROR request failed id=def\n[2026-08-20 10:02:00] WARN retrying');

  assert.equal(result.total, 3);
  assert.equal(result.errors, 2);
  assert.equal(result.warnings, 1);
  assert.equal(result.groups[0].count, 2);
});

test('parseApiHeaders and buildApiRequestCode generate portable request examples', () => {
  const { parseApiHeaders, buildApiRequestCode, appendApiQuery } = loadTool('js/api-workbench.js');
  const headers = parseApiHeaders('Content-Type: application/json\nAuthorization: Bearer token');
  const url = appendApiQuery('https://example.com/api', 'page=1\nfilter=active');
  const code = buildApiRequestCode('POST', url, headers, '{"ok":true}');

  assert.deepEqual(JSON.parse(JSON.stringify(headers)), { 'Content-Type': 'application/json', Authorization: 'Bearer token' });
  assert.match(url, /page=1/);
  assert.match(url, /filter=active/);
  assert.match(code.curl, /-X POST/);
  assert.match(code.fetch, /fetch\(/);
  assert.match(code.python, /requests\.post/);
});

test('getDefaultApiHeaders changes Content-Type by method and body', () => {
  const { getDefaultApiHeaders, getDefaultApiBody } = loadTool('js/api-workbench.js');

  assert.equal(getDefaultApiHeaders('GET', ''), 'Accept: application/json');
  assert.equal(getDefaultApiHeaders('POST', ''), 'Accept: application/json');
  assert.equal(getDefaultApiHeaders('POST', '{"ok":true}'), 'Content-Type: application/json\nAccept: application/json');
  assert.equal(getDefaultApiBody('GET'), '');
  assert.match(getDefaultApiBody('POST'), /"key"/);
  assert.match(getDefaultApiBody('POST'), /"message"/);
});

test('replaceApiText replaces the current match or all matches', () => {
  const { replaceApiText } = loadTool('js/api-workbench.js');

  assert.equal(replaceApiText('foo bar foo', 'foo', 'baz', false), 'baz bar foo');
  assert.equal(replaceApiText('foo bar foo', 'foo', 'baz', true), 'baz bar baz');
});

test('compareEnvFiles reports missing, extra, empty, and matched variables', () => {
  const { compareEnvFiles } = loadTool('js/env-compare.js');
  const result = compareEnvFiles('PORT=3000\nDB_URL=\nOPTIONAL=yes', 'PORT=8080\nSECRET=abc');

  assert.deepEqual(Array.from(result.missing), ['DB_URL', 'OPTIONAL']);
  assert.deepEqual(Array.from(result.extra), ['SECRET']);
  assert.deepEqual(Array.from(result.empty), ['DB_URL']);
  assert.deepEqual(Array.from(result.matched), ['PORT']);
});
