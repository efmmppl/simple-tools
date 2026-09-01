const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

let mainWindow;

let windowConfig = {
  load() { return {}; },
  save() {}
};

try {
  windowConfig = require('./config');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

function createWindow() {
  const saved = windowConfig.load();
  mainWindow = new BrowserWindow({
    width: saved.width || 360,
    height: saved.height || 300,
    x: saved.x,
    y: saved.y,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds();
    windowConfig.save({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
  });
}

ipcMain.handle('window:set-always-on-top', (_event, value) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(Boolean(value));
});

ipcMain.handle('window:set-opacity', (_event, value) => {
  if (mainWindow) mainWindow.setOpacity(Math.min(1, Math.max(0.2, Number(value))));
});

ipcMain.handle('window:hide', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.handle('window:show', () => {
  if (mainWindow) mainWindow.show();
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
