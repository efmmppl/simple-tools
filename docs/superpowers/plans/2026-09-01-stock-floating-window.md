# A 股实时行情悬浮窗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent Electron Windows floating window that refreshes a local A-share watchlist, supports transparency and always-on-top behavior, and minimizes to the system tray.

**Architecture:** Keep the existing `0710` browser toolbox unchanged and create an isolated `stock-floating-window/` application. The Electron main process owns the window, tray, persisted settings, and IPC; a preload bridge exposes only explicit window and configuration operations; the renderer owns the compact watchlist UI; a separate quote module normalizes symbols and parses the public Tencent quote response.

**Tech Stack:** Electron, plain HTML/CSS/JavaScript, Node.js built-in test runner, Electron Builder, JSON configuration in Electron `userData`.

**Spec:** `docs/superpowers/specs/2026-09-01-stock-floating-window-design.md`

## Global Constraints

- Support only Shanghai and Shenzhen stocks and ETFs in the first version.
- Default quote refresh interval is 5 seconds; accepted range is 3-60 seconds.
- Preserve the last valid quote when a later request fails.
- Do not expose Node.js or Electron APIs directly to the renderer.
- Store watchlist, window state, opacity, refresh interval, and always-on-top state locally only.
- Do not implement charts, indicators, alerts, sound notifications, cloud sync, login, Level-2, or order placement.
- Use the existing Tencent public quote endpoint, but label returned timestamps accurately and do not claim broker-grade real-time data.

---

### Task 1: Create Electron Application Shell

**Files:**
- Create: `stock-floating-window/package.json`
- Create: `stock-floating-window/main.js`
- Create: `stock-floating-window/preload.js`
- Create: `stock-floating-window/src/index.html`
- Create: `stock-floating-window/src/styles.css`
- Create: `stock-floating-window/src/renderer.js`

**Interfaces:**
- Produces an Electron app with `npm start` and a renderer that can load without Node integration.
- `preload.js` exposes `window.stockWidget.window` with `setAlwaysOnTop(value)`, `setOpacity(value)`, `hide()`, `show()`, and `close()`.

- [ ] **Step 1: Add the package manifest and scripts**

Create a private package named `stock-floating-window` with Electron as a dev dependency and these scripts: `start: electron .`, `test: node --test tests`, `dist: electron-builder --win`, and `pack: electron-builder --win portable`.

- [ ] **Step 2: Create the minimal secure BrowserWindow**

In `main.js`, create a 360x300 frameless window with `transparent: true`, `resizable: true`, `alwaysOnTop: true`, `contextIsolation: true`, `nodeIntegration: false`, and `preload` pointing to `preload.js`. Load `src/index.html` and persist position and size on `close` through a configuration helper introduced in Task 3.

- [ ] **Step 3: Add the preload bridge**

Use `contextBridge.exposeInMainWorld('stockWidget', ...)` and `ipcRenderer.invoke` for named operations only. Do not expose `ipcRenderer`, `require`, filesystem access, or arbitrary IPC channels.

- [ ] **Step 4: Add the renderer shell and drag regions**

Create semantic markup for a title bar, status text, action buttons, settings panel, add-symbol form, watchlist container, and empty/error states. Mark only the title-bar background as `-webkit-app-region: drag`; mark every button and input as `no-drag`.

- [ ] **Step 5: Add baseline responsive styling**

Use a translucent dark-neutral card with readable red/green quote values, compact spacing, focus-visible states, and a media rule that lets the list fill narrow windows without horizontal scrolling.

- [ ] **Step 6: Start the shell and verify it loads**

Run `npm install` and `npm start` in `stock-floating-window`. Verify the frameless transparent window opens, can be dragged by the title bar, and does not expose `require` in the renderer console.

- [ ] **Step 7: Commit the shell**

```bash
git add stock-floating-window
git commit -m "feat: add stock floating window shell"
```

### Task 2: Implement and Test Quote Normalization

**Files:**
- Create: `stock-floating-window/src/quote.js`
- Create: `stock-floating-window/tests/quote.test.js`

**Interfaces:**
- `normalizeSymbol(input): string | null` returns `sh`/`sz` plus six digits or `null`; reject Beijing symbols in the first version.
- `buildQuoteUrl(symbols): string` returns one Tencent batch quote URL.
- `parseQuoteResponse(json, symbols): Array<{symbol,name,price,previousClose,change,changePercent,time}>` returns valid rows and skips malformed rows.
- `isMarketClosed(date): boolean` returns the local A-share session status for display purposes.

- [ ] **Step 1: Write failing normalization tests**

Cover `600519 -> sh600519`, `000858 -> sz000858`, accepted prefixed values, whitespace and punctuation cleanup, invalid lengths, and rejected `8xxxxx`/`bj` values.

- [ ] **Step 2: Run the focused tests and verify failure**

Run `npm test -- --test-name-pattern="normalizeSymbol"` from `stock-floating-window`. Expected result: failing tests because `quote.js` does not yet exist.

- [ ] **Step 3: Implement normalization and URL construction**

Use the existing `0710/js/stock.js` prefix rules for Shanghai and Shenzhen, return `null` for all unsupported values, and URL-encode the comma-separated symbol list.

- [ ] **Step 4: Write failing parser tests**

Fixture-test a Tencent response containing two valid rows, one missing row, a negative change, a zero previous close, malformed numeric fields, and the timestamp format used by the existing stock tool. Assert that numeric fields are numbers or `null`, not formatted strings.

- [ ] **Step 5: Implement response parsing**

Read `json.data[symbol].qt[symbol]`, map the known quote indexes used in `0710/js/stock.js`, calculate percentage only when a valid previous close exists, and format the timestamp into a display-ready string without inventing a time.

- [ ] **Step 6: Add market-session tests and implementation**

Test weekday morning session, weekday lunch break, weekday afternoon session, weekend, and a boundary value. Keep holidays out of this helper; the returned quote timestamp remains authoritative.

- [ ] **Step 7: Run all quote tests**

Run `npm test -- tests/quote.test.js`. Expected result: all normalization, URL, parser, and market-session tests pass.

- [ ] **Step 8: Commit the quote module**

```bash
git add stock-floating-window/src/quote.js stock-floating-window/tests/quote.test.js
git commit -m "feat: add batch A-share quote parser"
```

### Task 3: Add Local Configuration and Main-Process IPC

**Files:**
- Create: `stock-floating-window/src/config.js`
- Modify: `stock-floating-window/main.js`
- Modify: `stock-floating-window/preload.js`
- Modify: `stock-floating-window/tests/config.test.js`

**Interfaces:**
- `defaultConfig(): Config` returns `{ symbols: [], refreshInterval: 5, opacity: 0.92, alwaysOnTop: true, bounds: null }`.
- `sanitizeConfig(value): Config` clamps interval to 3-60, opacity to 0.35-1, removes duplicate/invalid symbols, and validates bounds.
- `loadConfig(filePath): Config` returns defaults when the file is absent or invalid.
- `saveConfig(filePath, config): void` writes atomically through a temporary file and rename.
- Preload methods `getConfig()`, `saveConfig(config)`, `setAlwaysOnTop(value)`, `setOpacity(value)`, `hide()`, `show()`, and `close()` map to fixed IPC channels.

- [ ] **Step 1: Write failing config tests**

Test defaults, interval/opacity clamping, duplicate removal, invalid symbol removal, malformed JSON fallback, and atomic save/read round-trip using a temporary test directory.

- [ ] **Step 2: Implement config sanitization and persistence**

Store JSON under `app.getPath('userData')/config.json`; never use a repository-relative path in production. Make save failures throw so the renderer can show a clear status instead of claiming persistence succeeded.

- [ ] **Step 3: Run config tests and fix failures**

Run `npm test -- tests/config.test.js`. Expected result: all config tests pass.

- [ ] **Step 4: Wire fixed IPC handlers**

Register handlers in `main.js` for configuration load/save and window operations. Validate values again in the main process before applying opacity, bounds, or always-on-top state.

- [ ] **Step 5: Add startup and shutdown state handling**

Load sanitized config before creating the window, apply saved bounds only when they intersect an available display, and save current bounds plus settings before quitting.

- [ ] **Step 6: Commit configuration and IPC**

```bash
git add stock-floating-window/src/config.js stock-floating-window/main.js stock-floating-window/preload.js stock-floating-window/tests/config.test.js
git commit -m "feat: persist widget settings through secure IPC"
```

### Task 4: Implement Watchlist Refresh and Renderer Interactions

**Files:**
- Modify: `stock-floating-window/src/renderer.js`
- Modify: `stock-floating-window/src/index.html`
- Modify: `stock-floating-window/src/styles.css`
- Modify: `stock-floating-window/src/quote.js`
- Create: `stock-floating-window/tests/watchlist.test.js`

**Interfaces:**
- `createWatchlistState(config): {symbols, quotes, lastSuccessAt, error}`.
- `refreshQuotes(symbols, fetchImpl): Promise<QuoteResult>` performs one batch request and returns parsed rows or a typed error.
- `formatQuoteRow(quote): string` returns escaped markup for one quote row.
- `addSymbol(input, state, resolveSymbol): Promise<void>` validates and adds a non-duplicate symbol.
- `removeSymbol(symbol, state): void` removes a symbol and its cached quote.

- [ ] **Step 1: Write failing watchlist tests**

Test one batch request for multiple symbols, successful quote updates, preserving old rows on refresh failure, adding normalized symbols, rejecting duplicates and unsupported input, removing a row, and escaping API-provided names.

- [ ] **Step 2: Implement the refresh service**

Use `fetch` with an `AbortController` timeout of 4 seconds. Return a typed network/response error, never replace valid cached quotes with empty values, and expose the service without depending on DOM globals.

- [ ] **Step 3: Implement list state and rendering**

Render each row with name, uppercase display code, price, signed change, signed percentage, and quote time. Use `textContent` or an escaping helper for all external values; assign direction classes from numeric change.

- [ ] **Step 4: Implement add/remove and persistence interactions**

On add, call the quote endpoint for the new symbol, reject unknown symbols, append valid symbols, save config, and refresh the full list. On remove, update state, save config, and render the empty state when appropriate.

- [ ] **Step 5: Implement the refresh timer**

Start one timer after config load, call an immediate refresh, rebuild the timer whenever the interval changes, and stop it while the window is hidden if the renderer receives a visibility event. Show `就绪`, `更新于 HH:mm:ss`, `连接失败`, or `非交易时段` based on state.

- [ ] **Step 6: Run watchlist tests**

Run `npm test -- tests/watchlist.test.js`. Expected result: all service/state tests pass without requiring Electron.

- [ ] **Step 7: Commit watchlist behavior**

```bash
git add stock-floating-window/src/index.html stock-floating-window/src/styles.css stock-floating-window/src/renderer.js stock-floating-window/src/quote.js stock-floating-window/tests/watchlist.test.js
git commit -m "feat: add resilient stock watchlist refresh"
```

### Task 5: Add Transparency, Always-on-Top, Settings, and Tray UX

**Files:**
- Modify: `stock-floating-window/src/index.html`
- Modify: `stock-floating-window/src/styles.css`
- Modify: `stock-floating-window/src/renderer.js`
- Modify: `stock-floating-window/main.js`

**Interfaces:**
- Settings controls call `window.stockWidget.window.setOpacity(value)` and `setAlwaysOnTop(value)` and persist the resulting config.
- Closing the window hides it; tray exit sets an explicit `isQuitting` flag and then calls `app.quit()`.

- [ ] **Step 1: Add settings controls**

Add a refresh interval number/select control constrained to 3-60, an opacity range control constrained to 35-100%, an always-on-top checkbox, and a reset/close settings button. Reflect values immediately in controls.

- [ ] **Step 2: Wire settings to the preload API**

Apply opacity and topmost changes immediately, rebuild the refresh timer for interval changes, save each valid change, and display a temporary save error if IPC rejects the operation.

- [ ] **Step 3: Implement tray lifecycle**

Create a tray icon from an application asset, add menu items for `显示窗口`, `立即刷新`, `始终置顶`, and `退出`, and make the window close handler call `event.preventDefault()` plus `hide()` unless the explicit quit flag is set.

- [ ] **Step 4: Verify focused interaction behavior**

Run `npm start` and manually verify drag, title-bar buttons, transparency, topmost toggling, settings persistence after restart, tray restoration, immediate refresh, and real exit.

- [ ] **Step 5: Commit desktop controls**

```bash
git add stock-floating-window/src/index.html stock-floating-window/src/styles.css stock-floating-window/src/renderer.js stock-floating-window/main.js
git commit -m "feat: add tray and floating window controls"
```

### Task 6: Package, Document, and Run Full Verification

**Files:**
- Create: `stock-floating-window/assets/tray.ico`
- Modify: `stock-floating-window/package.json`
- Create: `stock-floating-window/README.md`
- Create: `stock-floating-window/tests/smoke.test.js`

**Interfaces:**
- `npm test` runs every pure Node test.
- `npm run dist` creates a Windows installer under `dist/`.
- `npm run pack` creates a Windows portable executable under `dist/`.

- [ ] **Step 1: Add a deterministic smoke test**

Test that a fixture configuration with two symbols survives sanitize/save/load and that a mocked batch response produces two display-ready rows. Keep this test independent from network and Electron.

- [ ] **Step 2: Configure Electron Builder**

Set the application ID, product name, Windows NSIS target, portable target, output directory, and tray icon in `package.json`. Exclude tests and development files from the packaged application.

- [ ] **Step 3: Write the user README**

Document installation, portable execution, adding A-share codes, refresh and opacity settings, tray behavior, data-source limitations, and the fact that quote data is informational only.

- [ ] **Step 4: Run automated verification**

Run `npm test` from `stock-floating-window`. Expected result: all tests pass. Run `npm run dist` and `npm run pack`; expected result: both Windows artifacts are generated without packaging errors.

- [ ] **Step 5: Run manual acceptance verification**

Launch the packaged application in a clean Windows user profile. Verify empty state, add/remove, multiple rows, 5-second refresh, network failure retaining old data, transparency, topmost, drag, tray hide/restore/exit, restart persistence, and a window position on a second display.

- [ ] **Step 6: Commit packaging and documentation**

```bash
git add stock-floating-window
git commit -m "chore: package stock floating window"
```

## Self-Review

- Spec coverage: the six tasks cover the independent app shell, A-share quote scope, watchlist, refresh interval, transparency, topmost, drag, local persistence, tray lifecycle, stale-data handling, tests, and installer/portable packaging.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation step is used.
- Interface consistency: `normalizeSymbol`, `buildQuoteUrl`, `parseQuoteResponse`, `defaultConfig`, `sanitizeConfig`, `loadConfig`, `saveConfig`, `refreshQuotes`, `createWatchlistState`, `formatQuoteRow`, `addSymbol`, and `removeSymbol` are defined before their consumers.
- Scope check: charts, alerts, technical analysis, authentication, synchronization, and trading are explicitly excluded and do not appear in implementation tasks.
