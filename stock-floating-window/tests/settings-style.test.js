const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('hidden settings panel overrides its flex display rule', () => {
  const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

  assert.match(styles, /\.settings-panel\s*\{[^}]*display:\s*flex\b/);
  assert.match(styles, /\.settings-panel\[hidden\]\s*\{[^}]*display:\s*none\s*!important\s*;/);
});
