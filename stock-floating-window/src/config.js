const fs = require('node:fs');
const path = require('node:path');
const { normalizeSymbol } = require('./quote');

function defaultConfig() {
  return {
    symbols: [],
    refreshInterval: 5,
    opacity: 0.92,
    alwaysOnTop: true,
    bounds: null
  };
}

function clampNumber(value, fallback, minimum, maximum) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function validBounds(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = ['x', 'y', 'width', 'height'];
  if (Object.keys(value).some((key) => !keys.includes(key))) return null;
  if (!keys.every((key) => Number.isInteger(value[key]) && Number.isFinite(value[key]))) return null;
  if (value.width <= 0 || value.height <= 0) return null;
  return { x: value.x, y: value.y, width: value.width, height: value.height };
}

function sanitizeConfig(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const symbols = [];
  for (const input of Array.isArray(source.symbols) ? source.symbols : []) {
    const symbol = normalizeSymbol(input);
    if (symbol && !symbols.includes(symbol)) symbols.push(symbol);
  }
  return {
    symbols,
    refreshInterval: Math.round(clampNumber(source.refreshInterval, 5, 3, 60)),
    opacity: clampNumber(source.opacity, 0.92, 0.35, 1),
    alwaysOnTop: typeof source.alwaysOnTop === 'boolean' ? source.alwaysOnTop : true,
    bounds: validBounds(source.bounds)
  };
}

function loadConfig(filePath) {
  try {
    return sanitizeConfig(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  } catch (_error) {
    return defaultConfig();
  }
}

function replaceWindowsFile(temporaryPath, filePath, backupPath) {
  const script = "$ErrorActionPreference = 'Stop'; [System.IO.File]::Replace($env:STOCK_CONFIG_TEMP, $env:STOCK_CONFIG_DEST, $env:STOCK_CONFIG_BACKUP, $false);";
  const { execFileSync } = require('node:child_process');
  execFileSync('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    script
  ], {
    env: {
      ...process.env,
      STOCK_CONFIG_TEMP: temporaryPath,
      STOCK_CONFIG_DEST: filePath,
      STOCK_CONFIG_BACKUP: backupPath
    },
    stdio: 'ignore'
  });
}

function saveConfig(filePath, config) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const backupPath = `${filePath}.${process.pid}.${Date.now()}.bak`;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(temporaryPath, JSON.stringify(sanitizeConfig(config), null, 2) + '\n', 'utf8');
    if (process.platform === 'win32' && fs.existsSync(filePath)) {
      replaceWindowsFile(temporaryPath, filePath, backupPath);
      fs.rmSync(backupPath, { force: true });
    } else {
      fs.renameSync(temporaryPath, filePath);
    }
  } catch (error) {
    try { fs.rmSync(temporaryPath, { force: true }); } catch (_cleanupError) {}
    try { fs.rmSync(backupPath, { force: true }); } catch (_cleanupError) {}
    throw error;
  }
}

module.exports = { defaultConfig, sanitizeConfig, loadConfig, saveConfig };
