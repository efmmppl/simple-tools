(function () {
  const bridge = window.stockWidget.window;
  const settingsPanel = document.getElementById('settingsPanel');
  const errorState = document.getElementById('errorState');
  const statusText = document.getElementById('statusText');

  document.getElementById('settingsButton').addEventListener('click', () => {
    settingsPanel.hidden = !settingsPanel.hidden;
  });

  document.getElementById('hideButton').addEventListener('click', () => bridge.hide());
  document.getElementById('closeButton').addEventListener('click', () => bridge.close());
  document.getElementById('alwaysOnTop').addEventListener('change', (event) => bridge.setAlwaysOnTop(event.target.checked));
  document.getElementById('opacity').addEventListener('input', (event) => bridge.setOpacity(event.target.value));

  document.getElementById('addSymbolForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const symbol = new FormData(event.target).get('symbol').trim();
    errorState.hidden = true;
    statusText.textContent = symbol ? `已添加 ${symbol}，等待行情数据` : '请输入股票代码';
    if (!symbol) {
      errorState.textContent = '请输入股票代码';
      errorState.hidden = false;
    }
    event.target.reset();
  });
})();
