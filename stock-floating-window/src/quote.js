function normalizeSymbol(input) {
  var value = String(input || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/^(sh|sz)\d{6}$/.test(value)) return value;
  if (!/^\d{6}$/.test(value)) return null;
  if (value[0] === '6' || value[0] === '5') return 'sh' + value;
  if (value[0] === '0' || value[0] === '3' || value[0] === '1' || value[0] === '2') return 'sz' + value;
  return null;
}

function buildQuoteUrl(symbols) {
  var list = Array.isArray(symbols) ? symbols : [symbols];
  return 'https://qt.gtimg.cn/q=' + encodeURIComponent(list.join(','));
}

function numericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  var text = value.trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  var number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function formatQuoteTime(value) {
  if (typeof value !== 'string' || !/^\d{14}$/.test(value)) return null;
  var year = Number(value.slice(0, 4));
  var month = Number(value.slice(4, 6));
  var day = Number(value.slice(6, 8));
  var hour = Number(value.slice(8, 10));
  var minute = Number(value.slice(10, 12));
  var second = Number(value.slice(12, 14));
  var daysInMonth = [31, (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1] ||
      hour > 23 || minute > 59 || second > 59) return null;
  return value.slice(0, 4) + '-' + value.slice(4, 6) + '-' + value.slice(6, 8) + ' ' +
    value.slice(8, 10) + ':' + value.slice(10, 12) + ':' + value.slice(12, 14);
}

function parseQuoteResponse(json, symbols) {
  var data = json && json.data;
  if (!data || typeof data !== 'object') return [];
  var list = Array.isArray(symbols) ? symbols : [symbols];
  return list.map(function (symbol) {
    var entry = data[symbol];
    var row = entry && entry.qt && entry.qt[symbol];
    if (!Array.isArray(row)) return null;
    var price = numericValue(row[3]);
    if (price == null) return null;
    var previousClose = numericValue(row[4]);
    var change = numericValue(row[31]);
    return {
      symbol: symbol,
      name: typeof row[1] === 'string' ? row[1] : '',
      price: price,
      previousClose: previousClose,
      change: change,
      changePercent: previousClose != null && previousClose !== 0 && change != null ? change / previousClose * 100 : null,
      time: formatQuoteTime(row[30])
    };
  }).filter(function (row) { return row !== null; });
}

function isMarketClosed(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return true;
  var day = date.getDay();
  if (day === 0 || day === 6) return true;
  var minutes = date.getHours() * 60 + date.getMinutes();
  return !((minutes >= 570 && minutes < 690) || (minutes >= 780 && minutes < 900));
}

function refreshIntervalMs(value) {
  return Number(value || 5) * 1000;
}

function createWatchlistState(config) {
  var symbols = [];
  var inputs = config && Array.isArray(config.symbols) ? config.symbols : [];
  inputs.forEach(function (input) {
    var symbol = normalizeSymbol(input);
    if (symbol && !symbols.includes(symbol)) symbols.push(symbol);
  });
  return { symbols: symbols, quotes: {}, lastSuccessAt: null, error: null };
}

async function refreshQuotes(symbols, fetchImpl) {
  var list = Array.isArray(symbols) ? symbols.slice() : [symbols];
  list = list.filter(function (symbol) { return typeof symbol === 'string' && symbol; });
  if (!list.length) return { quotes: [], error: null };
  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, 4000);
  try {
    var fetcher = fetchImpl || fetch;
    var response = await fetcher(buildQuoteUrl(list), { signal: controller.signal });
    if (!response || !response.ok) return { quotes: [], error: { type: 'response', message: '行情服务返回错误' } };
    var json = await response.json();
    if (!json || !json.data || typeof json.data !== 'object') {
      return { quotes: [], error: { type: 'response', message: '行情数据格式错误' } };
    }
    var quotes = parseQuoteResponse(json, list);
    if (!quotes.length) return { quotes: [], error: { type: 'response', message: '行情数据为空' } };
    return { quotes: quotes, error: null };
  } catch (error) {
    return { quotes: [], error: { type: 'network', message: error && error.name === 'AbortError' ? '行情请求超时' : '行情连接失败' } };
  } finally {
    clearTimeout(timeout);
  }
}

function escapeQuoteText(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}

function formatQuoteRow(quote) {
  var change = numericValue(quote.change);
  var percent = numericValue(quote.changePercent);
  var direction = change > 0 ? 'quote-up' : change < 0 ? 'quote-down' : '';
  var sign = function (value) { return value > 0 ? '+' : ''; };
  var displaySymbol = String(quote.symbol || '').replace(/^(sh|sz)/i, '').toUpperCase();
  return '<article class="quote-row ' + direction + '" data-symbol="' + escapeQuoteText(quote.symbol) + '">' +
    '<div class="quote-heading"><strong>' + escapeQuoteText(quote.name) + '</strong><span>' + escapeQuoteText(displaySymbol) + '</span></div>' +
    '<div class="quote-values"><span class="quote-price">' + escapeQuoteText(quote.price) + '</span>' +
    '<span>' + escapeQuoteText(change == null ? '--' : sign(change) + change.toFixed(2)) + '</span>' +
    '<span>' + escapeQuoteText(percent == null ? '--' : sign(percent) + percent.toFixed(2) + '%') + '</span></div>' +
    '<time>' + escapeQuoteText(quote.time || '--') + '</time>' +
    '<button type="button" class="remove-symbol" data-symbol="' + escapeQuoteText(quote.symbol) + '">移除</button></article>';
}

async function addSymbol(input, state, resolveSymbol, persistSymbols) {
  var symbol = normalizeSymbol(input);
  if (!symbol) throw new Error('unsupported symbol');
  if (state.symbols.includes(symbol)) throw new Error('duplicate symbol');
  var quote = await resolveSymbol(symbol);
  if (!quote) throw new Error('symbol not found');
  if (persistSymbols) {
    try {
      await persistSymbols(state.symbols.concat(symbol));
    } catch (error) {
      var persistenceError = new Error(error && error.message ? error.message : 'symbol persistence failed');
      persistenceError.code = 'persistence';
      throw persistenceError;
    }
  }
  state.symbols.push(symbol);
  if (Array.isArray(quote)) quote.forEach(function (item) { state.quotes[item.symbol] = item; });
  else state.quotes[symbol] = quote;
}

function removeSymbol(symbol, state) {
  state.symbols = state.symbols.filter(function (item) { return item !== symbol; });
  delete state.quotes[symbol];
}

var quoteApi = {
  normalizeSymbol: normalizeSymbol,
  buildQuoteUrl: buildQuoteUrl,
  parseQuoteResponse: parseQuoteResponse,
  isMarketClosed: isMarketClosed,
  refreshIntervalMs: refreshIntervalMs,
  createWatchlistState: createWatchlistState,
  refreshQuotes: refreshQuotes,
  formatQuoteRow: formatQuoteRow,
  addSymbol: addSymbol,
  removeSymbol: removeSymbol
};

if (typeof module !== 'undefined' && module.exports) module.exports = quoteApi;
