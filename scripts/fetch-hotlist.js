const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchJson(url, referer) {
  const headers = { 'User-Agent': UA };
  if (referer) headers['Referer'] = referer;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// --- 平台抓取函数 ---

// 微博 (通过 VVHan)
async function wbHot() {
  const d = await fetchJson('https://api.vvhan.com/api/hotlist?type=wbHot');
  if (!d?.data) throw new Error('格式异常');
  return d.data.map(i => ({ title: i.title, hot: i.hot || '', url: i.url || '' }));
}

// 知乎 (通过 VVHan)
async function zhihuHot() {
  const d = await fetchJson('https://api.vvhan.com/api/hotlist?type=zhihuHot');
  if (!d?.data) throw new Error('格式异常');
  return d.data.map(i => ({ title: i.title, hot: i.hot || '', url: i.url || '' }));
}

// B站: 官方 ranking API
async function biliHot() {
  try {
    const d = await fetchJson('https://api.bilibili.com/x/web-interface/popular', 'https://www.bilibili.com/');
    if (d?.data?.list) {
      return d.data.list.map(i => ({
        title: i.title || '',
        hot: String(i.stat?.view || i.stat?.like || ''),
        url: `https://www.bilibili.com/video/${i.bvid}`
      }));
    }
  } catch (_) {}
  // 备用: VVHan
  const d = await fetchJson('https://api.vvhan.com/api/hotlist?type=biliHot');
  if (!d?.data) throw new Error('格式异常');
  return d.data.map(i => ({ title: i.title, hot: i.hot || '', url: i.url || '' }));
}

// 抖音 (通过 VVHan)
async function douyinHot() {
  const d = await fetchJson('https://api.vvhan.com/api/hotlist?type=douyinHot');
  if (!d?.data) throw new Error('格式异常');
  return d.data.map(i => ({ title: i.title, hot: i.hot || '', url: i.url || '' }));
}

// 头条 (通过 VVHan)
async function toutiao() {
  const d = await fetchJson('https://api.vvhan.com/api/hotlist?type=toutiao');
  if (!d?.data) throw new Error('格式异常');
  return d.data.map(i => ({ title: i.title, hot: i.hot || '', url: i.url || '' }));
}

// 百度: HTML 解析 + VVHan 备用
async function baidu() {
  try {
    const html = await fetchText('https://top.baidu.com/board?tab=realtime');
    const m = html.match(/s-data:\s*(\{[\s\S]*?\})\s*</);
    if (m) {
      const parsed = JSON.parse(m[1]);
      const cards = parsed?.data?.cards || [];
      const items = cards.flatMap(c => c?.content || []);
      if (items.length) {
        return items.map(i => ({
          title: i.word || i.query || '',
          hot: String(i.hotScore || i.heat || ''),
          url: `https://www.baidu.com/s?wd=${encodeURIComponent(i.word || i.query || '')}`
        }));
      }
    }
  } catch (_) {}
  // 备用: VVHan
  const d = await fetchJson('https://api.vvhan.com/api/hotlist?type=baidu');
  if (!d?.data) throw new Error('格式异常');
  return d.data.map(i => ({ title: i.title, hot: i.hot || '', url: i.url || '' }));
}

// 贴吧: 官方 topicList API
async function tieba() {
  try {
    const d = await fetchJson('https://tieba.baidu.com/hottopic/browse/topicList');
    const list = d?.data?.bang_topic?.topic_list || [];
    if (list.length) {
      return list.map(i => ({
        title: i.topic_name || '',
        hot: String(i.discuss_num || ''),
        url: `https://tieba.baidu.com/t/${i.topic_id || ''}`
      }));
    }
  } catch (_) {}
  // 备用: VVHan
  const d2 = await fetchJson('https://api.vvhan.com/api/hotlist?type=tieba');
  if (!d2?.data) throw new Error('格式异常');
  return d2.data.map(i => ({ title: i.title, hot: i.hot || '', url: i.url || '' }));
}

// 豆瓣 (通过 VVHan)
async function douban() {
  try {
    const html = await fetchText('https://www.douban.com/group/explore');
    const m = html.match(/global\.hotItems\s*=\s*(\[[\s\S]*?\]);/);
    if (m) {
      const items = JSON.parse(m[1]);
      if (items.length) {
        return items.slice(0, 30).map(i => ({
          title: i.title || '',
          hot: String(i.participant_count || ''),
          url: i.url || ''
        }));
      }
    }
  } catch (_) {}
  // 备用: VVHan
  const d = await fetchJson('https://api.vvhan.com/api/hotlist?type=douban');
  if (!d?.data) throw new Error('格式异常');
  return d.data.map(i => ({ title: i.title, hot: i.hot || '', url: i.url || '' }));
}

// --- 主流程 ---

const PLATFORMS = [
  { id: 'wbHot', name: '微博热搜', fn: wbHot },
  { id: 'zhihuHot', name: '知乎热榜', fn: zhihuHot },
  { id: 'biliHot', name: 'B站热门', fn: biliHot },
  { id: 'douyinHot', name: '抖音热搜', fn: douyinHot },
  { id: 'toutiao', name: '头条热榜', fn: toutiao },
  { id: 'baidu', name: '百度热搜', fn: baidu },
  { id: 'tieba', name: '贴吧热榜', fn: tieba },
  { id: 'douban', name: '豆瓣热门', fn: douban },
];

async function main() {
  console.log('抓取热榜数据...\n');
  const RESULTS = {};
  const errors = [];

  for (const p of PLATFORMS) {
    try {
      const data = await p.fn();
      RESULTS[p.id] = data;
      console.log(`  ✓ ${p.name} (${data.length} 条)`);
    } catch (e) {
      errors.push(`${p.name}: ${e.message}`);
      console.log(`  ✗ ${p.name}: ${e.message}`);
    }
  }

  const output = {
    updated: new Date().toISOString(),
    data: RESULTS,
  };

  const outPath = path.resolve(__dirname, '..', 'hotlist.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n已保存到 hotlist.json (成功 ${Object.keys(RESULTS).length}/${PLATFORMS.length} 个平台)`);

  if (errors.length) {
    console.log(`\n${errors.length} 个平台失败:`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

main().catch(e => {
  console.error('严重错误:', e.message);
  process.exit(1);
});
