const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function loadMarkdownRenderer() {
  const source = fs.readFileSync('js/markdown.js', 'utf8');
  const context = {};
  vm.runInNewContext(source, context);
  return context.renderMarkdown;
}

test('renders common Markdown blocks and inline styles', () => {
  const renderMarkdown = loadMarkdownRenderer();
  const html = renderMarkdown('# 标题\n\n**重点** 和 `代码`\n\n- 第一项\n- 第二项');

  assert.match(html, /<h1>标题<\/h1>/);
  assert.match(html, /<strong>重点<\/strong>/);
  assert.match(html, /<code>代码<\/code>/);
  assert.match(html, /<ul>[\s\S]*<li>第一项<\/li>[\s\S]*<\/ul>/);
});

test('escapes raw HTML and unsafe link protocols', () => {
  const renderMarkdown = loadMarkdownRenderer();
  const html = renderMarkdown('<script>alert(1)<\/script>\n\n[危险](javascript:alert(1))');

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /javascript:/i);
});

test('toggles the preview pane fullscreen state', () => {
  const elements = {};
  const classNames = new Set();
  const classList = {
    toggle(name) {
      if (classNames.has(name)) classNames.delete(name);
      else classNames.add(name);
    },
    contains(name) {
      return classNames.has(name);
    }
  };
  ['markdownInput', 'markdownPreview', 'markdownStats', 'markdownFileInput', 'markdownOpenBtn', 'markdownDownloadBtn', 'markdownClearBtn', 'markdownPreviewPane', 'markdownFullscreenBtn'].forEach((id) => {
    elements[id] = { value: '', textContent: '', innerHTML: '', classList, addEventListener() {}, click() {}, setAttribute() {} };
  });
  const context = {
    document: {
      getElementById(id) { return elements[id]; },
      addEventListener() {}
    }
  };
  vm.runInNewContext(fs.readFileSync('js/markdown.js', 'utf8'), context);

  context.toggleMarkdownFullscreen();
  assert.equal(classList.contains('markdown-fullscreen'), true);
  context.toggleMarkdownFullscreen();
  assert.equal(classList.contains('markdown-fullscreen'), false);
});
