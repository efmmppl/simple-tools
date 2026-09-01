const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { sanitizeConfig, loadConfig, saveConfig } = require('../src/config');
const { refreshQuotes, formatQuoteRow } = require('../src/quote');

function response(text) {
  return { ok: true, async text() { return text; } };
}

function quoteRow(name, price, previousClose, change, time) {
  const row = [];
  row[1] = name;
  row[3] = String(price);
  row[4] = String(previousClose);
  row[30] = time;
  row[31] = String(change);
  return row;
}

function tencentResponse(rows) {
  return Object.entries(rows).map(([symbol, row]) => 'v_' + symbol + '="' + row.join('~') + '";').join('\n');
}

test('round-trips a two-symbol fixture and renders two batch quote rows', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-smoke-'));
  try {
    const configPath = path.join(directory, 'config.json');
    const fixture = sanitizeConfig({ symbols: ['600519', '000858'] });

    saveConfig(configPath, fixture);

    const loaded = loadConfig(configPath);
    const result = await refreshQuotes(loaded.symbols, async (url) => {
      assert.match(url, /sh600519%2Csz000858/);
      return response(tencentResponse({
        sh600519: quoteRow('贵州茅台', 1500.5, 1490.5, 10, '20260901103045'),
        sz000858: quoteRow('五粮液', 100, 102.5, -2.5, '20260901103045')
      }));
    });

    assert.deepEqual(loaded.symbols, ['sh600519', 'sz000858']);
    assert.equal(result.error, null);
    assert.equal(result.quotes.length, 2);
    const rows = result.quotes.map(formatQuoteRow);
    assert.equal(rows.length, 2);
    assert.match(rows[0], /贵州茅台/);
    assert.match(rows[1], /五粮液/);
    assert.match(rows[1], /quote-down/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
