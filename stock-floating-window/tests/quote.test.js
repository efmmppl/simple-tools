const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSymbol,
  buildQuoteUrl,
  parseQuoteResponse,
  isMarketClosed
} = require('../src/quote');

test('normalizes Shanghai six-digit symbols', () => {
  assert.equal(normalizeSymbol('600519'), 'sh600519');
});

test('normalizes Shenzhen six-digit symbols', () => {
  assert.equal(normalizeSymbol('000858'), 'sz000858');
});

test('accepts supported prefixed symbols', () => {
  assert.equal(normalizeSymbol('SH600519'), 'sh600519');
  assert.equal(normalizeSymbol('sz000858'), 'sz000858');
});

test('cleans whitespace and punctuation', () => {
  assert.equal(normalizeSymbol('  SH-600519 '), 'sh600519');
  assert.equal(normalizeSymbol('000.858'), 'sz000858');
});

test('rejects unsupported symbol lengths and values', () => {
  assert.equal(normalizeSymbol('60051'), null);
  assert.equal(normalizeSymbol('6005190'), null);
  assert.equal(normalizeSymbol('8xxxxx'), null);
  assert.equal(normalizeSymbol('830001'), null);
  assert.equal(normalizeSymbol('bj830001'), null);
  assert.equal(normalizeSymbol('abc'), null);
});

test('builds one encoded Tencent batch quote URL', () => {
  assert.equal(
    buildQuoteUrl(['sh600519', 'sz000858']),
    'https://qt.gtimg.cn/q=sh600519%2Csz000858'
  );
});

function quoteRow(name, price, previousClose, change, time) {
  const row = [];
  row[1] = name;
  row[3] = price;
  row[4] = previousClose;
  row[30] = time;
  row[31] = change;
  row[32] = 'not-used';
  return row;
}

test('parses valid Tencent rows and skips missing or malformed rows', () => {
  const symbols = ['sh600519', 'sz000858', 'sh600000', 'sz000001'];
  const json = {
    data: {
      sh600519: { qt: { sh600519: quoteRow('贵州茅台', '1500.5', '1490.5', '10', '20260901103045') } },
      sz000858: { qt: { sz000858: quoteRow('五粮液', '100', '0', '-2.5', '20260901145959') } },
      sh600000: { qt: {} },
      sz000001: { qt: { sz000001: quoteRow('坏数据', 'not-a-number', '10', '1', '20260901103045') } }
    }
  };

  assert.deepEqual(parseQuoteResponse(json, symbols), [
    {
      symbol: 'sh600519',
      name: '贵州茅台',
      price: 1500.5,
      previousClose: 1490.5,
      change: 10,
      changePercent: 0.6709158000670915,
      time: '2026-09-01 10:30:45'
    },
    {
      symbol: 'sz000858',
      name: '五粮液',
      price: 100,
      previousClose: 0,
      change: -2.5,
      changePercent: null,
      time: '2026-09-01 14:59:59'
    }
  ]);
});

test('returns null for malformed numeric fields in an otherwise valid row', () => {
  const row = quoteRow('测试', '100', 'bad', 'bad', '20260901103045');
  const [result] = parseQuoteResponse({ data: { sh600519: { qt: { sh600519: row } } } }, ['sh600519']);
  assert.equal(result.price, 100);
  assert.equal(result.previousClose, null);
  assert.equal(result.change, null);
  assert.equal(result.changePercent, null);
});

test('identifies local A-share market sessions', () => {
  assert.equal(isMarketClosed(new Date(2026, 8, 1, 9, 30)), false);
  assert.equal(isMarketClosed(new Date(2026, 8, 1, 11, 30)), true);
  assert.equal(isMarketClosed(new Date(2026, 8, 1, 13, 0)), false);
  assert.equal(isMarketClosed(new Date(2026, 8, 1, 15, 0)), true);
  assert.equal(isMarketClosed(new Date(2026, 7, 30, 10, 0)), true);
});
