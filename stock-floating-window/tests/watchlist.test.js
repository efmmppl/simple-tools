const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createWatchlistState,
  refreshQuotes,
  formatQuoteRow,
  addSymbol,
  removeSymbol
} = require('../src/quote');

function response(json, ok = true) {
  return {
    ok,
    async json() { return json; }
  };
}

function quote(symbol, name = '贵州茅台', change = 10) {
  return {
    symbol,
    name,
    price: 1500.5,
    change,
    changePercent: 0.67,
    time: '2026-09-01 10:30:45'
  };
}

test('refreshes multiple symbols with one batch request', async () => {
  const calls = [];
  const result = await refreshQuotes(['sh600519', 'sz000858'], async (url, options) => {
    calls.push([url, options]);
    return response({ data: {} });
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /sh600519%2Csz000858/);
  assert.equal(calls[0][1].signal instanceof AbortSignal, true);
  assert.deepEqual(result, { quotes: [], error: null });
});

test('returns parsed quote updates on a successful refresh', async () => {
  const row = [];
  row[1] = '测试'; row[3] = '10'; row[4] = '9'; row[30] = '20260901103045'; row[31] = '1';
  const result = await refreshQuotes(['sh600519'], async () => response({
    data: { sh600519: { qt: { sh600519: row } } }
  }));

  assert.equal(result.error, null);
  assert.equal(result.quotes[0].price, 10);
  assert.equal(result.quotes[0].changePercent, 100 / 9);
});

test('returns typed network and response errors', async () => {
  const network = await refreshQuotes(['sh600519'], async () => { throw new Error('offline'); });
  assert.equal(network.error.type, 'network');

  const responseError = await refreshQuotes(['sh600519'], async () => response({}, false));
  assert.equal(responseError.error.type, 'response');
});

test('watchlist state preserves valid cached quotes when refresh fails', () => {
  const state = createWatchlistState({ symbols: ['sh600519'] });
  state.quotes.sh600519 = quote('sh600519');
  state.error = { type: 'network' };
  assert.equal(state.quotes.sh600519.price, 1500.5);
});

test('adds normalized symbols and rejects duplicates or unsupported input', async () => {
  const state = createWatchlistState({ symbols: ['sh600519'] });
  await addSymbol(' 000858 ', state, async (symbol) => quote(symbol, '五粮液'));
  assert.deepEqual(state.symbols, ['sh600519', 'sz000858']);

  await assert.rejects(() => addSymbol('600519', state, async () => quote('sh600519')), /duplicate/i);
  await assert.rejects(() => addSymbol('830001', state, async () => quote('bj830001')), /unsupported/i);
  await assert.rejects(() => addSymbol('000001', state, async () => null), /not found/i);
});

test('removes a symbol and its cached quote', () => {
  const state = createWatchlistState({ symbols: ['sh600519', 'sz000858'] });
  state.quotes.sh600519 = quote('sh600519');
  removeSymbol('sh600519', state);
  assert.deepEqual(state.symbols, ['sz000858']);
  assert.equal(state.quotes.sh600519, undefined);
});

test('escapes API-provided names and renders signed quote values', () => {
  const html = formatQuoteRow({
    symbol: 'sh600519', name: '<img src=x onerror=alert(1)>', price: 10,
    change: -1.25, changePercent: -2.5, time: '2026-09-01 10:30:45'
  });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
  assert.match(html, /-1\.25/);
  assert.match(html, /-2\.50%/);
  assert.match(html, /quote-down/);
});
