# AGENTS.md — 工具箱

## 项目本质

纯前端单页应用，所有代码在 `index.html` 一个文件里（HTML + CSS + JS）。
无构建步骤、无包管理、无后端服务。直接用浏览器打开即可运行。

## 文件结构

- `index.html` — 唯一源文件，含全部界面和逻辑
- `scripts/fetch-hotlist.js` — GitHub Actions 热榜抓取脚本，Node.js 18+，无外部依赖
- `hotlist.json` — 热榜缓存数据，由 GitHub Actions 定时生成
- `.github/workflows/hotlist.yml` — 每天早上 9:00 触发抓取热榜，生成 hotlist.json 并提交
- `CNAME` — 自定义域名 `tools.kuak.top`，GitHub Pages 使用

## 添加新工具的步骤

1. 在 `.nav-card` 区域加一个卡片，`data-tool="xxx"` 唯一标识
2. 在 `.tool-view` 区域加对应的 `<div id="tool-xxx" class="tool-view">`，含界面 HTML
3. 在底部 `<script>` 里添加对应的 JS 逻辑
4. CSS 采用 `#fcfaf5` 卡片背景、`#6b8f5e` 主色、`.ts-card/.ts-section/.ts-row` 布局模式
5. 在 `README.md` 工具列表追加一行

## 关键约定

- 语言：**简体中文**（界面和提交信息）
- 图标：Font Awesome 6.5.1（CDN: `cdnjs.cloudflare.com`）
- 字体：`-apple-system, BlinkMacSystemFont, ...monospace`
- 颜色：暖色米白主题，主色 `#6b8f5e`（绿色），正文字体 `#3d3a35`
- 不需要询问是否推送——**修改后必须先展示给用户，等用户确认再提交推送**
- 编辑代码**不要添加注释**，除非代码本身需要说明

## 数据获取方式

- **外部 API**：使用 `fetch()`，在外网环境正常工作
- **JSONP**：金价查询用 `<script>` 标签注入方式获取（绕过 CORS），其他工具用 `fetch`
- **热榜**：通过 GitHub Actions 运行 `node scripts/fetch-hotlist.js` 生成 `hotlist.json`，前端直接读取（同源无 CORS）
- **内网 IP**：通过 WebRTC ICE 候选者检测，仅支持 `host` 类型和私有网段
- 所有平台 API 在 China Mobile 和 GitHub Actions（Azure US）上访问受限，只有 B 站和贴吧可稳定获取

## 热榜抓取脚本

```bash
node scripts/fetch-hotlist.js
```

输出 `hotlist.json`，格式 `{ updated: ISO时间戳, data: { biliHot: [...], tieba: [...] } }`。
GitHub Actions 工作流中自动运行并提交结果。

## 本地测试

```bash
# 直接用浏览器打开 index.html
start index.html

# 或用本地服务器（解决 file:// 的 CORS 和 WebRTC 限制）
python -m http.server 8000
npx serve
```

## 代码风格

- 单文件 SPA，所有函数在全局作用域
- 函数命名：驼峰，功能动词在前（`fetchIpInfo`, `parseQuartzCron`, `testRegex`）
- HTML 模板用字符串拼接，非虚拟 DOM
- 事件绑定用 `addEventListener`，每个工具在 `<script>` 末尾集中绑定
