const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stockWidget', {
  getConfig() { return ipcRenderer.invoke('config:get'); },
  saveConfig(config) { return ipcRenderer.invoke('config:save', config); },
  window: {
    setAlwaysOnTop(value) { return ipcRenderer.invoke('window:set-always-on-top', value); },
    setOpacity(value) { return ipcRenderer.invoke('window:set-opacity', value); },
    hide() { return ipcRenderer.invoke('window:hide'); },
    show() { return ipcRenderer.invoke('window:show'); },
    close() { return ipcRenderer.invoke('window:close'); },
    onRefresh(callback) {
      if (typeof callback !== 'function') return;
      ipcRenderer.on('window:refresh', callback);
    }
  }
});
