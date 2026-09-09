# CSS 选择器完全教程

> 从零开始，系统掌握 CSS 选择器的全部用法：基础写法、属性选择器、组合器、伪类、伪元素、优先级与性能。每个小节都配有示例与说明，适合入门到进阶的完整学习。

---

## 目录

1. [选择器是什么](#1-选择器是什么)
2. [基础选择器](#2-基础选择器)
3. [属性选择器](#3-属性选择器)
4. [组合器](#4-组合器)
5. [伪类](#5-伪类)
6. [伪元素](#6-伪元素)
7. [选择器优先级](#7-选择器优先级)
8. [性能与书写建议](#8-性能与书写建议)
9. [综合练习](#9-综合练习)

---

## 1. 选择器是什么

选择器（Selector）用来**告诉浏览器「我要给哪些元素应用样式」**。它是 CSS 规则的第一部分：

```css
选择器 {
  属性: 值;
}
```

浏览器从右向左解析选择器，先匹配最右边的「关键选择器」，再逐级向上验证，这样可以快速缩小范围、提升性能。

> **记住一点**：能精确表达「选谁」的选择器，往往就是好选择器。选择器越具体，样式越不容易「误伤」其他元素。

---

## 2. 基础选择器

### 2.1 标签选择器（类型选择器）

直接选中所有同名的元素，优先级最低，常用于「重置/基础」样式。

```css
p { color: #333; }        /* 所有 <p> */
h1 { font-size: 24px; }   /* 所有 <h1> */
a { text-decoration: none; }
```

```html
<p>这段文字会被上色</p>
<h1>大标题</h1>
```

### 2.2 类选择器（Class）

选中带有指定 `class` 的元素，用 `.` 开头。**可复用、可叠加**，是日常最常用的选择器。

```css
.card { border: 1px solid #ddd; }
.active { color: red; }
```

```html
<div class="card">卡片一</div>
<div class="card active">卡片二（同时有红字）</div>
```

### 2.3 ID 选择器

选中带有指定 `id` 的元素，用 `#` 开头。**一个页面中 id 必须唯一**，适合定位单个元素。

```css
#header { height: 60px; }
```

```html
<header id="header">页头</header>
```

### 2.4 通配选择器

`*` 选中**所有元素**。慎用，性能开销大，常用于重置。

```css
* { margin: 0; padding: 0; }   /* 经典重置写法 */
```

也可以配合其他选择器组合使用：

```css
#app * { box-sizing: border-box; }  /* #app 内所有元素 */
```

### 2.5 分组选择器

用逗号把多个选择器合并，共享同一组声明，减少重复。

```css
h1, h2, h3 { font-family: sans-serif; }

/* 等价于 */
h1 { font-family: sans-serif; }
h2 { font-family: sans-serif; }
h3 { font-family: sans-serif; }
```

### 2.6 小结

| 选择器 | 示例 | 选中什么 |
|--------|------|----------|
| 标签 | `p` | 所有 `<p>` |
| 类 | `.card` | 所有 `class="card"` |
| ID | `#header` | `id="header"` 的唯一元素 |
| 通配 | `*` | 所有元素 |
| 分组 | `h1, h2` | 所有 `<h1>` 和 `<h2>` |

---

## 3. 属性选择器

根据**元素是否拥有某个属性 / 属性值**来选中元素，用方括号 `[]` 包裹。

### 3.1 存在与精确匹配

```css
input[disabled] { opacity: 0.5; }        /* 有 disabled 属性即可 */
input[type="text"] { border: 1px solid; } /* type 精确等于 text */
a[target="_blank"] { color: blue; }
```

### 3.2 前缀匹配 `^=`（以…开头）

```css
a[href^="https"] { color: green; }   /* https 开头的链接 */
[class^="col-"] { float: left; }     /* 类名以 col- 开头 */
```

### 3.3 后缀匹配 `$=`（以…结尾）

```css
a[href$=".pdf"] { color: red; }      /* 指向 PDF 的链接 */
img[src$=".png"] { border: 0; }
```

### 3.4 包含匹配 `*=`（包含子串）

```css
[data-type*="warning"] { color: orange; } /* 属性值任意位置包含 warning */
a[href*="example.com"] { color: purple; }
```

### 3.5 单词匹配 `~=`（包含独立单词）

属性值以空格分隔成多个单词时，`~=` 匹配**某个完整单词**，比 `*=` 更精确。

```css
[title~="hello"] { color: teal; }
```

```html
<p title="hello world">命中</p>
<p title="helloworld">不命中（不是一个独立单词）</p>
```

### 3.6 语言/连字符匹配 `|=`

匹配「值本身」或「以值开头后跟连字符 `-`」的情况，常用于 `lang` 属性。

```css
[lang|="en"] { color: blue; }  /* 匹配 en 和 en-US，不匹配 english */
```

```html
<p lang="en">English</p>
<p lang="en-US">American English</p>
<p lang="english">不命中</p>
```

### 3.7 大小写不敏感标志 `i`

在方括号末尾加 `i`，让属性值比较忽略大小写。

```css
[type="TEXT" i] { color: red; }  /* 匹配 text / TEXT / Text */
```

### 3.8 小结

| 写法 | 含义 | 示例 |
|------|------|------|
| `[attr]` | 拥有该属性 | `[disabled]` |
| `[attr="v"]` | 精确等于 | `[type="text"]` |
| `[attr^="v"]` | 以 v 开头 | `[href^="https"]` |
| `[attr$="v"]` | 以 v 结尾 | `[src$=".png"]` |
| `[attr*="v"]` | 包含 v | `[data-type*="warn"]` |
| `[attr~="v"]` | 含独立单词 v | `[title~="hello"]` |
| `[attr|="v"]` | v 或 v-xxx | `[lang|="en"]` |
| `[attr="v" i]` | 忽略大小写 | `[type="text" i]` |

---

## 4. 组合器

组合器把多个简单选择器连起来，表达**元素之间的位置关系**。

### 4.1 后代组合器（空格）

选择「某元素内部的所有后代元素（含子、孙、曾孙…）」。

```css
div p { color: gray; }  /* div 里所有 p，不管嵌套多深 */
```

### 4.2 子代组合器（`>`）

只选**直接子元素**，不穿透更深层。

```css
ul > li { list-style: none; }  /* 只选 ul 的直接 li */
```

```html
<ul>
  <li>直接子级，命中</li>
  <li>
    <ul>
      <li>孙级，不命中</li>
    </ul>
  </li>
</ul>
```

### 4.3 相邻兄弟组合器（`+`）

选择「紧跟在某元素**后面**的第一个兄弟元素」。

```css
h2 + p { margin-top: 0; }  /* h2 后紧邻的第一个 p */
```

```html
<h2>标题</h2>
<p>紧邻 h2，命中</p>
<p>不命中（不是紧邻）</p>
```

### 4.4 通用兄弟组合器（`~`）

选择「某元素**之后**的所有同级兄弟元素」，不要求紧邻。

```css
h2 ~ p { color: #666; }  /* h2 之后的所有 p 兄弟 */
```

```html
<h2>标题</h2>
<p>命中</p>
<div></div>
<p>命中（中间隔了 div 也没关系）</p>
```

### 4.5 列组合器（`||`）

匹配**属于某个表格列 / 网格列**的元素，用于 `<colgroup>`、CSS Grid 等场景。浏览器支持仍有限。

```css
col.selected || td { background: #eee; }
```

### 4.6 组合器对比

| 组合器 | 符号 | 关系 | 穿透层级 |
|--------|------|------|----------|
| 后代 | 空格 | 内部任意后代 | 是 |
| 子代 | `>` | 直接子元素 | 否 |
| 相邻兄弟 | `+` | 紧跟其后的第一个兄弟 | 否 |
| 通用兄弟 | `~` | 之后的所有兄弟 | 否 |
| 列 | `\|\|` | 同一表格/网格列 | 视列而定 |

---

## 5. 伪类

伪类用 `:` 表示，选中元素的**特定状态**，不用改 HTML。

### 5.1 交互状态伪类

```css
a:hover { color: red; }          /* 鼠标悬停 */
a:active { color: orange; }      /* 正在按下 */
input:focus { border-color: blue; }  /* 获得焦点 */
a:visited { color: purple; }     /* 已访问链接 */
input:checked + label { color: green; }  /* 选中（配合相邻兄弟） */
input:disabled { background: #eee; }
input:placeholder-shown { color: #999; }  /* 占位符可见 */
```

### 5.2 结构性伪类（按位置选）

```css
li:first-child { font-weight: bold; }      /* 第一个子元素 */
li:last-child { margin-bottom: 0; }        /* 最后一个子元素 */
li:nth-child(2) { color: red; }            /* 第 2 个子元素 */
li:nth-child(odd) { color: #666; }         /* 奇数位 */
li:nth-child(even) { color: #999; }        /* 偶数位 */
li:nth-child(3n+1) { color: blue; }        /* 每隔 2 个取第 1 个 */
li:nth-last-child(2) { color: teal; }      /* 倒数第 2 个 */
li:nth-of-type(2) { color: green; }        /* 同类型中的第 2 个 */
li:only-child { color: pink; }             /* 唯一的子元素 */
li:first-of-type / :last-of-type           /* 同类型中第一个/最后一个 */
```

> **`nth-child` vs `nth-of-type` 的区别**：`nth-child(n)` 按「所有子元素」的先后顺序数；`nth-of-type(n)` 只在**同类标签**里数。例子：

```html
<div>
  <p>一</p>
  <span>二</span>
  <p>三</p>
</div>
```

```css
p:nth-child(2) { color: red; }   /* 所有子元素中第 2 个：是 <span>，不是 p，所以不命中 */
p:nth-of-type(2) { color: blue; } /* 同类 p 中第 2 个：<p>三</p>，命中 */
```

`nth-child(an+b)` 里 `n` 从 0 开始计数，常用公式：

| 公式 | 效果 |
|------|------|
| `odd` / `2n+1` | 奇数位 |
| `even` / `2n` | 偶数位 |
| `3n` | 每 3 个取第 3 个 |
| `n+4` | 第 4 个及之后 |

### 5.3 逻辑伪类

```css
:not(.disabled) { color: #333; }        /* 排除指定元素 */
:not(p, a) { color: #333; }             /* 可传入选择器列表 */
:is(h1, h2, h3) { font-size: 20px; }    /* 任选其一匹配，权重取最重者 */
:where(h1, h2, h3) { margin: 0; }       /* 同 :is 但权重恒为 0 */
:has(img) { background: #fafafa; }      /* 包含某子元素的父元素 */
```

- `:is()` 与 `:where()` 写法相同，区别在于**优先级**：`:is()` 取列表里权重最高的那一个，`:where()` 永远是 0。
- `:has()` 被称为「父选择器」，可以根据**子元素 / 后文状态**反向选中父元素，常用于表单与卡片样式：

```css
.card:has(> img) { padding: 0; }        /* 直接含图片的卡片 */
form:has(input:invalid) { border-color: red; }  /* 存在非法输入的表单 */
```

### 5.4 目标与空值

```css
:root { --main-color: #333; }          /* 文档根元素 <html> */
:empty { display: none; }              /* 没有任何内容的元素 */
:target { color: red; }                /* 当前锚点指向的元素 */
```

### 5.5 表单增强伪类

```css
input:required { border-color: orange; }
input:optional { border-color: #ccc; }
input:in-range / :out-of-range   /* 超出 min/max 范围 */
input:read-only / :read-write    /* 只读 / 可编辑 */
```

### 5.6 常用伪类速查

| 类别 | 伪类 |
|------|------|
| 交互 | `:hover` `:active` `:focus` `:visited` `:checked` `:disabled` |
| 位置 | `:first-child` `:last-child` `:nth-child(n)` `:nth-last-child(n)` `:first-of-type` `:last-of-type` `:nth-of-type(n)` `:only-child` `:only-of-type` |
| 逻辑 | `:not()` `:is()` `:where()` `:has()` |
| 其他 | `:root` `:empty` `:target` `:required` `:read-only` |

---

## 6. 伪元素

伪元素用 `::` 表示（旧写法单冒号 `:` 也能用，但规范推荐 `::`），它**不是真实存在的元素**，而是元素上可以「插入」出来的部分。

> **伪类 vs 伪元素**：伪类描述「状态」，只有一个冒号；伪元素描述「虚拟的局部」，有两个冒号。`:first-child` 是伪类，`::first-line` 是伪元素。

### 6.1 `::before` 与 `::after`

最常用的两个，在元素内容**之前/之后**插入内容，必须配合 `content` 属性，否则不显示。

```css
.card::before {
  content: "★";
  color: gold;
  margin-right: 4px;
}

.tip::after {
  content: "（提示）";
  font-size: 12px;
  color: #999;
}
```

常用来画装饰线、图标、角标、气泡箭头等。

### 6.2 文本伪元素

```css
p::first-line { font-weight: bold; }   /* 第一行（随窗口宽度变化） */
p::first-letter { font-size: 2em; }    /* 第一个字符，可做首字下沉 */
::selection { background: yellow; }    /* 用户选中的文本 */
```

```css
/* 首字下沉效果 */
p::first-letter {
  font-size: 3em;
  float: left;
  line-height: 1;
}
```

### 6.3 其他伪元素

```css
input::placeholder { color: #999; }    /* 占位符文本样式 */
input::file-selector-button { background: #eee; }  /* 文件选择按钮 */
li::marker { color: red; }             /* 列表项标记（圆点/序号） */
::backdrop { background: rgba(0,0,0,.3); }  /* 全屏/对话框背后的遮罩 */
```

### 6.4 伪元素速查

| 伪元素 | 作用 |
|--------|------|
| `::before` | 元素内容之前插入 |
| `::after` | 元素内容之后插入 |
| `::first-line` | 第一行文本 |
| `::first-letter` | 第一个字符 |
| `::selection` | 用户选中文本 |
| `::placeholder` | 输入框占位符 |
| `::marker` | 列表项标记 |
| `::backdrop` | 全屏/弹窗遮罩 |

> 注意：`:before`/`:after` 单冒号写法已被弃用但浏览器仍兼容；新代码一律写双冒号。

---

## 7. 选择器优先级

当多个规则命中同一元素、声明相同时，浏览器按**优先级（权重）**决定谁生效。

### 7.1 权重计算

| 选择器类型 | 权重（a, b, c） |
|------------|----------------|
| ID 选择器 | (1, 0, 0) |
| 类 / 属性 / 伪类 | (0, 1, 0) |
| 标签 / 伪元素 | (0, 0, 1) |
| 通配符 `*` / 组合器 `> + ~` | 不计权重 |
| 内联样式 `style=""` | (1, 0, 0, 0)，高于一切选择器 |

按顺序比较：先比 a，再比 b，最后比 c，谁大谁生效。同一权重则**后写的覆盖先写的**。

### 7.2 计算示例

```css
#nav .item:hover    /* (1, 2, 0) */
li.item             /* (0, 1, 1) */
#nav li             /* (1, 0, 1) */
.item               /* (0, 1, 0) */
p                   /* (0, 0, 1) */
```

`#nav .item:hover` 权重最大，同时命中时优先生效。

> **`!important`**：在声明末尾加 `!important` 会越过所有选择器权重，但会破坏可预测性，应尽量避免，只在覆盖第三方样式等场景谨慎使用。

### 7.3 优先级实战提示

- 尽量用「类选择器」组合控制样式，少用 ID，避免权重过高难以覆盖。
- 想「无条件重置」时用 `:where()`，它权重为 0，方便其他样式覆盖。
- 依赖「后写覆盖」有时脆弱，优先用结构（父级上下文）而不是复制粘贴高权重选择器。

---

## 8. 性能与书写建议

### 8.1 影响性能的选择器

| 写法 | 问题 |
|------|------|
| `* { }` | 匹配每个元素，渲染开销大 |
| `#id *` 后代通配 | 触发大量匹配 |
| `.a .b .c .d` 深后代链 | 越深匹配成本越高 |
| `[attr^="x"]` 复杂属性选择器 | 需要字符串比较 |

浏览器现在大多很快，但**避免「没必要的高开销写法」**仍然是好习惯。性能问题主要出在：

1. **过度使用通配符**和**过深的后代链**；
2. 选择器太复杂导致**匹配到大量不相关元素**。

### 8.2 书写建议

- **尽量具体但不过度**：`.nav-item` 比 `#nav ul li` 更清晰、更好维护。
- **优先类选择器**，语义化命名（BEM：`block__element--modifier` 等）。
- **少用 ID 做样式**（ID 权重最高，之后很难覆盖）；ID 留给 JS 钩子。
- **避免 `!important`**，它会切断优先级体系。
- **把选择器当「契约」**：今天写的 `.sidebar > .title`，明天改结构就可能失效，越简单的选择器越稳定。

---

## 9. 综合练习

试着手写出下面每个要求对应的选择器，参考答案在最后。

### 9.1 练习题

```html
<header id="top">
  <nav>
    <a href="https://a.com" class="link">首页</a>
    <a href="https://b.com/pdf" class="link">文档</a>
    <a href="#" class="link disabled">草稿</a>
  </nav>
</header>

<ul class="list">
  <li class="item">第一项</li>
  <li class="item active">第二项（当前）</li>
  <li class="item">第三项</li>
</ul>

<form>
  <input type="text" placeholder="用户名" required>
  <input type="password">
  <button>提交</button>
</form>
```

1. 选中 `#top` 里所有的 `.link`
2. 选中指向 `https` 开头的链接
3. 选中指向 `.pdf` 结尾的链接
4. 选中 `.list` 里第二个 `.item`
5. 选中所有「当前激活」的 `.item`
6. 选中带 `required` 的输入框
7. 选中所有「未禁用」的 `.link`
8. 选中 `form` 里的第一个 `input`
9. 选中 `.item` 里**没有** `.active` 的项（反向）
10. 选中 `<button>` 前面的 `input:password`

### 9.2 参考答案

```css
/* 1 */ #top .link
/* 2 */ a[href^="https"]
/* 3 */ a[href$=".pdf"]
/* 4 */ .list .item:nth-child(2)      /* 或 .item:nth-of-type(2) */
/* 5 */ .item.active
/* 6 */ input[required]               /* 或 input:required */
/* 7 */ .link:not(.disabled)
/* 8 */ form input:first-of-type      /* 或 input:first-child */
/* 9 */ .item:not(.active)
/* 10 */ input[type="password"] + button  /* 相邻兄弟 */
```

> 最后一题注意：`input[type="password"]` 后面紧跟的兄弟是 `<button>`，所以用 `+`；但 `+` 选中的是 button 前面的 input 的兄弟 button，实际样式应写在 `input[type="password"] + button` 上。

---

## 附：选择器总速查表

| 类别 | 写法 | 说明 |
|------|------|------|
| 基础 | `p` `.cls` `#id` `*` | 标签/类/ID/通配 |
| 分组 | `a, b` | 多选一 |
| 属性 | `[attr]` `[attr="v"]` `[attr^="v"]` `[attr$="v"]` `[attr*="v"]` `[attr~="v"]` `[attr|="v"]` | 属性选择 |
| 组合器 | 空格 `>` `+` `~` `\|\|` | 后代/子代/相邻/通用兄弟/列 |
| 伪类 | `:hover` `:focus` `:nth-child(n)` `:not()` `:is()` `:where()` `:has()` | 状态与逻辑 |
| 伪元素 | `::before` `::after` `::first-line` `::first-letter` `::selection` | 虚拟局部 |
| 优先级 | `!important` > 内联 > ID > 类 > 标签 | 权重顺序 |

写完这份教程，你已经掌握了 CSS 选择器的核心全貌。多写多练，遇到「选不中」时先检查三件事：**拼写、结构关系、优先级**。
