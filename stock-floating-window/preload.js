const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stockWidget', {
  window: {
    setAlwaysOnTop(value) { return ipcRenderer.invoke('window:set-always-on-top', value); },
    setOpacity(value) { return ipcRenderer.invoke('window:set-opacity', value); },
    hide() { return ipcRenderer.invoke('window:hide'); },
    show() { return ipcRenderer.invoke('window:show'); },
    close() { return ipcRenderer.invoke('window:close'); }
  }
});
