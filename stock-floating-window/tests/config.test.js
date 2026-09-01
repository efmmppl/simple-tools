const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {
  defaultConfig,
  sanitizeConfig,
  loadConfig,
  saveConfig
} = require('../src/config');

test('returns the documented default configuration', () => {
  assert.deepEqual(defaultConfig(), {
    symbols: [],
    refreshInterval: 5,
    opacity: 0.92,
    alwaysOnTop: true,
    bounds: null
  });
});

test('clamps settings, removes duplicate and invalid symbols, and validates bounds', () => {
  assert.deepEqual(sanitizeConfig({
    symbols: ['600519', 'sh600519', '000858', 'bj830001', 'bad'],
    refreshInterval: 100,
    opacity: 0.1,
    alwaysOnTop: false,
    bounds: { x: 10, y: 20, width: 360, height: 300 }
  }), {
    symbols: ['sh600519', 'sz000858'],
    refreshInterval: 60,
    opacity: 0.35,
    alwaysOnTop: false,
    bounds: { x: 10, y: 20, width: 360, height: 300 }
  });

  assert.equal(sanitizeConfig({ refreshInterval: 0, opacity: 2 }).refreshInterval, 3);
  assert.equal(sanitizeConfig({ refreshInterval: 'invalid', opacity: 'invalid' }).opacity, 0.92);
  assert.equal(sanitizeConfig({ alwaysOnTop: 'false' }).alwaysOnTop, true);
  assert.equal(sanitizeConfig({ bounds: { x: 0, y: 0, width: 0, height: 300 } }).bounds, null);
  assert.equal(sanitizeConfig({ bounds: { x: 0, y: 0, width: 360, height: 300, evil: true } }).bounds, null);
});

test('falls back to defaults for absent and malformed configuration files', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-config-'));
  const missing = path.join(directory, 'missing.json');
  const malformed = path.join(directory, 'malformed.json');
  fs.writeFileSync(malformed, '{not json');

  assert.deepEqual(loadConfig(missing), defaultConfig());
  assert.deepEqual(loadConfig(malformed), defaultConfig());
});

test('saves atomically and reads back a sanitized configuration', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-config-'));
  const filePath = path.join(directory, 'config.json');
  const config = sanitizeConfig({ symbols: ['600519'], opacity: 0.5 });

  saveConfig(filePath, config);

  assert.deepEqual(loadConfig(filePath), config);
  assert.equal(fs.readdirSync(directory).filter((name) => name.includes('.tmp')).length, 0);
});

test('preload exposes only fixed configuration and window IPC methods', () => {
  const calls = [];
  const context = {
    require(name) {
      assert.equal(name, 'electron');
      return {
        contextBridge: { exposeInMainWorld(name, api) { context.exposed = { name, api }; } },
        ipcRenderer: { invoke(channel, value) { calls.push([channel, value]); } }
      };
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8'), context);

  assert.equal(context.exposed.name, 'stockWidget');
  context.exposed.api.getConfig();
  context.exposed.api.saveConfig({});
  context.exposed.api.window.setAlwaysOnTop(true);
  context.exposed.api.window.setOpacity(0.5);
  context.exposed.api.window.hide();
  context.exposed.api.window.show();
  context.exposed.api.window.close();
  assert.deepEqual(calls, [
    ['config:get', undefined],
    ['config:save', {}],
    ['window:set-always-on-top', true],
    ['window:set-opacity', 0.5],
    ['window:hide', undefined],
    ['window:show', undefined],
    ['window:close', undefined]
  ]);
});
