# 工具箱

一个纯前端单页应用，零构建步骤、零包管理、零后端服务，浏览器打开 `index.html` 即可运行。所有工具按职责拆分为独立文件，便于维护和扩展。

## 在线访问

[https://tools.kuak.top](https://tools.kuak.top)

## 功能工具

| 工具 | 说明 |
|------|------|
| **IP 信息** | 查询本机公网 IP 地址及网络位置信息，支持 WebRTC 检测内网 IP。 |
| **金价查询** | 国内/国际实时金价，定时自动刷新。 |
| **汇率转换** | 外币兑人民币实时汇率，支持双向换算与常见货币一览。 |
| **Cron 解析器** | 解析 Quartz Cron 表达式，预览未来多次执行时间。 |
| **时间戳工具** | 获取当前时间戳，支持 Unix 秒/毫秒与日期时间互转。 |
| **正则测试器** | 实时匹配高亮，支持捕获组查看与 `g/i/m/s/u/y` 等标志位。 |
| **Base64 编解码** | 文本与 Base64 互转，支持文件编码。 |
| **今日热榜** | 展示 B 站/贴吧实时热搜榜单，数据来自 GitHub Actions 定时抓取。 |
| **ASCII 艺术** | 文字转大字字符画，图片按亮度映射为字符画，可复制或下载。 |
| **文件校验** | 选择两个文件，计算 MD5 与 SHA-256 摘要，校验文件是否完全一致。 |
| **Hash 工具** | 文本摘要计算，支持 MD5 与 SHA-1/256/384/512 共五种算法。 |
| **图片压缩** | 调整图片尺寸与质量压缩大小，显示压缩前后 KB 对比与下载。 |
| **格式转换** | 图片 PNG/JPG/WebP 互转，音频转 WAV，浏览器本地完成。 |
| **数独** | 九宫格逻辑推理，支持简单/中等/困难三档难度。 |
| **文本差异对比** | 左右对照文本差异，字符级增减高亮显示。 |
| **Markdown 编辑器** | 编辑 Markdown 文档，实时预览，支持导入 `.md` 和下载保存。 |
| **后台数据面板** | 管理员登录入口，查看热榜缓存时间与各平台条数、全站访问量/访客数（不蒜子统计），支持手动刷新与跳转 Actions。 |
| **股票分析** | 输入 A 股代码，展示实时行情与 MA/RSI/MACD/KDJ/ATR/布林等技术指标，给出买卖信号、止损位与支撑压力参考。 |
| **量化回测** | 拉取历史前复权日K，按双均线/RSI/布林带/MACD 策略模拟买卖（参数可调），统计收益、年化、最大回撤、胜率并对比买入持有。 |
| **信号监控** | 定时轮询行情，按策略实时检测买卖信号，触发时页内提示+声音+浏览器通知并记录到本地（可多股、可清空）。 |

## 技术特点

- 无构建：无 webpack、vite 等构建工具，直接编辑 HTML/CSS/JS 即可。
- 无依赖：无 npm 包，仅使用 CDN 加载 Font Awesome 图标库。
- 无后端：所有工具在浏览器端运行，外部数据通过 `fetch` 或 JSONP 获取。
- 中文优先：界面与代码注释均使用简体中文。
- 暖色米白主题：主色 `#6b8f5e`，卡片背景 `#fcfaf5`，正文字体 `#3d3a35`。
- PWA：支持安装到桌面/主屏与离线缓存，仅在 `https` 或 `localhost` 下生效（`file://` 不可用）。

## 文件结构

```
.
├── index.html              # 页面骨架与导航
├── manifest.json            # PWA 应用清单（名称、图标、主题色）
├── sw.js                    # PWA Service Worker（离线缓存，仅 https/localhost 生效）
├── icons/                   # PWA 应用图标（brain 192/512 PNG）
├── css/style.css           # 全局样式
├── js/
│   ├── nav.js              # 导航路由、footer 时钟、复制按钮等通用逻辑
│   ├── cron.js             # Cron 解析器
│   ├── gold.js             # 金价查询
│   ├── ip.js               # IP 信息
│   ├── timestamp.js        # 时间戳工具
│   ├── regex.js            # 正则测试器
│   ├── base64.js           # Base64 编解码
│   ├── hotlist.js          # 今日热榜
│   ├── filehash.js       # 文件校验（MD5/SHA-256）
│   ├── hash.js           # Hash 工具（MD5/SHA-1/256/384/512）
│   ├── imgtool.js        # 图片压缩（尺寸/质量调整）
│   ├── convert.js        # 格式转换（图片互转、音频转 WAV）
│   ├── sudoku.js           # 数独游戏
│   ├── diff.js             # 文本差异对比
│   ├── markdown.js         # Markdown 编辑器与实时预览
│   ├── admin.js            # 后台数据面板（管理员登录、热榜统计）
│   ├── easter-egg.js       # 彩蛋（数字雨、像素风、打地鼠）
│   ├── asciiart.js          # ASCII 艺术（文字/图片转字符画）
│   ├── stock.js             # 股票分析（行情/技术指标/买卖信号/止损）
│   ├── backtest.js          # 量化回测（多策略历史模拟/收益回撤胜率）
│   ├── monitor.js           # 信号监控（策略买卖信号提醒/记录）
├── scripts/fetch-hotlist.js # 热榜抓取脚本（Node.js 18+，无外部依赖）
├── hotlist.json             # 热榜缓存数据
├── .github/workflows/hotlist.yml # 定时抓取热榜的 GitHub Actions 工作流
├── CNAME                    # 自定义域名 tools.kuak.top
└── README.md                # 本文件
```

## 本地运行

直接用浏览器打开 `index.html`：

```bash
start index.html
```

如果需要通过本地服务器运行（避免 `file://` 协议下的 CORS 或 WebRTC 限制）：

```bash
python -m http.server 8000
# 或
npx serve
```

## 添加新工具

1. 在 `index.html` 的 `.nav-grid` 区域新增一个 `.nav-card` 卡片，`data-tool="xxx"` 保持唯一。
2. 在 `index.html` 的 `.tool-view` 区域新增对应的 `<div id="tool-xxx" class="tool-view">` 界面结构。
3. 在 `index.html` 底部 `<script>` 列表追加 `<script src="js/xxx.js" charset="UTF-8"></script>`，并新建 `js/xxx.js`。
4. 样式遵循现有约定：使用 `#fcfaf5` 卡片背景、`#6b8f5e` 主色，以及 `.ts-card` / `.ts-section` / `.ts-row` 布局，写入 `css/style.css`。
5. 在 `README.md` 工具列表中追加一行。

## 数据说明

- **外部 API**：使用 `fetch()`，在外网环境正常工作。
- **JSONP**：金价查询通过 `<script>` 标签注入方式绕过 CORS。
- **热榜**：通过 GitHub Actions 每日 UTC 01:00（北京时间 09:00）运行 `node scripts/fetch-hotlist.js` 生成 `hotlist.json`，前端直接读取。
- **内网 IP**：通过 WebRTC ICE 候选者检测，仅支持 `host` 类型和私有网段。

## 自动工作流

`.github/workflows/hotlist.yml` 配置了定时抓取热榜并自动提交到仓库：

```yaml
on:
  schedule:
    - cron: '0 1 * * *'  # 每天 UTC 01:00
  workflow_dispatch:
```

手动触发：进入仓库 Actions → 热榜数据更新 → Run workflow。

## 抓取热榜

本地手动抓取：

```bash
node scripts/fetch-hotlist.js
```

输出 `hotlist.json`，格式为 `{ updated: ISO时间戳, data: { biliHot: [...], tieba: [...] } }`。

> 注意：GitHub Actions 运行环境（Azure US）对部分国内平台 API 访问受限，目前 B 站和贴吧可稳定获取。
