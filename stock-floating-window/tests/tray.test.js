const test = require('node:test');
const assert = require('node:assert/strict');
const { syncTrayMenuItem } = require('../src/tray');

test('synchronizes the tray always-on-top checkbox with the config value', () => {
  const item = { checked: true };

  syncTrayMenuItem(item, false);

  assert.equal(item.checked, false);
});
