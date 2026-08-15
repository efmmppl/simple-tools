// 信号监控：定时轮询行情，按策略实时检测买卖信号，触发时提醒（页内+声音+浏览器通知）并记录到 localStorage
// 复用 js/stock.js 的 normalizeSymbol / fmt，js/backtest.js 的 signalsMA / signalsRSI / signalsBoll / signalsMACD

var MON_STORAGE_KEY = 'stockSignals';

var MON_STATE = {
  running: false,
  timer: null,
  interval: 30,
  symbols: [],
  strategies: [],
  baseline: {},
  quotes: {}
};

// monToday - 返回 YYYY-MM-DD
function monToday() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

// monNow - 返回 YYYY-MM-DD HH:MM:SS
function monNow() {
  var d = new Date();
  function p(n) { return ('0' + n).slice(-2); }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

// monTime - 返回 HH:MM:SS
function monTime() {
  var d = new Date();
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
}

// monFetch - 拉取前复权日K + 实时行情，用实时价更新/追加今天K线
function monFetch(symbol) {
  return fetch('https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=' + symbol + ',day,,,120,qfq')
    .then(function (r) { return r.json(); })
    .then(function (json) {
      var data = json.data[symbol];
      var raw = data.qfqday || data.day;
      if (!raw || raw.length < 60) throw new Error('数据不足');
      var klines = raw.map(function (k) {
        return [k[0], parseFloat(k[1]), parseFloat(k[2]), parseFloat(k[3]), parseFloat(k[4]), parseFloat(k[5])];
      });
      var qt = data.qt[symbol];
      var today = monToday();
      var tsDate = (qt[30] && qt[30].length >= 8) ? qt[30].slice(0, 8) : '';
      if (tsDate === today.replace(/-/g, '')) {
        var last = klines[klines.length - 1];
        if (last && last[0] === today) {
          last[2] = parseFloat(qt[3]); last[3] = parseFloat(qt[33]); last[4] = parseFloat(qt[34]); last[5] = parseFloat(qt[6]);
        } else {
          klines.push([today, parseFloat(qt[5]) || parseFloat(qt[3]), parseFloat(qt[3]), parseFloat(qt[33]), parseFloat(qt[34]), parseFloat(qt[6])]);
        }
      }
      var closes = klines.map(function (k) { return k[2]; });
      return { symbol: symbol, name: qt[1], price: parseFloat(qt[3]), klines: klines, closes: closes };
    });
}

// monBuildSignals - 计算各策略的最新信号（0/1/-1）
function monBuildSignals(closes) {
  return [
    { id: 'ma', name: '双均线', sig: signalsMA(closes, 5, 20) },
    { id: 'rsi', name: 'RSI', sig: signalsRSI(closes, 14, 30, 70) },
    { id: 'boll', name: '布林带', sig: signalsBoll(closes, 20, 2) },
    { id: 'macd', name: 'MACD', sig: signalsMACD(closes, 12, 26, 9) }
  ];
}

// monCheck - 检测新信号并触发提醒/记录
function monCheck(ctx) {
  var list = monBuildSignals(ctx.closes);
  var lastDate = ctx.klines[ctx.klines.length - 1][0];
  list.forEach(function (s) {
    if (!monStrategyEnabled(s.id)) return;
    var sig = s.sig[s.sig.length - 1];
    var key = ctx.symbol + '|' + s.id;
    var st = MON_STATE.baseline[key] || { lastDate: null, fired: false };
    if (st.lastDate !== lastDate) { st.lastDate = lastDate; st.fired = false; }
    if (sig !== 0 && !st.fired) {
      st.fired = true;
      MON_STATE.baseline[key] = st;
      monEmitSignal(ctx, s.name, sig, lastDate);
    } else {
      MON_STATE.baseline[key] = st;
    }
  });
}

// monEmitSignal - 记录 + 提醒
function monEmitSignal(ctx, strategy, sig, date) {
  var action = sig === 1 ? '买入' : '卖出';
  var rec = {
    time: monNow(), symbol: ctx.symbol.toUpperCase(), name: ctx.name,
    strategy: strategy, action: action, price: ctx.price, date: date
  };
  monSaveRecord(rec);
  monNotify(ctx.name + ' · ' + strategy + ' 触发' + action + '信号', '价格 ' + fmt(ctx.price));
}

// monLoadRecords / monSaveRecord - localStorage 读写记录
function monLoadRecords() {
  try { return JSON.parse(localStorage.getItem(MON_STORAGE_KEY) || '[]'); } catch (e) { return []; }
}
function monSaveRecord(rec) {
  var list = monLoadRecords();
  list.unshift(rec);
  if (list.length > 500) list.length = 500;
  try { localStorage.setItem(MON_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  monRenderRecords();
}

// monBeep - Web Audio 提示音
function monBeep() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!window.__monAudioCtx) window.__monAudioCtx = new AC();
    var ctx = window.__monAudioCtx;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.value = 0.3;
    o.start();
    setTimeout(function () { o.stop(); }, 250);
  } catch (e) {}
}

// monToast - 页内提示条
function monToast(msg) {
  var el = document.getElementById('monToast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'mon-toast show';
  clearTimeout(monToast._t);
  monToast._t = setTimeout(function () { el.className = 'mon-toast'; }, 5000);
}

// monNotify - 声音 + 浏览器通知 + 页内提示
function monNotify(title, body) {
  monBeep();
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('量化信号 · ' + title, { body: body }); } catch (e) {}
  }
  monToast(title + '  ' + body);
}

// monStrategyEnabled - 某策略是否勾选启用
function monStrategyEnabled(id) {
  var map = { ma: 'monMa', rsi: 'monRsi', boll: 'monBoll', macd: 'monMacd' };
  var el = document.getElementById(map[id]);
  return el ? el.checked : true;
}

// monRenderRecords - 渲染信号记录列表
function monRenderRecords() {
  var list = monLoadRecords();
  var el = document.getElementById('monRecords');
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--header-sub)"></i>暂无信号记录，开始监控后触发信号会记录在此</div>';
    return;
  }
  var html = '<div class="mon-rec-list">';
  list.forEach(function (r) {
    var cls = r.action === '买入' ? 'up' : 'down';
    html += '<div class="mon-rec">';
    html += '<span class="mon-rec-time">' + escapeHtml(r.time) + '</span>';
    html += '<span class="mon-rec-name">' + escapeHtml(r.name) + ' <span class="mon-rec-sym">' + escapeHtml(r.symbol) + '</span></span>';
    html += '<span class="mon-rec-strat">' + escapeHtml(r.strategy) + '</span>';
    html += '<span class="mon-rec-action ' + cls + '">' + escapeHtml(r.action) + '</span>';
    html += '<span class="mon-rec-price">@' + fmt(r.price) + '</span>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// monRenderStatus - 渲染监控状态
function monRenderStatus() {
  var el = document.getElementById('monStatusBox');
  if (!el) return;
  var html = '';
  if (MON_STATE.running) {
    var parts = [];
    MON_STATE.symbols.forEach(function (symbol) {
      var q = MON_STATE.quotes[symbol];
      if (q) parts.push(escapeHtml(q.name) + ' ' + fmt(q.price));
    });
    html = '<div class="mon-running"><i class="fas fa-circle" style="color:var(--primary);font-size:0.5rem;vertical-align:middle"></i> 运行中 · 监控 ' + MON_STATE.symbols.length + ' 只 · 每 ' + MON_STATE.interval + ' 秒轮询 · 上次更新 ' + monTime() + '</div>';
    if (parts.length) html += '<div class="mon-quotes">' + parts.join('　') + '</div>';
  } else {
    html = '<div class="mon-idle"><i class="fas fa-pause-circle"></i> 未运行，设置后点击「开始监控」</div>';
  }
  el.innerHTML = html;
}

// setMonStatus - 顶部状态栏文字
function setMonStatus(txt) {
  var el = document.getElementById('monStatus');
  if (el) el.textContent = txt;
}

// showMonError - 显示错误
function showMonError(msg) {
  var el = document.getElementById('monError');
  el.textContent = msg;
  el.style.display = 'block';
}

// monPoll - 轮询所有股票
function monPoll() {
  if (!MON_STATE.running) return;
  MON_STATE.symbols.forEach(function (symbol) {
    monFetch(symbol).then(function (ctx) {
      MON_STATE.quotes[symbol] = { name: ctx.name, price: ctx.price };
      monCheck(ctx);
      monRenderStatus();
    }).catch(function () {});
  });
}

// monStart - 开始监控
function monStart() {
  var errEl = document.getElementById('monError');
  var raw = document.getElementById('monCodes').value.split(/[,，\s]+/).filter(Boolean);
  var symbols = [];
  var seen = {};
  raw.forEach(function (c) {
    var s = normalizeSymbol(c);
    if (s && !seen[s]) { seen[s] = 1; symbols.push(s); }
  });
  if (symbols.length === 0) { showMonError('请输入正确的 A 股代码，如 600519,000858'); return; }
  errEl.style.display = 'none';

  var strategies = [];
  if (document.getElementById('monMa').checked) strategies.push({ id: 'ma', name: '双均线' });
  if (document.getElementById('monRsi').checked) strategies.push({ id: 'rsi', name: 'RSI' });
  if (document.getElementById('monBoll').checked) strategies.push({ id: 'boll', name: '布林带' });
  if (document.getElementById('monMacd').checked) strategies.push({ id: 'macd', name: 'MACD' });
  if (strategies.length === 0) { showMonError('请至少启用一个策略'); return; }

  var interval = parseInt(document.getElementById('monInterval').value, 10);
  if (isNaN(interval) || interval < 10) interval = 10;

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  MON_STATE.symbols = symbols;
  MON_STATE.strategies = strategies;
  MON_STATE.interval = interval;
  MON_STATE.baseline = {};
  MON_STATE.quotes = {};
  MON_STATE.running = true;

  document.getElementById('monStartBtn').disabled = true;
  document.getElementById('monStopBtn').disabled = false;
  document.getElementById('monCodes').disabled = true;
  document.getElementById('monInterval').disabled = true;
  setMonStatus('运行中');

  monPoll();
  MON_STATE.timer = setInterval(monPoll, interval * 1000);
  monRenderStatus();
}

// monStop - 停止监控
function monStop() {
  if (MON_STATE.timer) { clearInterval(MON_STATE.timer); MON_STATE.timer = null; }
  MON_STATE.running = false;
  document.getElementById('monStartBtn').disabled = false;
  document.getElementById('monStopBtn').disabled = true;
  document.getElementById('monCodes').disabled = false;
  document.getElementById('monInterval').disabled = false;
  setMonStatus('已停止');
  monRenderStatus();
}

// monClear - 清空记录
function monClear() {
  try { localStorage.removeItem(MON_STORAGE_KEY); } catch (e) {}
  monRenderRecords();
}

document.getElementById('monStartBtn').addEventListener('click', monStart);
document.getElementById('monStopBtn').addEventListener('click', monStop);
document.getElementById('monClearBtn').addEventListener('click', monClear);
monRenderRecords();
monRenderStatus();
