let exchangeData = null;
let exchangeTimer = null;

const EXCHANGE_CURRENCIES = {
  CNY: { name: '人民币', symbol: '¥' },
  USD: { name: '美元', symbol: '$' },
  EUR: { name: '欧元', symbol: '€' },
  GBP: { name: '英镑', symbol: '£' },
  JPY: { name: '日元', symbol: '¥' },
  HKD: { name: '港币', symbol: 'HK$' },
  KRW: { name: '韩元', symbol: '₩' },
  AUD: { name: '澳元', symbol: 'A$' },
  CAD: { name: '加元', symbol: 'C$' },
  SGD: { name: '新加坡元', symbol: 'S$' },
  CHF: { name: '瑞士法郎', symbol: 'CHF' },
  THB: { name: '泰铢', symbol: '฿' },
  MYR: { name: '林吉特', symbol: 'RM' },
  RUB: { name: '卢布', symbol: '₽' },
  INR: { name: '印度卢比', symbol: '₹' },
  NZD: { name: '新西兰元', symbol: 'NZ$' },
  PHP: { name: '菲律宾比索', symbol: '₱' },
  IDR: { name: '印尼盾', symbol: 'Rp' },
  VND: { name: '越南盾', symbol: '₫' },
  TWD: { name: '新台币', symbol: 'NT$' },
  DKK: { name: '丹麦克朗', symbol: 'kr' },
  SEK: { name: '瑞典克朗', symbol: 'kr' },
  NOK: { name: '挪威克朗', symbol: 'kr' },
};

function exchangeRateOf(rates, code) {
  if (code === 'CNY') return 1;
  return rates[code];
}

function formatExchangeAmount(n) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchExchangeRates() {
  document.getElementById('exchangeRefreshStatus').textContent = '加载中...';
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY');
    const data = await res.json();
    if (data.result === 'success') {
      exchangeData = data;
      populateExchangeCurrencySelect(data.rates);
      renderExchangeRateGrid(data.rates);
      doExchangeConvert(data.rates);
      document.getElementById('exchangeUpdateTime').textContent =
        '更新时间：' + new Date().toLocaleString('zh-CN', { hour12: false }) +
        ' · 数据来源：open.er-api.com';
      document.getElementById('exchangeRefreshStatus').textContent = '已更新';
    } else {
      document.getElementById('exchangeRefreshStatus').textContent = '加载失败';
    }
  } catch (e) {
    document.getElementById('exchangeRefreshStatus').textContent = '加载失败';
  }
}

function setSelectValue(sel, code, fallback) {
  sel.value = code;
  if (!sel.value) sel.value = fallback;
}

function populateExchangeCurrencySelect(rates) {
  const fromSel = document.getElementById('exchangeFrom');
  const toSel = document.getElementById('exchangeTo');
  const prevFrom = fromSel.value;
  const prevTo = toSel.value;
  fromSel.innerHTML = '';
  toSel.innerHTML = '';
  for (const [code, info] of Object.entries(EXCHANGE_CURRENCIES)) {
    if (code !== 'CNY' && !rates[code]) continue;
    const label = info.symbol + ' ' + code + ' - ' + info.name;
    const optFrom = document.createElement('option');
    optFrom.value = code;
    optFrom.textContent = label;
    fromSel.appendChild(optFrom);
    const optTo = document.createElement('option');
    optTo.value = code;
    optTo.textContent = label;
    toSel.appendChild(optTo);
  }
  setSelectValue(fromSel, prevFrom, 'THB');
  setSelectValue(toSel, prevTo, 'CNY');
}

function renderExchangeRateGrid(rates) {
  const grid = document.getElementById('exchangeRateGrid');
  grid.innerHTML = '';
  for (const [code, info] of Object.entries(EXCHANGE_CURRENCIES)) {
    if (code === 'CNY') continue;
    const rate = rates[code];
    if (!rate) continue;
    const cnyPerUnit = 1 / rate;
    const card = document.createElement('div');
    card.className = 'exchange-rate-card';
    card.innerHTML =
      '<div class="exchange-rate-code">' + code + '</div>' +
      '<div class="exchange-rate-name">' + info.name + '</div>' +
      '<div class="exchange-rate-val">' + cnyPerUnit.toFixed(4) + '</div>' +
      '<div class="exchange-rate-label">人民币</div>';
    card.addEventListener('click', function () {
      document.getElementById('exchangeFrom').value = code;
      document.getElementById('exchangeTo').value = 'CNY';
      document.getElementById('exchangeAmount').value = 1;
      doExchangeConvert(rates);
    });
    grid.appendChild(card);
  }
}

function doExchangeConvert(rates) {
  const amount = parseFloat(document.getElementById('exchangeAmount').value);
  const from = document.getElementById('exchangeFrom').value;
  const to = document.getElementById('exchangeTo').value;
  const rateFrom = exchangeRateOf(rates, from);
  const rateTo = exchangeRateOf(rates, to);
  if (!amount || isNaN(amount) || !rateFrom || !rateTo) {
    document.getElementById('exchangeResult').innerHTML = '<span class="hint">输入金额</span>';
    return;
  }
  const result = amount / rateFrom * rateTo;
  const toInfo = EXCHANGE_CURRENCIES[to] || {};
  const toSymbol = toInfo.symbol || to;
  const unitTo = rateTo / rateFrom;
  const unitFrom = rateFrom / rateTo;
  document.getElementById('exchangeResult').innerHTML =
    '<div class="exchange-res-primary">' + formatExchangeAmount(amount) + ' ' + from + ' = ' +
    toSymbol + ' ' + formatExchangeAmount(result) + ' ' + to + '</div>' +
    '<div class="exchange-res-secondary">1 ' + from + ' = ' + unitTo.toFixed(4) + ' ' + to +
    ' · 1 ' + to + ' = ' + unitFrom.toFixed(4) + ' ' + from + '</div>';
}

const exchangeObserver = new MutationObserver(function () {
  const exchangeView = document.getElementById('tool-exchange');
  if (exchangeView.classList.contains('active')) {
    fetchExchangeRates();
    if (exchangeTimer) clearInterval(exchangeTimer);
    exchangeTimer = setInterval(fetchExchangeRates, 120000);
  } else {
    if (exchangeTimer) { clearInterval(exchangeTimer); exchangeTimer = null; }
  }
});
exchangeObserver.observe(document.getElementById('tool-exchange'), { attributes: true, attributeFilter: ['class'] });

document.getElementById('exchangeRefreshBtn').addEventListener('click', fetchExchangeRates);
document.getElementById('exchangeAmount').addEventListener('input', function () {
  if (exchangeData) doExchangeConvert(exchangeData.rates);
});
document.getElementById('exchangeFrom').addEventListener('change', function () {
  if (exchangeData) doExchangeConvert(exchangeData.rates);
});
document.getElementById('exchangeTo').addEventListener('change', function () {
  if (exchangeData) doExchangeConvert(exchangeData.rates);
});
document.getElementById('exchangeSwapBtn').addEventListener('click', function () {
  const fromSel = document.getElementById('exchangeFrom');
  const toSel = document.getElementById('exchangeTo');
  const tmp = fromSel.value;
  fromSel.value = toSel.value;
  toSel.value = tmp;
  if (exchangeData) doExchangeConvert(exchangeData.rates);
});
