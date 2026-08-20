const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function loadNav() {
  const storage = new Map();
  const favoriteButton = { classList: { toggle() {} }, setAttribute() {}, addEventListener() {}, innerHTML: '' };
  const navGrid = { style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, addEventListener() {}, appendChild() {} };
  const cards = [
    { dataset: { tool: 'hash' }, addEventListener() {}, insertAdjacentHTML() {}, setAttribute() {}, querySelector(selector) { if (selector === '.nav-favorite') return favoriteButton; return selector === '.nav-name' ? { textContent: 'Hash 工具' } : { textContent: 'MD5/SHA 系列' }; } },
    { dataset: { tool: 'cron' }, addEventListener() {}, insertAdjacentHTML() {}, setAttribute() {}, querySelector(selector) { if (selector === '.nav-favorite') return favoriteButton; return selector === '.nav-name' ? { textContent: 'Cron 解析器' } : { textContent: '执行时间预览' }; } }
  ];
  const context = {
    document: {
      getElementById(id) { return id === 'navView' ? navGrid : { style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, addEventListener() {}, querySelectorAll() { return []; }, textContent: '', innerHTML: '', hidden: false }; },
      querySelectorAll(selector) { return selector === '.nav-card' ? cards : []; },
      addEventListener() {}
    },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    location: { hash: '#/' },
    window: { addEventListener() {}, scrollTo() {}, location: { hash: '#/' } },
    navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
    setInterval() {},
    setTimeout() {}
  };
  vm.runInNewContext(fs.readFileSync('js/nav.js', 'utf8'), context);
  return { context, cards, storage };
}

test('filters navigation cards by name and description', () => {
  const { context, cards } = loadNav();

  context.filterNavCards('cron');

  assert.equal(cards[0].hidden, true);
  assert.equal(cards[1].hidden, false);
});

test('records recent tools newest first without duplicates', () => {
  const { context, storage } = loadNav();

  context.recordRecentTool('hash');
  context.recordRecentTool('cron');
  context.recordRecentTool('hash');

  assert.deepEqual(JSON.parse(storage.get('toolbox_recent_tools')), ['hash', 'cron']);
});
