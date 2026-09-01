const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('node:path');
const { defaultConfig, sanitizeConfig, loadConfig, saveConfig } = require('./src/config');
const { syncTrayMenuItem } = require('./src/tray');

let mainWindow;
let currentConfig = defaultConfig();
let configPath;
let tray;
let trayAlwaysOnTopItem;
let isQuitting = false;

function intersectsDisplay(bounds) {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea;
    return bounds.x < area.x + area.width && bounds.x + bounds.width > area.x &&
      bounds.y < area.y + area.height && bounds.y + bounds.height > area.y;
  });
}

function persistConfig() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds();
    currentConfig = sanitizeConfig({ ...currentConfig, bounds });
  }
  saveConfig(configPath, currentConfig);
}

function createWindow() {
  const bounds = currentConfig.bounds && intersectsDisplay(currentConfig.bounds) ? currentConfig.bounds : null;
  mainWindow = new BrowserWindow({
    width: bounds ? bounds.width : 360,
    height: bounds ? bounds.height : 300,
    minWidth: 280,
    x: bounds ? bounds.x : undefined,
    y: bounds ? bounds.y : undefined,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: currentConfig.alwaysOnTop,
    opacity: currentConfig.opacity,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return;
    }
    persistConfig();
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.ico');
  const fallbackPath = path.join(__dirname, '..', 'icons', 'brain-192.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromPath(fallbackPath) : icon);
  tray.setToolTip('股票行情');
  tray.on('click', () => mainWindow.show());
  const menu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow.show() },
    { label: '立即刷新', click: () => mainWindow.webContents.send('window:refresh') },
    {
      label: '始终置顶',
      id: 'always-on-top',
      type: 'checkbox',
      checked: currentConfig.alwaysOnTop,
      click: (item) => {
        currentConfig.alwaysOnTop = item.checked;
        syncTrayMenuItem(trayAlwaysOnTopItem, currentConfig.alwaysOnTop);
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(item.checked);
        persistConfig();
      }
    },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } }
  ]);
  trayAlwaysOnTopItem = menu.getMenuItemById('always-on-top');
  tray.setContextMenu(menu);
}

ipcMain.handle('config:get', () => currentConfig);

ipcMain.handle('config:save', (_event, value) => {
  currentConfig = sanitizeConfig(value);
  syncTrayMenuItem(trayAlwaysOnTopItem, currentConfig.alwaysOnTop);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(currentConfig.alwaysOnTop);
    mainWindow.setOpacity(currentConfig.opacity);
    if (currentConfig.bounds && intersectsDisplay(currentConfig.bounds)) mainWindow.setBounds(currentConfig.bounds);
  }
  persistConfig();
  return currentConfig;
});

ipcMain.handle('window:set-always-on-top', (_event, value) => {
  currentConfig.alwaysOnTop = sanitizeConfig({ alwaysOnTop: value }).alwaysOnTop;
  syncTrayMenuItem(trayAlwaysOnTopItem, currentConfig.alwaysOnTop);
  if (mainWindow) mainWindow.setAlwaysOnTop(currentConfig.alwaysOnTop);
  persistConfig();
});

ipcMain.handle('window:set-opacity', (_event, value) => {
  currentConfig.opacity = sanitizeConfig({ opacity: value }).opacity;
  if (mainWindow) mainWindow.setOpacity(currentConfig.opacity);
  persistConfig();
});

ipcMain.handle('window:hide', () => { if (mainWindow) mainWindow.hide(); });
ipcMain.handle('window:show', () => { if (mainWindow) mainWindow.show(); });
ipcMain.handle('window:close', () => { if (mainWindow) mainWindow.close(); });

app.whenReady().then(() => {
  configPath = path.join(app.getPath('userData'), 'config.json');
  currentConfig = loadConfig(configPath);
  createWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (configPath) persistConfig();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
