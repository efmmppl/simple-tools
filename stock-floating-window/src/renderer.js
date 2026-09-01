(function () {
  const bridge = window.stockWidget.window;
  const configBridge = window.stockWidget;
  const settingsPanel = document.getElementById('settingsPanel');
  const errorState = document.getElementById('errorState');
  const emptyState = document.getElementById('emptyState');
  const watchlist = document.getElementById('watchlist');
  const statusText = document.getElementById('statusText');
  const refreshInterval = document.getElementById('refreshInterval');
  let state;
  let config;
  let timer;

  function saveCurrentConfig() {
    return configBridge.saveConfig({ ...config, symbols: state.symbols });
  }

  function render() {
    const rows = state.symbols.map((symbol) => state.quotes[symbol]
      ? formatQuoteRow(state.quotes[symbol])
      : '<article class="quote-row pending"><div><strong>' + symbol.slice(2).toUpperCase() + '</strong></div><span>等待行情数据</span></article>');
    watchlist.querySelectorAll('.quote-row').forEach((row) => row.remove());
    emptyState.hidden = state.symbols.length > 0;
    watchlist.insertAdjacentHTML('afterbegin', rows.join(''));
    errorState.hidden = !state.error;
    errorState.textContent = state.error ? state.error.message : '';
  }

  function updateStatus() {
    if (!state.symbols.length) {
      statusText.textContent = '等待添加自选股';
    } else if (state.error && (state.error.type === 'network' || state.error.type === 'response')) {
      statusText.textContent = '连接失败';
    } else if (state.error) {
      statusText.textContent = state.error.message;
    } else if (isMarketClosed(new Date())) {
      statusText.textContent = '非交易时段';
    } else if (state.lastSuccessAt) {
      statusText.textContent = '更新于 ' + state.lastSuccessAt.toLocaleTimeString('zh-CN', { hour12: false });
    } else {
      statusText.textContent = '就绪';
    }
  }

  async function refresh() {
    if (!state || !state.symbols.length) {
      updateStatus();
      render();
      return;
    }
    const result = await refreshQuotes(state.symbols);
    result.quotes.forEach((quote) => { state.quotes[quote.symbol] = quote; });
    state.error = result.error;
    if (!result.error) state.lastSuccessAt = new Date();
    render();
    updateStatus();
  }

  function rebuildTimer() {
    clearInterval(timer);
    timer = setInterval(refresh, refreshIntervalMs(config.refreshInterval));
  }

  document.getElementById('settingsButton').addEventListener('click', () => {
    settingsPanel.hidden = !settingsPanel.hidden;
  });

  document.getElementById('hideButton').addEventListener('click', () => bridge.hide());
  document.getElementById('closeButton').addEventListener('click', () => bridge.close());
  document.getElementById('alwaysOnTop').addEventListener('change', (event) => {
    config.alwaysOnTop = event.target.checked;
    bridge.setAlwaysOnTop(event.target.checked);
  });
  document.getElementById('opacity').addEventListener('input', (event) => {
    config.opacity = Number(event.target.value);
    bridge.setOpacity(event.target.value);
  });
  refreshInterval.addEventListener('change', async (event) => {
    config.refreshInterval = Number(event.target.value);
    await saveCurrentConfig();
    rebuildTimer();
  });

  document.getElementById('addSymbolForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const symbol = new FormData(event.target).get('symbol').trim();
    errorState.hidden = true;
    try {
      await addSymbol(symbol, state, async (resolvedSymbol) => {
        const result = await refreshQuotes([resolvedSymbol]);
        return result.error ? null : result.quotes[0];
      }, (symbols) => configBridge.saveConfig({ ...config, symbols }));
      statusText.textContent = '已添加 ' + symbol + '，等待行情数据';
      await refresh();
    } catch (error) {
      state.error = { type: error.code === 'persistence' ? 'persistence' : 'input', message: error.code === 'persistence' ? '保存失败，请重试' : error.message === 'symbol not found' ? '未找到该股票' : error.message === 'duplicate symbol' ? '股票已存在' : '请输入有效股票代码' };
      render();
      updateStatus();
    }
    event.target.reset();
  });

  watchlist.addEventListener('click', async (event) => {
    const button = event.target.closest('.remove-symbol');
    if (!button) return;
    removeSymbol(button.dataset.symbol, state);
    await saveCurrentConfig();
    render();
    updateStatus();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer);
    else { rebuildTimer(); refresh(); }
  });

  (async function load() {
    config = await configBridge.getConfig();
    state = createWatchlistState(config);
    document.getElementById('alwaysOnTop').checked = config.alwaysOnTop;
    document.getElementById('opacity').value = config.opacity;
    refreshInterval.value = String(config.refreshInterval);
    render();
    updateStatus();
    rebuildTimer();
    await refresh();
  })();
})();
