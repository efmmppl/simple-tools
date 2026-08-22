const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function loadNav() {
  const storage = new Map();
  const favoriteButton = { classList: { toggle() {} }, setAttribute() {}, addEventListener() {}, innerHTML: '' };
  const appendedCards = [];
  const navGrid = { style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, addEventListener() {}, appendChild(card) { appendedCards.push(card.dataset.tool); } };
  const navLayout = { classList: { toggle() {} } };
  const favoriteSection = { hidden: true, classList: { toggle() {} } };
  const favoriteList = { innerHTML: '', querySelectorAll() { return []; } };
  const navSearch = { value: '', addEventListener() {} };
  const cards = [
    { dataset: { tool: 'hash', category: 'code' }, addEventListener() {}, insertAdjacentHTML() {}, setAttribute() {}, querySelector(selector) { if (selector === '.nav-favorite') return favoriteButton; return selector === '.nav-name' ? { textContent: 'Hash 工具' } : { textContent: 'MD5/SHA 系列' }; } },
    { dataset: { tool: 'cron', category: 'efficiency' }, addEventListener() {}, insertAdjacentHTML() {}, setAttribute() {}, querySelector(selector) { if (selector === '.nav-favorite') return favoriteButton; return selector === '.nav-name' ? { textContent: 'Cron 解析器' } : { textContent: '执行时间预览' }; } }
  ];
  const context = {
    document: {
      getElementById(id) {
        if (id === 'navView') return navGrid;
        if (id === 'navLayout') return navLayout;
        if (id === 'favoriteTools') return favoriteSection;
        if (id === 'favoriteToolsList') return favoriteList;
        if (id === 'navSearch') return navSearch;
        return { style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, addEventListener() {}, querySelectorAll() { return []; }, textContent: '', innerHTML: '', hidden: false };
      },
      querySelector(selector) { return selector === '.nav-layout' ? navLayout : null; },
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
  return { context, cards, storage, favoriteSection, favoriteList, navSearch, appendedCards };
}

test('filters navigation cards by name and description', () => {
  const { context, cards } = loadNav();

  context.filterNavCards('cron');

  assert.equal(cards[0].hidden, true);
  assert.equal(cards[1].hidden, false);
});

test('filters navigation cards by category', () => {
  const { context, cards } = loadNav();

  context.filterNavCategory('code');

  assert.equal(cards[0].hidden, false);
  assert.equal(cards[1].hidden, true);
});

test('records recent tools newest first without duplicates', () => {
  const { context, storage } = loadNav();

  context.recordRecentTool('hash');
  context.recordRecentTool('cron');
  context.recordRecentTool('hash');

  assert.deepEqual(JSON.parse(storage.get('toolbox_recent_tools')), ['hash', 'cron']);
});

test('renders favorite tools in saved order and hides them while searching', () => {
  const { context, storage, favoriteSection, favoriteList, navSearch } = loadNav();

  storage.set('toolbox_favorite_tools', JSON.stringify(['cron', 'hash']));
  context.renderFavoriteTools();

  assert.equal(favoriteSection.hidden, false);
  assert.match(favoriteList.innerHTML, /Cron 解析器/);
  assert.ok(favoriteList.innerHTML.indexOf('Cron 解析器') < favoriteList.innerHTML.indexOf('Hash 工具'));

  navSearch.value = 'cron';
  context.filterNavCards(navSearch.value);
  assert.equal(favoriteSection.hidden, true);
});

test('toggling a favorite does not reorder navigation cards', () => {
  const { context, appendedCards } = loadNav();

  appendedCards.length = 0;
  context.toggleNavFavorite('cron');

  assert.deepEqual(appendedCards, []);
});
