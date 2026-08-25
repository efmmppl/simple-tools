const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function loadStock() {
  const elements = {};
  const context = {
    document: {
      getElementById(id) {
        if (!elements[id]) elements[id] = { addEventListener() {} };
        return elements[id];
      }
    },
    escapeHtml(value) { return String(value); }
  };
  vm.runInNewContext(fs.readFileSync('js/stock.js', 'utf8'), context);
  return context;
}

function loadBacktest() {
  const context = loadStock();
  context.document.getElementById = function () { return { addEventListener() {}, value: '', checked: false }; };
  vm.runInNewContext(fs.readFileSync('js/backtest.js', 'utf8'), context);
  return context;
}

test('breakout ranges exclude the current candle', () => {
  const { getPriorRange } = loadStock();
  const klines = [
    ['d1', 10, 10, 11, 9, 100],
    ['d2', 10, 10, 12, 8, 100],
    ['d3', 10, 10, 20, 1, 100]
  ];

  const range = getPriorRange(klines, 2);
  assert.equal(range.high, 12);
  assert.equal(range.low, 8);
});

test('unified strategy emits ETF mean-reversion entry and exit signals', () => {
  const { signalsUnified } = loadBacktest();
  const closes = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 8, 12, 16];
  const klines = closes.map((close, i) => ['d' + i, close, close, close, close, 100]);
  const signals = signalsUnified(klines, true);

  assert.equal(signals[14], 1);
  assert.equal(signals[16], -1);
});

test('ETF mean-reversion does not buy below a falling MA60', () => {
  const { signalsUnified } = loadBacktest();
  const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.1).concat([90]);
  const klines = closes.map((close, i) => ['d' + i, close, close, close, close, 100]);

  assert.equal(signalsUnified(klines, true)[60], 0);
});

test('stock breakout requires volume confirmation', () => {
  const { signalsUnified } = loadBacktest();
  const klines = Array.from({ length: 21 }, (_, i) => ['d' + i, 10, i === 20 ? 11 : 10, i === 20 ? 11 : 10, 10, 100]);

  assert.equal(signalsUnified(klines, false)[20], 0);
});

test('weak market reduces the unified strategy position scale', () => {
  const { getMarketPositionScale } = loadBacktest();
  assert.equal(getMarketPositionScale(Array(60).fill(100).concat([90])), 0.5);
  assert.equal(getMarketPositionScale(Array(60).fill(100).concat([110])), 1);
});

test('backtest skips unavailable limit-up and limit-down executions', () => {
  const { runBacktest } = loadBacktest();
  const klines = [
    ['d1', 10, 10, 10, 10, 100],
    ['d2', 11, 11, 11, 11, 100],
    ['d3', 9, 9, 9, 9, 100]
  ];
  const result = runBacktest(klines, [1, -1, 0], { capital: 1000, commission: 0, stamp: 0, limitRate: 0.1 });

  assert.equal(result.trades.length, 0);
  assert.equal(result.finalValue, 1000);
});

test('backtest skips breakout entries after an excessive gap-up', () => {
  const { runBacktest } = loadBacktest();
  const klines = [
    ['d1', 10, 10, 10, 10, 100],
    ['d2', 10.5, 10.5, 10.5, 10.5, 100]
  ];
  const result = runBacktest(klines, [1, 0], { capital: 1000, commission: 0, stamp: 0, limitRate: 0.1, maxGap: 0.03 });

  assert.equal(result.trades.length, 0);
  assert.equal(result.finalValue, 1000);
});

test('annualizedReturn uses trading days and handles total loss', () => {
  const { annualizedReturn } = loadBacktest();

  assert.equal(annualizedReturn(-1, 252), -1);
  assert.equal(annualizedReturn(1, 252), 1);
});
