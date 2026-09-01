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
  if (value === '' || value == null) return null;
  var number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatQuoteTime(value) {
  if (typeof value !== 'string' || !/^\d{14}$/.test(value)) return null;
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

module.exports = {
  normalizeSymbol: normalizeSymbol,
  buildQuoteUrl: buildQuoteUrl,
  parseQuoteResponse: parseQuoteResponse,
  isMarketClosed: isMarketClosed
};
