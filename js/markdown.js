function escapeMarkdownHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function markdownUrl(url) {
  var value = String(url).trim();
  return /^(https?:|mailto:)/i.test(value) ? value : '';
}

function renderMarkdownInline(text) {
  var tokens = [];
  var source = String(text).replace(/`([^`]+)`/g, function (_, code) {
    tokens.push('<code>' + escapeMarkdownHtml(code) + '</code>');
    return '\u0000' + (tokens.length - 1) + '\u0000';
  });
  source = escapeMarkdownHtml(source);
  source = source.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g, function (_, alt, url, title) {
    var safeUrl = markdownUrl(url);
    return safeUrl ? '<img src="' + escapeMarkdownHtml(safeUrl) + '" alt="' + escapeMarkdownHtml(alt) + (title ? '" title="' + escapeMarkdownHtml(title) : '') + '">' : escapeMarkdownHtml(alt);
  });
  source = source.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g, function (_, label, url, title) {
    var safeUrl = markdownUrl(url);
    return safeUrl ? '<a href="' + escapeMarkdownHtml(safeUrl) + '" target="_blank" rel="noopener">' + label + '</a>' : label;
  });
  source = source.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '<strong>$1$2</strong>');
  source = source.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  source = source.replace(/\*([^*]+)\*|_([^_]+)_/g, '<em>$1$2</em>');
  return source.replace(/\u0000(\d+)\u0000/g, function (_, index) { return tokens[Number(index)]; });
}

function renderMarkdown(markdown) {
  var lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  var html = [];
  var paragraph = [];
  var listType = '';
  var inCode = false;
  var codeLines = [];

  function flushParagraph() {
    if (paragraph.length) {
      html.push('<p>' + renderMarkdownInline(paragraph.join('\n')).replace(/\n/g, '<br>') + '</p>');
      paragraph = [];
    }
  }

  function closeList() {
    if (listType) {
      html.push('</' + listType + '>');
      listType = '';
    }
  }

  function closeCode() {
    html.push('<pre><code>' + escapeMarkdownHtml(codeLines.join('\n')) + '</code></pre>');
    codeLines = [];
    inCode = false;
  }

  lines.forEach(function (line) {
    var fence = line.match(/^\s*```(?:\w+)?\s*$/);
    if (fence && !inCode) {
      flushParagraph();
      closeList();
      inCode = true;
      return;
    }
    if (fence && inCode) {
      closeCode();
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }
    var heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    var unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    var ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (!line.trim()) {
      flushParagraph();
      closeList();
    } else if (heading) {
      flushParagraph();
      closeList();
      html.push('<h' + heading[1].length + '>' + renderMarkdownInline(heading[2]) + '</h' + heading[1].length + '>');
    } else if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph();
      closeList();
      html.push('<hr>');
    } else if (unordered || ordered) {
      flushParagraph();
      var nextType = unordered ? 'ul' : 'ol';
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        html.push('<' + listType + '>');
      }
      html.push('<li>' + renderMarkdownInline((unordered || ordered)[1]) + '</li>');
    } else if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      closeList();
      html.push('<blockquote>' + renderMarkdownInline(line.replace(/^\s*>\s?/, '')) + '</blockquote>');
    } else {
      paragraph.push(line);
    }
  });

  if (inCode) closeCode();
  flushParagraph();
  closeList();
  return html.join('');
}

function updateMarkdownPreview() {
  var input = document.getElementById('markdownInput');
  var preview = document.getElementById('markdownPreview');
  var stats = document.getElementById('markdownStats');
  var value = input.value;
  preview.innerHTML = value.trim() ? renderMarkdown(value) : '<div class="empty-state">开始输入 Markdown，右侧会实时显示预览</div>';
  stats.textContent = value.length + ' 字符 · ' + (value ? value.split(/\r\n?|\n/).length : 0) + ' 行';
}

function downloadMarkdown() {
  var content = document.getElementById('markdownInput').value;
  var blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '文档.md';
  link.click();
  URL.revokeObjectURL(link.href);
}

function toggleMarkdownFullscreen() {
  var pane = document.getElementById('markdownPreviewPane');
  var button = document.getElementById('markdownFullscreenBtn');
  pane.classList.toggle('markdown-fullscreen');
  var active = pane.classList.contains('markdown-fullscreen');
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  button.setAttribute('aria-label', active ? '退出全屏预览' : '全屏预览');
  button.innerHTML = '<i class="fas fa-' + (active ? 'compress' : 'expand') + '"></i> ' + (active ? '退出全屏' : '全屏');
}

if (typeof document !== 'undefined') {
  var markdownInput = document.getElementById('markdownInput');
  markdownInput.addEventListener('input', updateMarkdownPreview);
  document.getElementById('markdownFileInput').addEventListener('change', function (event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      markdownInput.value = reader.result;
      updateMarkdownPreview();
    };
    reader.readAsText(file, 'utf-8');
    event.target.value = '';
  });
  document.getElementById('markdownOpenBtn').addEventListener('click', function () { document.getElementById('markdownFileInput').click(); });
  document.getElementById('markdownDownloadBtn').addEventListener('click', downloadMarkdown);
  document.getElementById('markdownClearBtn').addEventListener('click', function () { markdownInput.value = ''; updateMarkdownPreview(); });
  document.getElementById('markdownFullscreenBtn').addEventListener('click', toggleMarkdownFullscreen);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && document.getElementById('markdownPreviewPane').classList.contains('markdown-fullscreen')) toggleMarkdownFullscreen();
  });
  updateMarkdownPreview();
}
