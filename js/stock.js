// normalizeSymbol - 规范化股票代码为腾讯接口前缀格式（sh/sz/bj + 6 位数字）
function normalizeSymbol(input) {
  var s = String(input || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/^(sh|sz|bj)\d{6}$/.test(s)) return s;
  if (/^\d{6}$/.test(s)) {
    if (s[0] === '6' || s[0] === '5') return 'sh' + s;
    if (s[0] === '0' || s[0] === '3' || s[0] === '1' || s[0] === '2') return 'sz' + s;
    if (s[0] === '4' || s[0] === '8' || s[0] === '9') return 'bj' + s;
  }
  return null;
}

// fmt - 数值格式化，保留指定位数，空值返回占位符
function fmt(v, digits) {
  if (v == null || isNaN(v)) return '-';
  return Number(v).toFixed(digits == null ? 2 : digits);
}

// fmtMarketCap - 市值（亿）格式化为「亿 / 万亿」
function fmtMarketCap(yi) {
  if (yi == null || isNaN(yi)) return '-';
  if (yi >= 10000) return (yi / 10000).toFixed(2) + ' 万亿';
  return Number(yi).toFixed(2) + ' 亿';
}

// formatStockTime - 将 yyyymmddHHMMSS 转为可读时间
function formatStockTime(ts) {
  if (!ts || ts.length < 14) return '-';
  return ts.slice(0, 4) + '-' + ts.slice(4, 6) + '-' + ts.slice(6, 8) + ' ' + ts.slice(8, 10) + ':' + ts.slice(10, 12) + ':' + ts.slice(12, 14);
}

// calcMA - 简单移动平均，返回与输入等长数组，前 n-1 项为 null
function calcMA(closes, n) {
  var out = [];
  for (var i = 0; i < closes.length; i++) {
    if (i < n - 1) { out.push(null); continue; }
    var sum = 0;
    for (var j = i - n + 1; j <= i; j++) sum += closes[j];
    out.push(sum / n);
  }
  return out;
}

// calcEMA - 指数移动平均
function calcEMA(values, n) {
  var out = [];
  var ema = values[0];
  var k = 2 / (n + 1);
  for (var i = 0; i < values.length; i++) {
    if (i === 0) { out.push(ema); continue; }
    ema = values[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

// calcRSI - 相对强弱指标，返回最新 RSI 值（简单移动平均法）
function calcRSI(closes, n) {
  if (closes.length <= n) return null;
  var gains = 0, losses = 0;
  for (var i = closes.length - n; i < closes.length; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  if (losses === 0) return 100;
  return 100 - 100 / (1 + gains / losses);
}

// calcMACD - MACD(12,26,9)，返回 dif/dea/hist 数组
function calcMACD(closes) {
  var ema12 = calcEMA(closes, 12);
  var ema26 = calcEMA(closes, 26);
  var dif = [], dea, hist = [];
  for (var i = 0; i < closes.length; i++) dif.push(ema12[i] - ema26[i]);
  dea = calcEMA(dif, 9);
  for (var j = 0; j < closes.length; j++) hist.push(2 * (dif[j] - dea[j]));
  return { dif: dif, dea: dea, hist: hist };
}

// calcKDJ - KDJ(9,3,3)，返回 K/D/J 数组，klines 元素为 [日期,开,收,高,低,量]
function calcKDJ(klines, n) {
  var K = [], D = [], J = [];
  var k = 50, d = 50;
  for (var i = 0; i < klines.length; i++) {
    var high = -Infinity, low = Infinity;
    for (var j = Math.max(0, i - n + 1); j <= i; j++) {
      if (klines[j][3] > high) high = klines[j][3];
      if (klines[j][4] < low) low = klines[j][4];
    }
    var rsv = (high === low) ? 50 : (klines[i][2] - low) / (high - low) * 100;
    k = 2 / 3 * k + 1 / 3 * rsv;
    d = 2 / 3 * d + 1 / 3 * k;
    K.push(k); D.push(d); J.push(3 * k - 2 * d);
  }
  return { K: K, D: D, J: J };
}

// calcATR - 平均真实波幅（简单平均），返回最新 ATR 值
function calcATR(klines, n) {
  if (klines.length < n) return null;
  var sum = 0;
  for (var i = klines.length - n; i < klines.length; i++) {
    var high = klines[i][3], low = klines[i][4];
    var prevClose = i === 0 ? klines[i][1] : klines[i - 1][2];
    var tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    sum += tr;
  }
  return sum / n;
}

// calcBoll - 布林带(20,2)，返回上/中/下轨
function calcBoll(closes, n) {
  var ma = calcMA(closes, n);
  var mid = ma[ma.length - 1];
  if (mid == null) return { upper: null, mid: null, lower: null };
  var win = closes.slice(-n);
  var mean = win.reduce(function (a, b) { return a + b; }, 0) / n;
  var variance = win.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / n;
  var std = Math.sqrt(variance);
  return { upper: mid + 2 * std, mid: mid, lower: mid - 2 * std };
}

// buildSignal - 基于各指标打分，返回结论与明细
function buildSignal(closes, klines, ind) {
  var price = closes[closes.length - 1];
  var score = 0;
  var items = [];

  var arrBull = ind.ma5 > ind.ma10 && ind.ma10 > ind.ma20;
  var arrBear = ind.ma5 < ind.ma10 && ind.ma10 < ind.ma20;
  if (arrBull) { score += 1.5; items.push(['均线排列', 'MA5>MA10>MA20 多头', 'bull']); }
  else if (arrBear) { score -= 1.5; items.push(['均线排列', 'MA5<MA10<MA20 空头', 'bear']); }
  else items.push(['均线排列', '均线纠缠，趋势不明', 'neutral']);

  if (ind.ma20 != null) {
    if (price > ind.ma20) { score += 0.5; items.push(['价格位置', '站上 MA20 支撑', 'bull']); }
    else { score -= 0.5; items.push(['价格位置', '跌破 MA20 支撑', 'bear']); }
  }

  if (ind.cross === 'gold') { score += 1; items.push(['MA 交叉', 'MA5 近日上穿 MA20（金叉）', 'bull']); }
  else if (ind.cross === 'dead') { score -= 1; items.push(['MA 交叉', 'MA5 近日下穿 MA20（死叉）', 'bear']); }

  if (ind.rsi != null) {
    if (ind.rsi < 30) { score += 0.5; items.push(['RSI(14)', fmt(ind.rsi) + ' 超卖，或存反弹', 'bull']); }
    else if (ind.rsi > 70) { score -= 1; items.push(['RSI(14)', fmt(ind.rsi) + ' 超买，追高谨慎', 'bear']); }
    else items.push(['RSI(14)', fmt(ind.rsi) + ' 中性区间', 'neutral']);
  }

  if (ind.dif != null && ind.dea != null) {
    if (ind.dif > ind.dea) { score += 1; items.push(['MACD', 'DIF 在 DEA 上方（偏多）', 'bull']); }
    else { score -= 1; items.push(['MACD', 'DIF 在 DEA 下方（偏空）', 'bear']); }
  }

  if (ind.k != null && ind.d != null) {
    if (ind.j < 0) { score += 0.5; items.push(['KDJ', 'J=' + fmt(ind.j) + ' 超卖区', 'bull']); }
    else if (ind.j > 100) { score -= 1; items.push(['KDJ', 'J=' + fmt(ind.j) + ' 超买区', 'bear']); }
    else if (ind.k > ind.d) { score += 0.5; items.push(['KDJ', 'K 在 D 上方（偏多）', 'bull']); }
    else { score -= 0.5; items.push(['KDJ', 'K 在 D 下方（偏空）', 'bear']); }
  }

  var conclusion;
  if (score >= 2) conclusion = { text: '偏多 · 可关注', cls: 'bull' };
  else if (score <= -2) conclusion = { text: '偏空 · 观望', cls: 'bear' };
  else conclusion = { text: '中性 · 震荡', cls: 'neutral' };

  return { score: score, items: items, conclusion: conclusion };
}

// renderStock - 组装完整结果 HTML
function renderStock(name, symbol, qt, klines, closes, ind, sig) {
  var price = parseFloat(qt[3]);
  var diff = parseFloat(qt[31]);
  var upCls = diff >= 0 ? 'up' : 'down';
  var diffSign = diff >= 0 ? '+' : '';
  var time = formatStockTime(qt[30]);

  var i;
  var low20 = Infinity, high20 = -Infinity, low60 = Infinity, high60 = -Infinity;
  for (i = klines.length - 20; i < klines.length; i++) {
    if (klines[i][4] < low20) low20 = klines[i][4];
    if (klines[i][3] > high20) high20 = klines[i][3];
  }
  for (i = klines.length - 60; i < klines.length; i++) {
    if (klines[i][4] < low60) low60 = klines[i][4];
    if (klines[i][3] > high60) high60 = klines[i][3];
  }

  var atrStop = ind.atr != null ? price - 2 * ind.atr : null;
  var recStop = atrStop != null ? Math.max(atrStop, low20) : null;

  var sigItems = sig.items.map(function (it) {
    var cls = it[2] === 'bull' ? 'bull' : it[2] === 'bear' ? 'bear' : 'neutral';
    return '<div class="stock-sig-item"><span class="stock-sig-name">' + escapeHtml(it[0]) + '</span>' +
      '<span class="stock-sig-val ' + cls + '">' + escapeHtml(it[1]) + '</span></div>';
  }).join('');

  var html = '';

  html += '<div class="stock-quote ' + upCls + '">';
  html += '<div class="stock-quote-head">';
  html += '<span class="stock-quote-name">' + escapeHtml(name) + '</span>';
  html += '<span class="stock-quote-symbol">' + escapeHtml(symbol.toUpperCase()) + '</span>';
  html += '<span class="stock-quote-time">' + time + '</span>';
  html += '</div>';
  html += '<div class="stock-quote-price">' + fmt(price) + '</div>';
  html += '<div class="stock-quote-change">' + diffSign + fmt(diff) + ' (' + diffSign + fmt(qt[32]) + '%)</div>';
  html += '<div class="stock-quote-grid">';
  html += '<div class="stock-meta"><span class="k">今开</span><span class="v">' + fmt(qt[5]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">最高</span><span class="v">' + fmt(qt[33]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">最低</span><span class="v">' + fmt(qt[34]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">昨收</span><span class="v">' + fmt(qt[4]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">成交量</span><span class="v">' + fmt(qt[6] / 10000) + ' 万手</span></div>';
  html += '<div class="stock-meta"><span class="k">成交额</span><span class="v">' + fmt(qt[37] / 10000) + ' 亿</span></div>';
  html += '<div class="stock-meta"><span class="k">换手率</span><span class="v">' + fmt(qt[38]) + '%</span></div>';
  html += '<div class="stock-meta"><span class="k">市盈率</span><span class="v">' + fmt(qt[39]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">市净率</span><span class="v">' + fmt(qt[46]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">总市值</span><span class="v">' + fmtMarketCap(parseFloat(qt[45])) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">流通市值</span><span class="v">' + fmtMarketCap(parseFloat(qt[44])) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">涨停价</span><span class="v">' + fmt(qt[47]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">跌停价</span><span class="v">' + fmt(qt[48]) + '</span></div>';
  html += '</div></div>';

  html += '<div class="stock-section">';
  html += '<div class="ts-card"><div class="ts-card-title"><i class="fas fa-gavel" style="margin-right:6px"></i> 综合信号</div>';
  html += '<div class="stock-conclusion ' + sig.conclusion.cls + '">' + sig.conclusion.text + '</div>';
  html += '<div class="stock-sig-list">' + sigItems + '</div>';
  html += '<div style="margin-top:10px;font-size:0.75rem;color:var(--text-faint)">基于均线、RSI、MACD、KDJ 等简单技术规则打分（' + fmt(sig.score, 1) + ' 分），仅供参考，不构成投资建议。</div>';
  html += '</div></div>';

  html += '<div class="stock-section">';
  html += '<div class="ts-card"><div class="ts-card-title"><i class="fas fa-chart-line" style="margin-right:6px"></i> 技术指标</div>';
  html += '<div class="stock-ind-grid">';
  html += '<div class="stock-ind"><span class="k">MA5</span><span class="v">' + fmt(ind.ma5) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">MA10</span><span class="v">' + fmt(ind.ma10) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">MA20</span><span class="v">' + fmt(ind.ma20) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">MA60</span><span class="v">' + fmt(ind.ma60) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">RSI(14)</span><span class="v">' + fmt(ind.rsi) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">MACD·DIF</span><span class="v">' + fmt(ind.dif) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">MACD·DEA</span><span class="v">' + fmt(ind.dea) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">MACD·柱</span><span class="v">' + fmt(ind.hist) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">KDJ·K</span><span class="v">' + fmt(ind.k) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">KDJ·D</span><span class="v">' + fmt(ind.d) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">KDJ·J</span><span class="v">' + fmt(ind.j) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">ATR(14)</span><span class="v">' + fmt(ind.atr) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">布林上轨</span><span class="v">' + fmt(ind.boll.upper) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">布林中轨</span><span class="v">' + fmt(ind.boll.mid) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">布林下轨</span><span class="v">' + fmt(ind.boll.lower) + '</span></div>';
  html += '</div></div></div>';

  html += '<div class="stock-section">';
  html += '<div class="ts-card"><div class="ts-card-title"><i class="fas fa-shield-alt" style="margin-right:6px"></i> 止损与支撑压力</div>';
  html += '<div class="stock-risk-grid">';
  html += '<div class="stock-risk"><span class="k">ATR 止损（现价−2×ATR）</span><span class="v">' + fmt(atrStop) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">建议止损（取 ATR 与 20 日低点较高者）</span><span class="v">' + fmt(recStop) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">MA20 动态止损参考</span><span class="v">' + fmt(ind.ma20) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">支撑位 · 近20日低点</span><span class="v">' + fmt(low20) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">支撑位 · 近60日低点</span><span class="v">' + fmt(low60) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">压力位 · 近20日高点</span><span class="v">' + fmt(high20) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">压力位 · 近60日高点</span><span class="v">' + fmt(high60) + '</span></div>';
  html += '</div></div></div>';

  return html;
}

// analyzeStock - 主流程：校验输入、拉取数据、计算指标、渲染
function analyzeStock() {
  var inputEl = document.getElementById('stockCode');
  var errEl = document.getElementById('stockError');
  var resultEl = document.getElementById('stockResult');
  var statusEl = document.getElementById('stockStatus');
  var symbol = normalizeSymbol(inputEl.value);

  errEl.textContent = '';
  errEl.style.display = 'none';
  if (!symbol) {
    errEl.textContent = '代码无效：请输入 6 位股票代码（如 600519）或带前缀（如 sh600519）';
    errEl.style.display = 'block';
    return;
  }
  if (symbol.indexOf('bj') === 0) {
    errEl.textContent = '暂不支持北交所股票，请输入沪/深 A 股代码';
    errEl.style.display = 'block';
    return;
  }

  statusEl.textContent = '加载中...';
  resultEl.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>正在获取行情数据...</div>';

  var url = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=' + symbol + ',day,,,120,qfq';
  fetch(url).then(function (res) {
    if (!res.ok) throw new Error('网络错误');
    return res.json();
  }).then(function (json) {
    var node = json && json.data && json.data[symbol];
    if (!node) throw new Error('未找到该股票数据');
    var klines = node.qfqday || node.day;
    var qt = node.qt && node.qt[symbol];
    if (!klines || !klines.length || !qt) throw new Error('该股票暂无行情数据');
    return { node: node, klines: klines, qt: qt };
  }).then(function (d) {
    var klines = d.klines;
    var closes = klines.map(function (k) { return parseFloat(k[2]); });
    var name = d.qt[1];

    var ma5 = calcMA(closes, 5), ma10 = calcMA(closes, 10), ma20 = calcMA(closes, 20), ma60 = calcMA(closes, 60);
    var macd = calcMACD(closes);
    var kdj = calcKDJ(klines, 9);
    var last = closes.length - 1;

    var ind = {
      ma5: ma5[last], ma10: ma10[last], ma20: ma20[last], ma60: ma60[last],
      rsi: calcRSI(closes, 14),
      dif: macd.dif[last], dea: macd.dea[last], hist: macd.hist[last],
      k: kdj.K[last], d: kdj.D[last], j: kdj.J[last],
      atr: calcATR(klines, 14),
      boll: calcBoll(closes, 20),
      cross: 'none'
    };

    var crossed = false;
    for (var i = last; i >= Math.max(0, last - 3); i--) {
      if (ma5[i] == null || ma20[i] == null || i === 0) continue;
      var prev = i - 1;
      if (ma5[prev] == null || ma20[prev] == null) continue;
      if (ma5[prev] <= ma20[prev] && ma5[i] > ma20[i]) { ind.cross = 'gold'; crossed = true; break; }
      if (ma5[prev] >= ma20[prev] && ma5[i] < ma20[i]) { ind.cross = 'dead'; crossed = true; break; }
    }
    if (!crossed) ind.cross = 'none';

    var sig = buildSignal(closes, klines, ind);
    resultEl.innerHTML = renderStock(name, symbol, d.qt, klines, closes, ind, sig);
    statusEl.textContent = '已更新 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
  }).catch(function (e) {
    statusEl.textContent = '加载失败';
    errEl.textContent = '获取数据失败：' + e.message + '（可尝试换用本地服务器访问，避免网络限制）';
    errEl.style.display = 'block';
    resultEl.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>暂无数据</div>';
  });
}

// 事件绑定：点击分析按钮、输入框回车
document.getElementById('stockAnalyzeBtn').addEventListener('click', analyzeStock);
document.getElementById('stockCode').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') analyzeStock();
});
