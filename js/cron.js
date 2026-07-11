// 月份英文缩写 → 数字映射
const MONTH_MAP = { JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12 };
// 星期英文缩写 → 数字映射
const DOW_MAP = { SUN:0,MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6 };

// parseField - 解析 Cron 单个字段（秒/分/时/日/月/周/年）
function parseField(field, min, max, nameMap) {
  const set = new Set();
  const parts = field.split(',');
  for (let part of parts) {
    part = part.trim().toUpperCase();
    if (part === '*' || part === '?') { for (let i = min; i <= max; i++) set.add(i); continue; }
    let step = 1;
    if (part.includes('/')) {
      const [rangeStr, stepStr] = part.split('/');
      step = parseInt(stepStr);
      if (isNaN(step) || step < 1) throw new Error(`步进值无效: ${stepStr}`);
      if (rangeStr === '*') {
        for (let i = min; i <= max; i += step) set.add(i);
      } else {
        const [rmin, rmax] = rangeStr.split('-').map(s => {
          const n = nameMap ? (nameMap[s.trim()] ?? parseInt(s.trim())) : parseInt(s.trim());
          if (isNaN(n)) throw new Error(`无法解析: ${s}`);
          return n;
        });
        for (let i = rmin; i <= (rmax || max); i += step) set.add(i);
      }
      continue;
    }
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(s => {
        const n = nameMap ? (nameMap[s.trim()] ?? parseInt(s.trim())) : parseInt(s.trim());
        if (isNaN(n)) throw new Error(`无法解析: ${s}`);
        return n;
      });
      for (let i = a; i <= b; i++) set.add(i);
      continue;
    }
    const n = nameMap ? (nameMap[part] ?? parseInt(part)) : parseInt(part);
    if (isNaN(n)) throw new Error(`无法解析: ${part}`);
    if (n < min || n > max) throw new Error(`${n} 超出范围 [${min}, ${max}]`);
    set.add(n);
  }
  return [...set].sort((a,b)=>a-b);
}

// parseQuartzCron - 解析 Quartz Cron 完整表达式，返回各字段数值集合
function parseQuartzCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 6 || parts.length > 7) throw new Error(`需要 6~7 个字段，当前 ${parts.length} 个`);
  const sec = parseField(parts[0], 0, 59);
  const min = parseField(parts[1], 0, 59);
  const hour = parseField(parts[2], 0, 23);
  const day = parseField(parts[3], 1, 31);
  const month = parseField(parts[4], 1, 12, MONTH_MAP);
  const dow = parseField(parts[5], 0, 6, DOW_MAP);
  const year = parts[6] ? parseField(parts[6], 1970, 2099) : null;
  return { sec, min, hour, day, month, dow, year };
}

// getNextTimes - 从指定时间开始计算未来 N 次执行时间
function getNextTimes(fields, count, from) {
  const results = [];
  let current = new Date(from);
  if (current.getTime() < Date.now()) current = new Date();
  current.setSeconds(0, 0);
  let maxLoops = 1000000;
  while (results.length < count && maxLoops-- > 0) {
    const y = current.getFullYear();
    const m = current.getMonth() + 1;
    const d = current.getDate();
    const h = current.getHours();
    const mi = current.getMinutes();
    const s = current.getSeconds();
    if (fields.year && !fields.year.includes(y)) { current.setFullYear(y + 1); current.setMonth(0, 1); current.setHours(0, 0, 0, 0); continue; }
    if (!fields.month.includes(m)) { current.setMonth(m, 1); current.setHours(0, 0, 0, 0); continue; }
    if (!fields.day.includes(d)) { current.setDate(d + 1); current.setHours(0, 0, 0, 0); continue; }
    const wd = current.getDay();
    if (!fields.dow.includes(wd)) { current.setDate(d + 1); current.setHours(0, 0, 0, 0); continue; }
    if (!fields.hour.includes(h)) { current.setHours(h + 1, 0, 0, 0); continue; }
    if (!fields.min.includes(mi)) { current.setMinutes(mi + 1, 0, 0); continue; }
    if (!fields.sec.includes(s)) { current.setSeconds(s + 1, 0); continue; }
    results.push(new Date(current));
    current.setSeconds(current.getSeconds() + 1);
  }
  if (maxLoops <= 0) throw new Error('未找到匹配的时间点，请检查表达式');
  return results;
}

// parseAndCompute - 解析表达式并计算未来执行时间点
function parseAndCompute(expr, count) {
  const fields = parseQuartzCron(expr);
  return getNextTimes(fields, count, new Date());
}

let cronCount = 1; // 当前 Cron 输入框数量
const MAX_CRONS = 3; // 最大允许的输入框数量

// renderInputs - 渲染 Cron 表达式输入框列表
function renderInputs() {
  const list = document.getElementById('cronList');
  const prev = [];
  for (let i = 0; i < cronCount; i++) {
    const el = document.getElementById(`cronInput${i}`);
    prev[i] = el ? el.value : '';
  }
  const examples = ['0 0 9 * * ?', '0 0/15 * * * ?', '0 0 0 1 * ?'];
  let html = '';
  for (let i = 0; i < cronCount; i++) {
    const val = prev[i] || (i === 0 ? '0 0 9 * * ?' : '');
    html += `<div class="cron-row" data-idx="${i}">
      <span class="num-label">#${i+1}</span>
      <input type="text" id="cronInput${i}" placeholder="例: ${examples[i] || ''}" spellcheck="false" value="${val.replace(/"/g,'&quot;')}">
      ${cronCount > 1 ? `<button class="remove-btn" onclick="removeCron(${i})"><i class="fas fa-times"></i></button>` : ''}
    </div>`;
  }
  list.innerHTML = html;
  document.getElementById('addCronBtn').style.display = cronCount >= MAX_CRONS ? 'none' : '';
}

// addCron - 添加一个 Cron 输入框
function addCron() {
  if (cronCount >= MAX_CRONS) return;
  cronCount++;
  renderInputs();
}

// removeCron - 移除指定索引的 Cron 输入框
function removeCron(idx) {
  if (cronCount <= 1) return;
  cronCount--;
  renderInputs();
}

// 添加按钮点击事件
document.getElementById('addCronBtn').addEventListener('click', addCron);

// formatTime - 将日期对象格式化为 "YYYY-MM-DD HH:mm:ss"
function formatTime(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// relativeTime - 计算距当前时间的相对描述（如 "5 分后"）
function relativeTime(d) {
  const diff = d.getTime() - Date.now();
  if (diff < 0) return '已过去';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} 秒后`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分 ${s % 60} 秒后`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 时 ${m % 60} 分后`;
  const day = Math.floor(h / 24);
  return `${day} 天 ${h % 24} 时后`;
}

// parseAll - 解析所有 Cron 表达式并展示未来执行时间线
function parseAll() {
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.style.display = 'none';
  const count = parseInt(document.getElementById('countSelect').value) || 5;
  const showRel = document.getElementById('showRelative').checked;
  const entries = [];
  let hasError = false;
  for (let i = 0; i < cronCount; i++) {
    const input = document.getElementById(`cronInput${i}`);
    const expr = input.value.trim();
    if (!expr) continue;
    try {
      const times = parseAndCompute(expr, count);
      times.forEach(t => entries.push({ expr, time: t, label: `#${i+1}` }));
    } catch (e) {
      hasError = true;
      errorMsg.textContent += `#${i+1} ${expr}: ${e.message}\n`;
    }
  }
  if (hasError) errorMsg.style.display = 'block';
  const area = document.getElementById('resultArea');
  if (entries.length === 0) {
    area.innerHTML = `<div class="empty-state"><i class="far fa-hourglass" style="font-size:2rem;display:block;margin-bottom:8px;color:#d4cdbc"></i>无有效时间点</div>`;
    return;
  }
  entries.sort((a, b) => a.time - b.time);
  const seen = new Set();
  const merged = [];
  for (const e of entries) {
    const key = e.time.getTime();
    if (seen.has(key)) {
      const last = merged[merged.length - 1];
      if (last && last.time.getTime() === key) last.labels.push(e.label);
    } else {
      seen.add(key);
      merged.push({ time: e.time, labels: [e.label] });
    }
  }
  let html = `<div class="result-card">
    <div class="result-card-header" style="justify-content:space-between">
      <span><i class="fas fa-list"></i> 未来执行时间线</span>
      <span style="font-size:0.8rem;color:#8c8273">共 ${merged.length} 个时间点</span>
    </div>
    <div class="result-card-body">`;
  merged.forEach((m, i) => {
    const badges = [...new Set(m.labels)].map(l => `<span style="display:inline-block;padding:0 6px;border-radius:4px;font-size:0.7rem;background:rgba(107,143,94,0.12);color:#6b8f5e;margin-right:3px">${l}</span>`).join('');
    html += `<div class="time-item">
      <span class="idx">#${i+1}</span>
      <span class="time">${formatTime(m.time)}</span>
      ${badges}
      ${showRel ? `<span class="rel">${relativeTime(m.time)}</span>` : ''}
    </div>`;
  });
  html += `</div></div>`;
  area.innerHTML = html;
}

// 解析按钮点击事件
document.getElementById('parseBtn').addEventListener('click', parseAll);
// 输入框回车触发解析（事件委托，renderInputs 重建 DOM 后依然有效）
document.getElementById('cronList').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') parseAll(); });

renderInputs(); // 初始渲染输入框
