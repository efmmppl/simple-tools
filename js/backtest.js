// 量化回测工具：拉取历史前复权日K，按策略模拟买卖，统计收益/回撤/胜率并对比买入持有
// 复用 js/stock.js 的 normalizeSymbol / fmt / calcMA / calcEMA（script 顺序在 stock.js 之后）

// rsiSeries - RSI 序列（简单平均法），前 n 项为 null
function rsiSeries(closes, n) {
  var out = [];
  for (var i = 0; i < closes.length; i++) {
    if (i < n) { out.push(null); continue; }
    var gains = 0, losses = 0;
    for (var j = i - n + 1; j <= i; j++) {
      var diff = closes[j] - closes[j - 1];
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    out.push(losses === 0 ? 100 : 100 - 100 / (1 + gains / losses));
  }
  return out;
}

// macdSeries - MACD 序列（可调参数），返回 dif/dea/hist 数组
function macdSeries(closes, fast, slow, signal) {
  var emaF = calcEMA(closes, fast);
  var emaS = calcEMA(closes, slow);
  var dif = [];
  for (var i = 0; i < closes.length; i++) dif.push(emaF[i] - emaS[i]);
  var dea = calcEMA(dif, signal);
  var hist = [];
  for (var j = 0; j < closes.length; j++) hist.push(2 * (dif[j] - dea[j]));
  return { dif: dif, dea: dea, hist: hist };
}

// bollSeries - 布林带序列，返回 upper/mid/lower 数组（前 n-1 项 null）
function bollSeries(closes, n, mult) {
  var mid = calcMA(closes, n);
  var upper = [], lower = [];
  for (var i = 0; i < closes.length; i++) {
    if (i < n - 1) { upper.push(null); lower.push(null); continue; }
    var sum = 0;
    for (var j = i - n + 1; j <= i; j++) sum += closes[j];
    var mean = sum / n;
    var variance = 0;
    for (var k = i - n + 1; k <= i; k++) variance += (closes[k] - mean) * (closes[k] - mean);
    var std = Math.sqrt(variance / n);
    upper.push(mid[i] + mult * std);
    lower.push(mid[i] - mult * std);
  }
  return { upper: upper, mid: mid, lower: lower };
}

// 信号数组约定：1=买入，-1=卖出，0=观望；第 i 天收盘产生信号，第 i+1 天开盘成交

// signalsMA - 双均线金叉买入、死叉卖出
function signalsMA(closes, short, long) {
  var s = calcMA(closes, short);
  var l = calcMA(closes, long);
  var sig = [];
  for (var i = 0; i < closes.length; i++) {
    sig.push(0);
    if (i === 0 || s[i] == null || l[i] == null || s[i - 1] == null || l[i - 1] == null) continue;
    if (s[i - 1] <= l[i - 1] && s[i] > l[i]) sig[i] = 1;
    else if (s[i - 1] >= l[i - 1] && s[i] < l[i]) sig[i] = -1;
  }
  return sig;
}

// signalsRSI - RSI 跌破买入阈值买入、升破卖出阈值卖出
function signalsRSI(closes, n, buyTh, sellTh) {
  var rsi = rsiSeries(closes, n);
  var sig = [];
  for (var i = 0; i < closes.length; i++) {
    sig.push(0);
    if (rsi[i] == null) continue;
    if (i > 0 && rsi[i - 1] != null) {
      if (rsi[i - 1] >= buyTh && rsi[i] < buyTh) sig[i] = 1;
      else if (rsi[i - 1] <= sellTh && rsi[i] > sellTh) sig[i] = -1;
    } else {
      if (rsi[i] < buyTh) sig[i] = 1;
      else if (rsi[i] > sellTh) sig[i] = -1;
    }
  }
  return sig;
}

// signalsBoll - 收盘跌破下轨买入、升破上轨卖出
function signalsBoll(closes, n, mult) {
  var b = bollSeries(closes, n, mult);
  var sig = [];
  for (var i = 0; i < closes.length; i++) {
    sig.push(0);
    if (i === 0 || b.upper[i] == null || b.upper[i - 1] == null) continue;
    if (closes[i - 1] >= b.lower[i - 1] && closes[i] < b.lower[i]) sig[i] = 1;
    else if (closes[i - 1] <= b.upper[i - 1] && closes[i] > b.upper[i]) sig[i] = -1;
  }
  return sig;
}

// signalsMACD - DIF 上穿 DEA 买入、下穿卖出
function signalsMACD(closes, fast, slow, signal) {
  var m = macdSeries(closes, fast, slow, signal);
  var sig = [];
  for (var i = 0; i < closes.length; i++) {
    sig.push(0);
    if (i === 0) continue;
    if (m.dif[i - 1] <= m.dea[i - 1] && m.dif[i] > m.dea[i]) sig[i] = 1;
    else if (m.dif[i - 1] >= m.dea[i - 1] && m.dif[i] < m.dea[i]) sig[i] = -1;
  }
  return sig;
}

// runBacktest - 回测引擎：逐日遍历，信号次日开盘成交，按金额全仓（非整手）
function runBacktest(klines, signals, cfg) {
  var cash = cfg.capital;
  var shares = 0;
  var trades = [];
  var equity = [];
  for (var i = 0; i < klines.length; i++) {
    var open = klines[i][1];
    var close = klines[i][2];
    var date = klines[i][0];
    if (i > 0) {
      var sig = signals[i - 1];
      if (sig === 1 && shares === 0) {
        shares = cash / (open * (1 + cfg.commission));
        trades.push({ type: 'buy', date: date, price: open, shares: shares, amount: cash });
        cash = 0;
      } else if (sig === -1 && shares > 0) {
        var proceeds = shares * open * (1 - cfg.commission - cfg.stamp);
        cash = proceeds;
        trades.push({ type: 'sell', date: date, price: open, shares: shares, amount: shares * open, proceeds: proceeds });
        shares = 0;
      }
    }
    equity.push(cash + shares * close);
  }
  var finalValue = cash + shares * klines[klines.length - 1][2];
  return { finalValue: finalValue, trades: trades, equity: equity };
}

// computeStats - 计算绩效指标与已完成交易明细
function computeStats(klines, result, cfg) {
  var capital = cfg.capital;
  var totalReturn = (result.finalValue - capital) / capital;
  var annual = Math.pow(1 + totalReturn, 365 / klines.length) - 1;

  var maxDD = 0, peak = -Infinity;
  for (var i = 0; i < result.equity.length; i++) {
    if (result.equity[i] > peak) peak = result.equity[i];
    var dd = peak > 0 ? (peak - result.equity[i]) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  var completed = [];
  var buys = [];
  result.trades.forEach(function (tr) {
    if (tr.type === 'buy') buys.push(tr);
    else if (tr.type === 'sell' && buys.length > 0) {
      var b = buys.shift();
      var pnl = tr.proceeds - b.amount;
      completed.push({ buyDate: b.date, sellDate: tr.date, buyPrice: b.price, sellPrice: tr.price, pnlPct: pnl / b.amount });
    }
  });

  var wins = 0, totalPnl = 0;
  completed.forEach(function (c) { if (c.pnlPct > 0) wins++; totalPnl += c.pnlPct; });
  var winRate = completed.length > 0 ? wins / completed.length : 0;
  var avgPnl = completed.length > 0 ? totalPnl / completed.length : 0;
  var buyHold = klines[klines.length - 1][2] / klines[0][1] - 1;

  return {
    finalValue: result.finalValue, totalReturn: totalReturn, annual: annual, maxDD: maxDD,
    tradeCount: completed.length, winRate: winRate, avgPnl: avgPnl, buyHold: buyHold,
    completed: completed
  };
}

// btPct - 百分比格式化（带正负号）
function btPct(v) {
  if (v == null || isNaN(v)) return '-';
  return (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + '%';
}

// btCls - 依据正负返回涨跌色类
function btCls(v) {
  return v >= 0 ? 'up' : 'down';
}

// renderBacktest - 组装各策略结果卡片
function renderBacktest(symbol, klines, results) {
  var html = '';
  var dateRange = klines[0][0] + ' ~ ' + klines[klines.length - 1][0] + '（' + klines.length + ' 根日K）';
  html += '<div class="bt-range"><i class="fas fa-calendar-alt" style="margin-right:6px;color:var(--primary)"></i>' + escapeHtml(symbol.toUpperCase()) + ' · ' + escapeHtml(dateRange) + '</div>';

  if (results.length === 0) {
    html += '<div class="empty-state"><i class="fas fa-vial" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>请至少启用一个策略</div>';
    return html;
  }

  html += '<div class="bt-result-grid">';
  results.forEach(function (r) {
    var s = r.stats;
    var beat = s.totalReturn - s.buyHold;
    html += '<div class="bt-card">';
    html += '<div class="bt-card-head">';
    html += '<span class="bt-card-name">' + escapeHtml(r.name) + '</span>';
    html += '<span class="bt-card-param">' + escapeHtml(r.param) + '</span>';
    html += '<span class="bt-card-ret ' + btCls(s.totalReturn) + '">' + btPct(s.totalReturn) + '</span>';
    html += '</div>';
    html += '<div class="bt-meta-grid">';
    html += '<div class="bt-meta"><span class="k">年化收益</span><span class="v ' + btCls(s.annual) + '">' + btPct(s.annual) + '</span></div>';
    html += '<div class="bt-meta"><span class="k">最大回撤</span><span class="v down">' + btPct(-s.maxDD) + '</span></div>';
    html += '<div class="bt-meta"><span class="k">完整交易</span><span class="v">' + s.tradeCount + ' 次</span></div>';
    html += '<div class="bt-meta"><span class="k">胜率</span><span class="v">' + (s.tradeCount > 0 ? (s.winRate * 100).toFixed(0) + '%' : '-') + '</span></div>';
    html += '<div class="bt-meta"><span class="k">平均单笔</span><span class="v ' + btCls(s.avgPnl) + '">' + btPct(s.avgPnl) + '</span></div>';
    html += '<div class="bt-meta"><span class="k">买入持有</span><span class="v ' + btCls(s.buyHold) + '">' + btPct(s.buyHold) + '</span></div>';
    html += '</div>';
    html += '<div class="bt-beat ' + btCls(beat) + '">';
    html += beat >= 0 ? '<i class="fas fa-trophy"></i> 跑赢买入持有 ' + btPct(beat) : '<i class="fas fa-arrow-down"></i> 跑输买入持有 ' + btPct(beat);
    html += '</div>';
    if (s.completed.length > 0) {
      html += '<div class="bt-trades">';
      html += '<div class="bt-trades-title">最近交易</div>';
      var list = s.completed.slice(-8).reverse();
      list.forEach(function (c) {
        html += '<div class="bt-trade"><span class="bt-td">' + escapeHtml(c.buyDate) + ' 买 @' + fmt(c.buyPrice) + '</span>';
        html += '<span class="bt-arrow">→</span>';
        html += '<span class="bt-td">' + escapeHtml(c.sellDate) + ' 卖 @' + fmt(c.sellPrice) + '</span>';
        html += '<span class="bt-tp ' + btCls(c.pnlPct) + '">' + btPct(c.pnlPct) + '</span></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="bt-trades"><div class="bt-trades-title">该区间内未触发完整买卖</div></div>';
    }
    html += '</div>';
  });
  html += '</div>';
  html += '<div class="bt-note"><i class="fas fa-info-circle" style="margin-right:4px"></i>简化回测：信号次日开盘成交、按金额全仓（非整手）买卖、含佣金与印花税，未考虑涨跌停与停牌，仅供参考、不构成投资建议。</div>';
  return html;
}

// btNum / btInt / btChecked - 读取输入控件
function btNum(id, def) { var v = parseFloat(document.getElementById(id).value); return isNaN(v) ? def : v; }
function btInt(id, def) { var v = parseInt(document.getElementById(id).value, 10); return isNaN(v) ? def : v; }
function btChecked(id) { return document.getElementById(id).checked; }

// showBtError - 显示错误信息
function showBtError(msg) {
  var el = document.getElementById('btError');
  el.textContent = msg;
  el.style.display = 'block';
}

// runBacktestTool - 主流程：读参数、拉K线、逐策略回测并渲染
function runBacktestTool() {
  var errEl = document.getElementById('btError');
  var statusEl = document.getElementById('backtestStatus');
  var runBtn = document.getElementById('btRun');

  var symbol = normalizeSymbol(document.getElementById('btCode').value);
  if (!symbol) { showBtError('请输入正确的 A 股代码，如 600519 / sh600519 / 000858'); return; }
  errEl.style.display = 'none';

  var cfg = {
    capital: btNum('btCapital', 100000),
    commission: btNum('btCommission', 0.03) / 100,
    stamp: btNum('btStamp', 0.1) / 100,
    klines: btInt('btKlines', 400)
  };
  if (cfg.capital <= 0) { showBtError('初始资金需大于 0'); return; }
  if (cfg.klines < 60 || cfg.klines > 800) { showBtError('K线数量需在 60~800 之间'); return; }

  statusEl.textContent = '加载历史数据…';
  runBtn.disabled = true;

  fetch('https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=' + symbol + ',day,,,' + cfg.klines + ',qfq')
    .then(function (r) { return r.json(); })
    .then(function (json) {
      var data = json && json.data && json.data[symbol];
      var raw = data && (data.qfqday || data.day);
      if (!raw || raw.length < 60) throw new Error('未获取到足够的历史数据（至少 60 根）');
      var klines = raw.map(function (k) {
        return [k[0], parseFloat(k[1]), parseFloat(k[2]), parseFloat(k[3]), parseFloat(k[4]), parseFloat(k[5])];
      });
      var closes = klines.map(function (k) { return k[2]; });

      var results = [];
      if (btChecked('btMaEnable')) {
        var p = { short: btInt('btMaShort', 5), long: btInt('btMaLong', 20) };
        if (p.short > 0 && p.long > p.short) {
          var res = runBacktest(klines, signalsMA(closes, p.short, p.long), cfg);
          results.push({ name: '双均线', param: 'MA' + p.short + ' / MA' + p.long, stats: computeStats(klines, res, cfg) });
        }
      }
      if (btChecked('btRsiEnable')) {
        var q = { n: btInt('btRsiN', 14), buy: btNum('btRsiBuy', 30), sell: btNum('btRsiSell', 70) };
        if (q.n > 0 && q.buy < q.sell) {
          var res2 = runBacktest(klines, signalsRSI(closes, q.n, q.buy, q.sell), cfg);
          results.push({ name: 'RSI', param: 'RSI' + q.n + ' ' + q.buy + '/' + q.sell, stats: computeStats(klines, res2, cfg) });
        }
      }
      if (btChecked('btBollEnable')) {
        var w = { n: btInt('btBollN', 20), mult: btNum('btBollMult', 2) };
        if (w.n > 0 && w.mult > 0) {
          var res3 = runBacktest(klines, signalsBoll(closes, w.n, w.mult), cfg);
          results.push({ name: '布林带', param: 'BOLL' + w.n + ' ×' + w.mult, stats: computeStats(klines, res3, cfg) });
        }
      }
      if (btChecked('btMacdEnable')) {
        var m = { fast: btInt('btMacdFast', 12), slow: btInt('btMacdSlow', 26), signal: btInt('btMacdSignal', 9) };
        if (m.fast > 0 && m.slow > m.fast && m.signal > 0) {
          var res4 = runBacktest(klines, signalsMACD(closes, m.fast, m.slow, m.signal), cfg);
          results.push({ name: 'MACD', param: m.fast + '/' + m.slow + '/' + m.signal, stats: computeStats(klines, res4, cfg) });
        }
      }

      document.getElementById('btResult').innerHTML = renderBacktest(symbol, klines, results);
      statusEl.textContent = '完成 · ' + klines.length + ' 根K线';
      runBtn.disabled = false;
    })
    .catch(function (e) {
      statusEl.textContent = '失败';
      showBtError(e && e.message ? e.message : '数据加载失败');
      runBtn.disabled = false;
    });
}

document.getElementById('btRun').addEventListener('click', runBacktestTool);
