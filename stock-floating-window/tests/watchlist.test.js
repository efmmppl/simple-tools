const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createWatchlistState,
  refreshQuotes,
  formatQuoteRow,
  addSymbol,
  removeSymbol,
  removeSymbolPersisted,
  refreshIntervalMs
} = require('../src/quote');
const { createLatestRefresh, applyRefreshResult } = require('../src/renderer');

function response(text, ok = true) {
  return {
    ok,
    async text() { return text; }
  };
}

function tencentResponse(rows) {
  return Object.entries(rows).map(([symbol, row]) => 'v_' + symbol + '="' + row.join('~') + '";').join('\n');
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
    return response('');
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /sh600519%2Csz000858/);
  assert.equal(calls[0][1].signal instanceof AbortSignal, true);
  assert.equal(result.quotes.length, 0);
  assert.equal(result.error.type, 'response');
});

test('returns parsed quote updates on a successful refresh', async () => {
  const row = [];
  row[1] = '测试'; row[3] = '10'; row[4] = '9'; row[30] = '20260901103045'; row[31] = '1';
  const result = await refreshQuotes(['sh600519'], async () => response(tencentResponse({ sh600519: row })));

  assert.equal(result.error, null);
  assert.equal(result.quotes[0].price, 10);
  assert.equal(result.quotes[0].changePercent, 100 / 9);
});

test('returns valid rows with a typed response error for partial batches', async () => {
  const row = [];
  row[1] = '测试'; row[3] = '10'; row[4] = '9'; row[30] = '20260901103045'; row[31] = '1';
  const result = await refreshQuotes(['sh600519', 'sz000858'], async () => response(tencentResponse({ sh600519: row })));

  assert.equal(result.quotes.length, 1);
  assert.equal(result.quotes[0].symbol, 'sh600519');
  assert.equal(result.error.type, 'response');
});

test('applies partial refresh rows without replacing missing quotes or marking success', () => {
  const state = {
    quotes: { sz000858: quote('sz000858', 'cached') },
    error: null,
    lastSuccessAt: 'previous-time'
  };

  applyRefreshResult(state, {
    quotes: [quote('sh600519', 'fresh')],
    error: { type: 'response', message: '行情数据不完整' }
  }, 'new-time');

  assert.equal(state.quotes.sh600519.name, 'fresh');
  assert.equal(state.quotes.sz000858.name, 'cached');
  assert.equal(state.error.type, 'response');
  assert.equal(state.lastSuccessAt, 'previous-time');
});

test('commits only the latest deferred refresh result', async () => {
  const state = { symbols: ['sh600519'], quotes: {}, error: null, lastSuccessAt: null };
  const deferred = [];
  const refresh = createLatestRefresh(
    async () => new Promise((resolve) => deferred.push(resolve)),
    () => state,
    (currentState, result) => {
      result.quotes.forEach((item) => { currentState.quotes[item.symbol] = item; });
      currentState.error = result.error;
      currentState.lastSuccessAt = result.successAt;
    }
  );

  const first = refresh();
  const second = refresh();
  deferred[1]({ quotes: [quote('sh600519', 'newer')], error: null, successAt: 'newer-time' });
  await second;
  deferred[0]({ quotes: [quote('sh600519', 'older')], error: { type: 'network' }, successAt: 'older-time' });
  await first;

  assert.equal(state.quotes.sh600519.name, 'newer');
  assert.equal(state.error, null);
  assert.equal(state.lastSuccessAt, 'newer-time');
});

test('returns typed network and response errors', async () => {
  const network = await refreshQuotes(['sh600519'], async () => { throw new Error('offline'); });
  assert.equal(network.error.type, 'network');

  const responseError = await refreshQuotes(['sh600519'], async () => response('', false));
  assert.equal(responseError.error.type, 'response');
});

test('rejects successful responses with missing or invalid quote data', async () => {
  const missing = await refreshQuotes(['sh600519'], async () => response('not a Tencent response'));
  assert.equal(missing.error.type, 'response');

  const invalid = await refreshQuotes(['sh600519'], async () => response('v_sh600519="1~测试~600519~not-a-number";'));
  assert.equal(invalid.error.type, 'response');
  assert.deepEqual(invalid.quotes, []);
});

test('classifies a response read syntax error as a response error', async () => {
  const result = await refreshQuotes(['sh600519'], async () => ({
    ok: true,
    async text() { throw new SyntaxError('Unexpected token'); }
  }));
  assert.equal(result.error.type, 'response');
  assert.deepEqual(result.quotes, []);
});

test('classifies an AbortError while reading a response as a network timeout', async () => {
  const result = await refreshQuotes(['sh600519'], async () => ({
    ok: true,
    async text() { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); }
  }));
  assert.equal(result.error.type, 'network');
  assert.match(result.error.message, /超时/);
  assert.deepEqual(result.quotes, []);
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

test('does not mutate state when symbol persistence fails', async () => {
  const state = createWatchlistState({ symbols: ['sh600519'] });
  await assert.rejects(
    () => addSymbol('000858', state, async (symbol) => quote(symbol), async () => {
      throw new Error('disk full');
    }),
    (error) => error.code === 'persistence'
  );
  assert.deepEqual(state.symbols, ['sh600519']);
  assert.equal(state.quotes.sz000858, undefined);
});

test('converts configured refresh intervals from seconds to milliseconds', () => {
  assert.equal(refreshIntervalMs(), 5000);
  assert.equal(refreshIntervalMs(3), 3000);
  assert.equal(refreshIntervalMs(60), 60000);
});

test('removes a symbol and its cached quote', () => {
  const state = createWatchlistState({ symbols: ['sh600519', 'sz000858'] });
  state.quotes.sh600519 = quote('sh600519');
  removeSymbol('sh600519', state);
  assert.deepEqual(state.symbols, ['sz000858']);
  assert.equal(state.quotes.sh600519, undefined);
});

test('restores removed symbol and quote when persistence fails', async () => {
  const state = createWatchlistState({ symbols: ['sh600519', 'sz000858'] });
  state.quotes.sh600519 = quote('sh600519');

  await assert.rejects(
    () => removeSymbolPersisted('sh600519', state, async () => { throw new Error('disk full'); }),
    (error) => error.code === 'persistence'
  );

  assert.deepEqual(state.symbols, ['sh600519', 'sz000858']);
  assert.equal(state.quotes.sh600519.name, '贵州茅台');
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
