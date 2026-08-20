# Toolbox UX Round One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve tool discovery and repeated use without changing the existing single-page architecture.

**Architecture:** Extend the existing hash navigation in `js/nav.js` with a search field, recent-tool storage, keyboard shortcuts, and shared Toast feedback. Keep tool markup in `index.html`, presentation in `css/style.css`, and preserve the existing global-function/no-build conventions.

**Tech Stack:** Plain HTML, CSS, and browser JavaScript; `localStorage`; existing Node 18+ Markdown test.

**Spec:** Approved UX round-one scope from the conversation: tool search, recently used tools, mobile-friendly navigation, unified feedback, and keyboard shortcuts.

## Global Constraints

- No build system, package manager, backend, or new runtime dependency.
- Keep the interface in Simplified Chinese.
- Use existing CSS variables and support both light and dark themes.
- Preserve hash routes such as `#/tool/xxx` and existing `escapeHtml()` behavior.
- Increment `sw.js` `CACHE_VERSION` for every frontend file change.
- Verify with `node --test tests/markdown.test.js` and manual browser checks.

---

### Task 1: Add Search and Recent Tools

**Files:**
- Modify: `index.html` navigation view markup around `#navView`
- Modify: `js/nav.js` navigation state and tool-opening flow
- Modify: `css/style.css` navigation search and recent-tool styles

**Interfaces:**
- Produces `filterNavCards(query)` for search filtering.
- Produces `recordRecentTool(name)` and `renderRecentTools()` using `localStorage['toolbox_recent_tools']`.
- `showTool(name)` records the tool before changing the hash.

- [ ] Add a search input above `#navView` with placeholder `搜索工具，例如：JSON、时间戳、正则` and a clear button.
- [ ] Add a recent-tools section that is hidden when empty and renders at most six valid tool cards.
- [ ] Filter the normal navigation cards by matching card name or description; show an empty state when no card matches.
- [ ] Store recent tool IDs newest-first, remove duplicates, discard unknown IDs, and tolerate malformed localStorage.
- [ ] Add CSS for the input, clear action, recent cards, hidden state, and no-results state using existing variables.
- [ ] Manually verify search, clear, recent ordering, refresh persistence, dark theme, and direct hash navigation.

### Task 2: Make Navigation Touch-Friendly

**Files:**
- Modify: `index.html` navigation card controls
- Modify: `js/nav.js` drag-order and recent-tool interactions
- Modify: `css/style.css` responsive navigation styles

**Interfaces:**
- Produces `toggleNavFavorite(name)` using `localStorage['toolbox_favorite_tools']`.

- [ ] Keep desktop drag sorting, but avoid relying on HTML drag events for mobile ordering.
- [ ] Add a small favorite control to each card with an accessible label and stop propagation so it does not open the tool.
- [ ] Render favorite cards first while preserving the saved order inside favorite/non-favorite groups.
- [ ] Add touch-sized controls and responsive search/recent layouts for screens up to 600px.
- [ ] Manually verify tapping a favorite does not open the tool, cards remain keyboard reachable, and desktop drag sorting still works.

### Task 3: Add Shared Toast Feedback

**Files:**
- Modify: `index.html` near the end of `<body>` for the Toast host
- Modify: `js/nav.js` for global `showToast(message, type)`
- Modify: `css/style.css` for Toast presentation

**Interfaces:**
- Produces global `showToast(message, type)` where `type` is `success`, `error`, or `info` and defaults to `info`.

- [ ] Add one fixed Toast host with `role="status"` and `aria-live="polite"`.
- [ ] Implement one visible Toast at a time, auto-hide after four seconds, and allow the next message to replace the current one.
- [ ] Add success/error/info styles that use existing theme variables and remain readable on mobile.
- [ ] Update the shared copy handler to call `showToast('已复制')` on success and `showToast('复制失败，请手动复制', 'error')` on fallback failure.
- [ ] Manually verify copy feedback from at least two tools and verify Toast does not block card clicks.

### Task 4: Add Keyboard Shortcuts and Consistent View Exit

**Files:**
- Modify: `js/nav.js` keyboard and view navigation
- Modify: `css/style.css` focus-visible and shortcut hint styles

- [ ] Add a document keydown handler: `/` focuses the search input outside editable fields, `Escape` returns to the navigation view from a tool, and `Enter` opens a focused nav card.
- [ ] Ignore shortcuts while the active element is an input, textarea, select, or contenteditable element.
- [ ] Add visible `:focus-visible` styles for cards, buttons, inputs, and the back control.
- [ ] Add a compact search shortcut hint that is hidden or adapted on narrow screens.
- [ ] Manually verify shortcuts in navigation and tool views without interfering with text editing.

### Task 5: Update Cache and Verify the Round

**Files:**
- Modify: `sw.js` `CACHE_VERSION`
- Test: `tests/markdown.test.js`

- [ ] Increment `CACHE_VERSION` once after all frontend edits and confirm changed frontend files remain in `PRECACHE_URLS` where applicable.
- [ ] Run `node --test tests/markdown.test.js` from the repository root and confirm all tests pass.
- [ ] Run `git diff --check` and manually test desktop and mobile viewport behavior through a local server.
- [ ] Verify direct routes, browser back/forward, light/dark theme, malformed localStorage, and offline launch behavior.
