let exchangeData = null;
let exchangeTimer = null;

const EXCHANGE_CURRENCIES = {
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

function populateExchangeCurrencySelect(rates) {
  const sel = document.getElementById('exchangeCurrency');
  sel.innerHTML = '';
  for (const [code, info] of Object.entries(EXCHANGE_CURRENCIES)) {
    if (rates[code]) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = info.symbol + ' ' + code + ' - ' + info.name;
      sel.appendChild(opt);
    }
  }
  sel.value = 'THB';
}

function renderExchangeRateGrid(rates) {
  const grid = document.getElementById('exchangeRateGrid');
  grid.innerHTML = '';
  for (const [code, info] of Object.entries(EXCHANGE_CURRENCIES)) {
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
      document.getElementById('exchangeCurrency').value = code;
      document.getElementById('exchangeAmount').value = 1;
      doExchangeConvert(rates);
    });
    grid.appendChild(card);
  }
}

function doExchangeConvert(rates) {
  const amount = parseFloat(document.getElementById('exchangeAmount').value);
  const currency = document.getElementById('exchangeCurrency').value;
  const rate = rates[currency];
  if (!amount || !rate || isNaN(amount)) {
    document.getElementById('exchangeResult').innerHTML = '<span class="hint">输入金额</span>';
    return;
  }
  const cny = amount / rate;
  document.getElementById('exchangeResult').textContent =
    '¥ ' + cny.toFixed(2);
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
document.getElementById('exchangeCurrency').addEventListener('change', function () {
  if (exchangeData) doExchangeConvert(exchangeData.rates);
});
