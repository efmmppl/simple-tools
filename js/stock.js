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

// TERMS - 术语大白话解释字典，供 termTip 使用
var TERMS = {
  MA5: '最近 5 天收盘价的平均值，反映本周的平均成本',
  MA10: '最近 10 天收盘价的平均值，反映两周的平均成本',
  MA20: '最近 20 天收盘价的平均值，约等于近一个月大家的平均持仓成本。价格站上它=短线偏强，跌破它=短线转弱',
  MA60: '最近 60 天收盘价的平均值，约等于一个季度的平均成本，用来判断中期趋势',
  RSI: '相对强弱指标，取值 0~100。高于 70 说明短线涨太猛（超买，小心回调），低于 30 说明跌太多（超卖，可能反弹）',
  MACD: '趋势类指标，看 DIF 和 DEA 两条线谁在上：DIF 在上偏多，DEA 在上偏空',
  KDJ: '短线摆动指标，J 值超过 100 算超买（太热），低于 0 算超卖（太冷）',
  ATR: '平均真实波幅：这只股票最近平均每天波动多少钱。越大说明波动越剧烈，常用于估算止损距离',
  布林: '布林带：中轨是 MA20，上下轨是中轨加减 2 倍波动。触上轨=短期偏贵，触下轨=短期偏便宜',
  换手率: '当天成交量 ÷ 流通股数，越高说明交易越活跃。注意：很高也可能是主力出货',
  市盈率: '股价 ÷ 每股收益，粗略理解为「按当前赚钱速度，几年回本」。越低越便宜，但要看同行对比',
  市净率: '股价 ÷ 每股净资产，衡量股价相对「家底」贵不贵，低于 1 说明接近清算价',
  涨停价: '当天最多能涨到的价格。主板 10%、创业板/科创板 20%、ST 股 5%，涨停了买不进',
  跌停价: '当天最多能跌到的价格，跌停了卖不出',
  突破: '价格向上越过前期高点/压力位，放量突破常代表趋势启动',
  破位: '价格跌破关键支撑位，通常意味着上涨趋势被破坏，应及时止损',
  金叉: '短期均线从下方向上穿过长期均线，通常看作买入信号',
  死叉: '短期均线从上方向下穿过长期均线，通常看作卖出信号',
  超买: '指标进入过热区，短期涨太急，追高风险大',
  超卖: '指标进入过冷区，短期跌太狠，可能随时反弹'
};

// termTip - 术语小问号：hover 或点击显示大白话解释
function termTip(label, key) {
  var tip = TERMS[key] || key || '';
  return '<span class="term-tip" tabindex="0"><span>' + escapeHtml(label) + '</span>' +
    '<i class="fas fa-question-circle" aria-hidden="true"></i><span class="term-tip-box">' + escapeHtml(tip) + '</span></span>';
}

// buildAction - 综合价格位置与信号分数，生成大白话行动建议（标题+仓位+理由），同时产出买卖参考卡内的定位句
function buildAction(price, tradeBuyLo, tradeBuyHi, tradeSellLo, tradeSellHi, ind, low20, high20, high60, sig, isEtf) {
  var score = sig.score;
  var act = { cls: 'neutral', title: '', pos: '', reasons: [], posText: '' };

  if (isEtf) {
    var rsi = ind.rsi;
    var boll = ind.boll;
    if (rsi != null && rsi < 30) {
      act.cls = 'bull';
      act.title = '超卖区，可分批低吸';
      act.pos = '低吸（≤20% 资金分批）';
      act.posText = 'RSI 已进入超卖区，可在布林下轨 ' + fmt(boll.lower) + ' 附近分批低吸，越跌越买';
      act.reasons.push('RSI(14)=' + fmt(rsi) + ' 进入超卖区，短线超跌，反弹概率较大');
      act.reasons.push('布林下轨 ' + fmt(boll.lower) + ' 是低吸支撑，跌破则暂缓观望');
    } else if (rsi != null && rsi > 70) {
      act.cls = 'bear';
      act.title = '超买区，可分批高抛';
      act.pos = '减仓或高抛（建议仓位 ≤10%）';
      act.posText = 'RSI 已进入超买区，可向布林上轨 ' + fmt(boll.upper) + ' 分批高抛，越涨越减';
      act.reasons.push('RSI(14)=' + fmt(rsi) + ' 进入超买区，短期涨太急，回调风险上升');
      act.reasons.push('布林上轨 ' + fmt(boll.upper) + ' 是压力位，冲高可分批兑现');
    } else if (boll.lower != null && price <= boll.lower) {
      act.cls = 'bull';
      act.title = '触及布林下轨，可低吸';
      act.pos = '低吸（≤20% 资金分批）';
      act.posText = '价格已回踩布林下轨 ' + fmt(boll.lower) + '，属低位区，可分批低吸';
      act.reasons.push('价格触及布林下轨 ' + fmt(boll.lower) + '，短期偏便宜');
      act.reasons.push('震荡型 ETF 均值回归概率较高，跌深可留意反弹');
    } else if (boll.upper != null && price >= boll.upper) {
      act.cls = 'bear';
      act.title = '触及布林上轨，可高抛';
      act.pos = '减仓或高抛（建议仓位 ≤10%）';
      act.posText = '价格已冲至布林上轨 ' + fmt(boll.upper) + '，属高位区，可分批高抛';
      act.reasons.push('价格触及布林上轨 ' + fmt(boll.upper) + '，短期偏贵');
      act.reasons.push('震荡型 ETF 冲高回落概率较高，注意止盈');
    } else if (boll.mid != null && price < boll.mid) {
      act.cls = 'neutral';
      act.title = '低位震荡，等超卖再低吸';
      act.pos = '轻仓观望（≤10% 资金）';
      act.posText = '价格在布林中轨 ' + fmt(boll.mid) + ' 下方，等 RSI 超卖或回踩下轨再低吸';
      act.reasons.push('价格低于布林中轨 ' + fmt(boll.mid) + '，尚未进入超卖区');
      act.reasons.push('耐心等 RSI(14) 跌破 30 或回踩布林下轨再出手');
    } else {
      act.cls = 'neutral';
      act.title = '中性区间，持有观察';
      act.pos = '持有不动，暂不追高';
      act.posText = '价格在布林中轨附近，无明显超买超卖，持有观察';
      act.reasons.push('价格处于布林中轨 ' + fmt(boll.mid) + ' 附近，方向不明');
      act.reasons.push('震荡型 ETF 追涨杀跌易吃亏，等极端位再操作');
    }
    return act;
  }

  if (price > tradeBuyHi) {
    act.cls = 'bull';
    act.title = '可持有，别追高';
    act.pos = '已持有可继续持有；空仓者等回踩';
    act.posText = '已放量突破近 60 日高点，强势，回踩不破 ' + fmt(tradeBuyLo) + ' 可续持';
    act.reasons.push('价格已放量突破近 60 日高点 ' + fmt(high60) + '，走势很强');
    act.reasons.push('回踩不破 ' + fmt(tradeBuyLo) + ' 可继续持有，跌破再走');
  } else if (price > tradeBuyLo) {
    act.cls = 'bull';
    act.title = score >= 2 ? '可买入（信号配合）' : '可轻仓试错买入';
    act.pos = score >= 2 ? '半仓试错（≤30% 资金）' : '轻仓试错（≤10% 资金）';
    act.posText = '已突破近 20 日高点，属右侧买点，上方看 ' + fmt(tradeBuyHi) + '，跌破 ' + fmt(tradeBuyLo) + ' 则失效';
    act.reasons.push('价格放量突破近 20 日高点 ' + fmt(high20) + '，是右侧买点');
    act.reasons.push('上方空间看近 60 日高点 ' + fmt(high60) + '，跌回 ' + fmt(tradeBuyLo) + ' 下方则买入无效');
  } else if (price >= tradeSellHi) {
    act.cls = 'neutral';
    act.title = '持有观察，暂不加仓';
    act.pos = '已持有拿着；空仓等突破';
    act.posText = '站上 MA20 但未突破前高，持有观察，放量突破 ' + fmt(tradeBuyLo) + ' 再加仓';
    act.reasons.push('价格站上 MA20（' + fmt(ind.ma20) + '），趋势没坏');
    act.reasons.push('等放量突破 ' + fmt(tradeBuyLo) + ' 再考虑加仓');
  } else if (price > tradeSellLo) {
    act.cls = 'bear';
    act.title = '减仓为主，别急着补';
    act.pos = '减仓或清仓（建议仓位 ≤10%）';
    act.posText = '跌破 MA20 转弱，反弹至 ' + fmt(tradeSellHi) + ' 受阻可减仓，失守 ' + fmt(tradeSellLo) + ' 则离场';
    act.reasons.push('价格跌破 MA20（' + fmt(ind.ma20) + '），短线转弱');
    act.reasons.push('反弹到 ' + fmt(tradeSellHi) + ' 附近受阻可减仓，失守 ' + fmt(tradeSellLo) + ' 就离场');
  } else {
    act.cls = 'bear';
    act.title = '建议离场，等企稳再看';
    act.pos = '空仓观望';
    act.posText = '已跌破近 20 日低点，右侧破位离场，等待企稳再考虑';
    act.reasons.push('价格已跌破近 20 日低点 ' + fmt(low20) + '，破位信号明确');
    act.reasons.push('等重新站上 ' + fmt(tradeSellLo) + ' 并企稳再考虑');
  }
  return act;
}

// renderStock - 组装完整结果 HTML
function renderStock(name, symbol, qt, klines, closes, ind, sig, isEtf) {
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
    var tipKey = { '均线排列': 'MA20', '价格位置': 'MA20', 'MA 交叉': '金叉', 'RSI(14)': 'RSI', 'MACD': 'MACD', 'KDJ': 'KDJ' }[it[0]];
    var nameHtml = tipKey ? termTip(it[0], tipKey) : escapeHtml(it[0]);
    return '<div class="stock-sig-item"><span class="stock-sig-name">' + nameHtml + '</span>' +
      '<span class="stock-sig-val ' + cls + '">' + escapeHtml(it[1]) + '</span></div>';
  }).join('');

  var html = '';

  var tradeBuyLo = high20;
  var tradeBuyHi = high60;
  var tradeSellLo = Math.min(low20, ind.ma20);
  var tradeSellHi = Math.max(low20, ind.ma20);
  var action = buildAction(price, tradeBuyLo, tradeBuyHi, tradeSellLo, tradeSellHi, ind, low20, high20, high60, sig, isEtf);

  html += '<div class="stock-action ' + action.cls + '">';
  html += '<div class="stock-action-title">' + action.title + '</div>';
  html += '<div class="stock-action-pos">' + action.pos + '</div>';
  html += '<ul class="stock-action-reasons">' + action.reasons.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>';
  html += '</div>';

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
  html += '<div class="stock-meta"><span class="k">' + termTip('换手率', '换手率') + '</span><span class="v">' + fmt(qt[38]) + '%</span></div>';
  html += '<div class="stock-meta"><span class="k">' + termTip('市盈率', '市盈率') + '</span><span class="v">' + fmt(qt[39]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">' + termTip('市净率', '市净率') + '</span><span class="v">' + fmt(qt[46]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">总市值</span><span class="v">' + fmtMarketCap(parseFloat(qt[45])) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">流通市值</span><span class="v">' + fmtMarketCap(parseFloat(qt[44])) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">' + termTip('涨停价', '涨停价') + '</span><span class="v">' + fmt(qt[47]) + '</span></div>';
  html += '<div class="stock-meta"><span class="k">' + termTip('跌停价', '跌停价') + '</span><span class="v">' + fmt(qt[48]) + '</span></div>';
  html += '</div></div>';

  html += '<div class="stock-section">';
  html += '<div class="ts-card"><div class="ts-card-title"><i class="fas fa-gavel" style="margin-right:6px"></i> 综合信号</div>';
  html += '<div class="stock-conclusion ' + sig.conclusion.cls + '">' + sig.conclusion.text + '</div>';
  html += '<div class="stock-sig-list">' + sigItems + '</div>';
  html += '<div style="margin-top:10px;font-size:0.75rem;color:var(--text-faint)">基于均线、RSI、MACD、KDJ 等简单技术规则打分（' + fmt(sig.score, 1) + ' 分），仅供参考，不构成投资建议。</div>';
  html += '</div></div>';

  var posText = action.posText;
  var posCls = action.cls;

  html += '<div class="stock-section">';
  html += '<div class="ts-card"><div class="ts-card-title"><i class="fas fa-balance-scale" style="margin-right:6px"></i> 买卖参考</div>';
  html += '<div class="stock-trade-pos ' + posCls + '">当前价 <b>' + fmt(price) + '</b>：' + posText + '</div>';
  html += '<div class="stock-trade-grid">';
  if (isEtf) {
    var etfBuyLo = ind.boll.lower, etfBuyHi = ind.boll.mid;
    var etfSellLo = ind.boll.mid, etfSellHi = ind.boll.upper;
    html += '<div class="stock-trade buy"><div class="stock-trade-tag">' + termTip('低吸买入区', '超卖') + '</div>' +
      '<div class="stock-trade-range">' + fmt(etfBuyLo) + ' ~ ' + fmt(etfBuyHi) + '</div>' +
      '<div class="stock-trade-note">RSI(14) 跌破 30 或价格回踩布林下轨（' + fmt(ind.boll.lower) + '）时可分批低吸，越接近下轨越便宜。</div></div>';
    html += '<div class="stock-trade sell"><div class="stock-trade-tag">' + termTip('高抛减仓区', '超买') + '</div>' +
      '<div class="stock-trade-range">' + fmt(etfSellLo) + ' ~ ' + fmt(etfSellHi) + '</div>' +
      '<div class="stock-trade-note">RSI(14) 升破 70 或价格冲至布林上轨（' + fmt(ind.boll.upper) + '）时可分批高抛，越接近上轨越贵。</div></div>';
  } else {
    html += '<div class="stock-trade buy"><div class="stock-trade-tag">' + termTip('突破买入区', '突破') + '</div>' +
      '<div class="stock-trade-range">' + fmt(tradeBuyLo) + ' ~ ' + fmt(tradeBuyHi) + '</div>' +
      '<div class="stock-trade-note">放量' + termTip('突破', '突破') + '近 20 日高点（' + fmt(high20) + '）且站稳时可右侧跟进买入，上方看近 60 日高点（' + fmt(high60) + '）；缩量假突破则放弃。</div></div>';
    html += '<div class="stock-trade sell"><div class="stock-trade-tag">' + termTip('破位卖出区', '破位') + '</div>' +
      '<div class="stock-trade-range">' + fmt(tradeSellLo) + ' ~ ' + fmt(tradeSellHi) + '</div>' +
      '<div class="stock-trade-note">跌破 MA20（' + fmt(ind.ma20) + '）短线转弱应减仓，失守近 20 日低点（' + fmt(low20) + '）视为' + termTip('破位', '破位') + '离场信号。</div></div>';
    if (ind.boll.upper != null || ind.boll.lower != null) {
      html += '<div class="stock-trade"><div class="stock-trade-tag">布林极端位</div>' +
        '<div class="stock-trade-note">触及布林上轨（' + fmt(ind.boll.upper) + '）偏超买，追高谨慎；触及布林下轨（' + fmt(ind.boll.lower) + '）偏超卖，留意跌深反弹。</div></div>';
    }
  }
  html += '</div>';
  if (isEtf) {
    html += '<div style="margin-top:10px;font-size:0.75rem;color:var(--text-faint)">区间基于均值回归低吸高抛策略，由布林带与 RSI 超买超卖区估算，更适合震荡型 ETF，仅供参考，不构成投资建议。</div>';
  } else {
    html += '<div style="margin-top:10px;font-size:0.75rem;color:var(--text-faint)">区间基于 A 股右侧突破/破位策略，由近 20/60 日高低点与 MA20 估算，仅供参考，不构成投资建议。</div>';
  }
  html += '</div></div>';

  html += '<div class="stock-section">';
  html += '<div class="ts-card"><div class="ts-card-title"><i class="fas fa-shield-alt" style="margin-right:6px"></i> 止损与支撑压力</div>';
  html += '<div class="stock-risk-grid">';
  html += '<div class="stock-risk"><span class="k">' + termTip('ATR 止损（现价−2×ATR）', 'ATR') + '</span><span class="v">' + fmt(atrStop) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">' + termTip('建议止损（取 ATR 与 20 日低点较高者）', 'ATR') + '</span><span class="v">' + fmt(recStop) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">' + termTip('MA20 动态止损参考', 'MA20') + '</span><span class="v">' + fmt(ind.ma20) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">支撑位 · 近20日低点</span><span class="v">' + fmt(low20) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">支撑位 · 近60日低点</span><span class="v">' + fmt(low60) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">压力位 · 近20日高点</span><span class="v">' + fmt(high20) + '</span></div>';
  html += '<div class="stock-risk"><span class="k">压力位 · 近60日高点</span><span class="v">' + fmt(high60) + '</span></div>';
  html += '</div></div></div>';

  html += '<div class="stock-section">';
  html += '<div class="ts-card"><div class="ts-card-title"><i class="fas fa-chart-line" style="margin-right:6px"></i> 技术指标</div>';
  html += '<div class="stock-ind-grid">';
  html += '<div class="stock-ind"><span class="k">' + termTip('MA5', 'MA5') + '</span><span class="v">' + fmt(ind.ma5) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('MA10', 'MA10') + '</span><span class="v">' + fmt(ind.ma10) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('MA20', 'MA20') + '</span><span class="v">' + fmt(ind.ma20) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('MA60', 'MA60') + '</span><span class="v">' + fmt(ind.ma60) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('RSI(14)', 'RSI') + '</span><span class="v">' + fmt(ind.rsi) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('MACD·DIF', 'MACD') + '</span><span class="v">' + fmt(ind.dif) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('MACD·DEA', 'MACD') + '</span><span class="v">' + fmt(ind.dea) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('MACD·柱', 'MACD') + '</span><span class="v">' + fmt(ind.hist) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('KDJ·K', 'KDJ') + '</span><span class="v">' + fmt(ind.k) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('KDJ·D', 'KDJ') + '</span><span class="v">' + fmt(ind.d) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('KDJ·J', 'KDJ') + '</span><span class="v">' + fmt(ind.j) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('ATR(14)', 'ATR') + '</span><span class="v">' + fmt(ind.atr) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('布林上轨', '布林') + '</span><span class="v">' + fmt(ind.boll.upper) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('布林中轨', '布林') + '</span><span class="v">' + fmt(ind.boll.mid) + '</span></div>';
  html += '<div class="stock-ind"><span class="k">' + termTip('布林下轨', '布林') + '</span><span class="v">' + fmt(ind.boll.lower) + '</span></div>';
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
    var isEtf = /ETF/i.test(name);

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
    resultEl.innerHTML = renderStock(name, symbol, d.qt, klines, closes, ind, sig, isEtf);
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
