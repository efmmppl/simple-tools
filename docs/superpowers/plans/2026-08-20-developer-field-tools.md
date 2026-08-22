# 开发现场工具第一批实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在工具箱中新增日志分析器、API 请求工作台和环境变量对比器三个开发相关工具。

**Architecture:** 每个工具使用独立的 `js/*.js` 文件和 `index.html` 工具视图，沿用现有全局函数、字符串拼接和 `nav.js` hash 路由。日志与环境变量工具完全本地处理；API 工具仅在用户主动点击发送时使用浏览器 `fetch`，并将 CORS/网络错误显示在结果区域。

**Tech Stack:** 原生 HTML、CSS、JavaScript、浏览器 Fetch/Web Crypto API、Node 18 内置测试运行器。

**Spec:** 已在对话中确认的“开发现场”第一批功能范围。

## Global Constraints

- 界面和文案使用简体中文。
- 不新增第三方依赖或构建步骤。
- 新增脚本使用 `charset="UTF-8"`，加载顺序位于 `js/nav.js` 之后。
- 样式使用现有 CSS 变量，兼容亮色和暗色主题。
- 用户粘贴的日志、配置和 API 数据默认不上传；API 请求只在点击发送后执行。
- 修改前端文件后递增 `sw.js` 的 `CACHE_VERSION`，并更新 `PRECACHE_URLS`。

### Task 1: Register developer tools

**Files:**
- Modify: `index.html` navigation cards and tool views
- Modify: `js/nav.js` only if shared navigation behavior needs registration
- Modify: `css/style.css` shared tool styles and developer category layout
- Modify: `README.md` tool list
- Modify: `sw.js` cache version and precache URLs

**Interfaces:**
- Produces cards with `data-tool="log-analyzer"`, `data-tool="api-workbench"`, and `data-tool="env-compare"`, all using `data-category="dev"`.
- Produces views `#tool-log-analyzer`, `#tool-api-workbench`, and `#tool-env-compare`.

- [x] Add three navigation cards under the existing 开发效率 category with icons and descriptions.
- [x] Add empty tool-view shells whose IDs match the card names.
- [x] Add `js/log-analyzer.js`, `js/api-workbench.js`, and `js/env-compare.js` after `js/nav.js`.
- [x] Add the three tools to `README.md`, increment the cache version, and add all new assets to `PRECACHE_URLS`.
- [x] Run `node --test tests/nav.test.js tests/markdown.test.js` and confirm the navigation still loads.

### Task 2: Log analyzer

**Files:**
- Create: `js/log-analyzer.js`
- Modify: `index.html` log analyzer view
- Modify: `css/style.css` log analyzer styles
- Test: `tests/dev-tools.test.js`

**Interfaces:**
- Produces global `analyzeLogs(text)` returning `{ total, errors, warnings, groups, lines }`.
- Produces global `renderLogAnalysis(result)` for the result panel.

- [x] Add a failing test for extracting error/warning counts, grouping identical normalized messages, and preserving the original line count.
- [x] Run `node --test tests/dev-tools.test.js` and verify the failure is caused by the missing analyzer.
- [x] Implement line classification for case-insensitive `error|fatal|exception` and `warn|warning`, normalize timestamps/request IDs before grouping, and leave unmatched lines in a general group.
- [x] Add paste textarea, analyze button, clear button, summary counters, grouped result list, and empty/error states.
- [x] Run the focused test, then the full test command.

### Task 3: API request workbench

**Files:**
- Create: `js/api-workbench.js`
- Modify: `index.html` API workbench view
- Modify: `css/style.css` API workbench styles
- Test: `tests/dev-tools.test.js`

**Interfaces:**
- Produces global `buildApiRequestCode(method, url, headers, body)` returning `{ curl, fetch, python }`.
- Produces global `parseApiHeaders(text)` returning an object of header names to values.

- [x] Add failing tests for header parsing and generated `curl`/`fetch`/Python code.
- [x] Run the focused test and verify it fails before implementation.
- [x] Implement method, URL, query, headers, JSON body controls and code generation without sending a request.
- [x] Add explicit Send action using `fetch`, response status/time/body rendering, JSON pretty-printing, and a clear CORS/network error message.
- [x] Ensure body parsing errors are shown before fetch and no request occurs on invalid JSON.
- [x] Run focused and full tests.

### Task 4: Environment variable comparer

**Files:**
- Create: `js/env-compare.js`
- Modify: `index.html` environment comparer view
- Modify: `css/style.css` environment comparer styles
- Test: `tests/dev-tools.test.js`

**Interfaces:**
- Produces global `parseEnvText(text)` returning `{ keys, values }`.
- Produces global `compareEnvFiles(exampleText, actualText)` returning `{ missing, extra, empty, matched }`.

- [x] Add failing tests for comments, blank lines, quoted values, missing variables, extra variables, and empty values.
- [x] Run the focused test and verify it fails before implementation.
- [x] Implement local parsing without exposing actual values in comparison output.
- [x] Add two textareas, compare/clear buttons, summary counts, categorized result tables, and copyable variable names.
- [x] Run focused and full tests.

### Task 5: Integration verification

**Files:**
- Modify: `tests/dev-tools.test.js` only for discovered regression cases

- [x] Run `node --test tests/markdown.test.js tests/nav.test.js tests/dev-tools.test.js`.
- [x] Run `git diff --check`.
- [x] Confirm `grep` finds all three new scripts in `index.html` after `js/nav.js` and all three URLs in `sw.js`.
- [ ] Open `index.html` through `python -m http.server 8000` and manually verify navigation, theme switching, category filtering, mobile layout, log grouping, API error handling, and env comparison.
