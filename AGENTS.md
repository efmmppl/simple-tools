# AGENTS.md — 工具箱

## 项目本质

纯前端单页应用，无构建、无包管理、无后端。浏览器打开 `index.html` 即可运行。

## 开发与测试

- 直接打开：`start index.html`
- 本地服务器（推荐，避免 `file://` 下的 CORS 与 WebRTC 限制）：
  ```bash
  python -m http.server 8000
  # 或
  npx serve
  ```
- 无 lint / test / typecheck 命令。验证方式：用浏览器实际打开对应功能页面。
- 本地验证热榜抓取：`node scripts/fetch-hotlist.js`（Node 18+，依赖内置 `fetch`），输出 `hotlist.json`，格式为 `{ updated: ISO时间戳, data: { biliHot: [...], tieba: [...] } }`。

## 文件约定

- `index.html` — 页面骨架，导航卡片与工具视图均在此。
- `css/style.css` — 全部样式，直接 `<link>` 引入。
- `js/nav.js` — 导航路由、footer 时钟、复制按钮等通用逻辑，**必须第一个加载**。
- `js/*.js` — 每个工具一个文件，按职责拆分。
- `scripts/fetch-hotlist.js` — 热榜抓取脚本，Node.js 18+，无外部依赖。
- `hotlist.json` — 热榜缓存，由 GitHub Actions 生成。
- `.github/workflows/hotlist.yml` — 每日 UTC 22:00（北京时间次日 06:00）抓取热榜并提交（Node 20，`workflow_dispatch` 可手动触发）。注意 README 中写的 UTC 01:00 已过时，以 yml 为准。
- `CNAME` — 自定义域名 `tools.kuak.top`，用于 GitHub Pages。
- `.opencode/opencode.json` — OpenCode 配置（模型、agent 预设）。此目录已入 `.gitignore`，不提交到仓库。

## 添加新工具

1. 在 `index.html` 的 `.nav-grid` 加 `.nav-card` 卡片，`data-tool="xxx"` 唯一。
2. 在 `.tool-view` 区域加 `<div id="tool-xxx" class="tool-view">` 的 HTML。
3. 在底部 `<script>` 列表追加 `<script src="js/xxx.js" charset="UTF-8"></script>`，并新建 `js/xxx.js`。
4. 样式写在 `css/style.css`，遵循 `#fcfaf5` 卡片背景、`#6b8f5e` 主色、`.ts-card/.ts-section/.ts-row` 布局。
5. 在 `README.md` 工具列表追加一行。

## 关键约定

- **语言**：简体中文（界面和提交信息）。
- **图标**：Font Awesome 6.5.1（CDN: `cdnjs.cloudflare.com`）。
- **字体/颜色**：`-apple-system, BlinkMacSystemFont, ...monospace`；暖色米白主题，主色 `#6b8f5e`，正文 `#3d3a35`。
- **不主动提交/推送**：完成修改后只展示结果，除非用户明确说“提交”“推送”或类似指令，否则不执行 `git commit` / `git push`。
- **不要添加注释**，除非代码本身需要说明。
- **外部 JS 必须带 `charset="UTF-8"`**：无 BOM 的 UTF-8 脚本在 `python -m http.server` 下可能被浏览器误判为 GBK，导致中文乱码或脚本异常。
- **无虚拟 DOM**：HTML 用字符串拼接，所有函数在全局作用域，命名驼峰且动词在前（如 `fetchIpInfo`、`parseQuartzCron`）。
- **事件绑定**：每个工具在 `<script>` 末尾用 `addEventListener` 集中绑定。
- **视图激活加载**：数据型工具（`gold.js`、`exchange.js`、`hotlist.js`）用 `MutationObserver` 监听 `#tool-xxx` 的 `class` 属性，进入视图时拉取数据、离开时停止（金价/汇率分别在激活期间每 60s/120s 定时刷新）。新数据工具沿用此模式。
- **共享函数**：`nav.js` 定义全局 `escapeHtml()` 用于 HTML 转义（被 `regex.js`、`base64.js`、`hotlist.js` 使用），新增工具可直接调用。
- **缓存破坏**：部分 JS 文件引用带 ?v=N 后缀，修改后须递增版本号。
- **Web Crypto 不支持 MD5**：`crypto.subtle` 仅有 SHA 系列，MD5 由 `js/filehash.js` 内联实现（RFC 1321，函数 `md5()`，输入 `Uint8Array`）。修改该实现时需用 Node `crypto` 对照测试向量验证。

## 数据获取注意

- 外部 API 用 `fetch()`；金价查询用 `<script>` JSONP 注入绕过 CORS。
- 金价 JSONP：`https://www.huilvbiao.com/api/gold_indexApi?t=<时间戳>`，解析全局 `window.hq_str_gds_AUTD` / `hf_GC` / `hf_XAU`（逗号分隔数组，字段下标见 `gold.js`）。
- 汇率：`fetch('https://open.er-api.com/v6/latest/CNY')`，`rates` 为 1 CNY 兑外币，换算用 `金额 / rates[币种]`。
- 热榜通过 GitHub Actions 运行 `node scripts/fetch-hotlist.js` 生成 `hotlist.json`，前端直接读取（同源无 CORS）。**`file://` 下热榜不可用**：`hotlist.js` 检测 `window.location.protocol === 'file:'` 并提示改用本地服务器。
- 内网 IP 通过 WebRTC ICE 候选者检测，仅支持 `host` 类型和私有网段。
- GitHub Actions（Azure US）对部分国内平台 API 访问受限，目前 B 站和贴吧可稳定获取。

## 代码图谱

仓库已启用 CodeGraph（`.codegraph/` 目录）。需要理解代码关系时，优先用 `codegraph explore "<问题>"` 或 `codegraph node <symbol-or-file>`，而非 grep。
