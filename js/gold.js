let goldTimer = null; // 金价自动刷新定时器

// fetchGoldPrice - 通过 JSONP 方式获取金价数据
function fetchGoldPrice() {
  document.getElementById('goldRefreshStatus').textContent = '加载中...';
  const s = document.createElement('script');
  s.src = 'https://www.huilvbiao.com/api/gold_indexApi?t=' + Date.now();
  s.onload = () => {
    try {
      const cn = window.hq_str_gds_AUTD.split(',');
      const ny = window.hq_str_hf_GC.split(',');
      const ld = window.hq_str_hf_XAU.split(',');
      updateGoldCard('cn', cn);
      updateGoldCard('ny', ny);
      updateGoldCard('ld', ld);
      document.getElementById('goldDataTime').textContent = cn[12] + ' ' + cn[6];
      document.getElementById('goldRefreshTime').textContent = new Date().toLocaleString('zh-CN', { hour12: false });
      document.getElementById('goldRefreshStatus').textContent = '已更新';
    } catch (e) {
      document.getElementById('goldRefreshStatus').textContent = '加载失败';
    }
  };
  s.onerror = () => {
    document.getElementById('goldRefreshStatus').textContent = '加载失败';
  };
  document.body.appendChild(s);
}

// updateGoldCard - 更新指定类型（国内/纽约/伦敦）的金价卡片 DOM
function updateGoldCard(type, d) {
  const price = parseFloat(d[0]);
  const close = parseFloat(d[7]);
  const diff = price - close;
  const pct = (diff / close * 100);
  const sign = diff >= 0 ? '+' : '';

  document.getElementById('gold-' + type + '-price').textContent = price.toFixed(2);
  document.getElementById('gold-' + type + '-price').className = 'gold-price' + (diff >= 0 ? ' up' : ' down');
  document.getElementById('gold-' + type + '-change').textContent = sign + diff.toFixed(2) + ' (' + sign + pct.toFixed(2) + '%)';
  document.getElementById('gold-' + type + '-change').className = 'gold-change' + (diff >= 0 ? ' up' : ' down');
  document.getElementById('gold-' + type + '-high').textContent = d[4];
  document.getElementById('gold-' + type + '-low').textContent = d[5];
  document.getElementById('gold-' + type + '-open').textContent = d[8];
  document.getElementById('gold-' + type + '-close').textContent = d[7];
}

// MutationObserver - 监听金价视图切换，进入时加载、离开时停止刷新
const goldObserver = new MutationObserver(() => {
  const goldView = document.getElementById('tool-gold');
  if (goldView.classList.contains('active')) {
    fetchGoldPrice();
    if (goldTimer) clearInterval(goldTimer);
    goldTimer = setInterval(fetchGoldPrice, 60000);
  } else {
    if (goldTimer) { clearInterval(goldTimer); goldTimer = null; }
  }
});
goldObserver.observe(document.getElementById('tool-gold'), { attributes: true, attributeFilter: ['class'] });
