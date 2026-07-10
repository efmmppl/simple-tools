const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchJson(url, referer) {
  const headers = { 'User-Agent': UA, 'Accept': 'application/json' };
  if (referer) headers['Referer'] = referer;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// B站: 官方 popular API
async function biliHot() {
  const d = await fetchJson('https://api.bilibili.com/x/web-interface/popular', 'https://www.bilibili.com/');
  if (!d?.data?.list) throw new Error('无数据');
  return d.data.list.map(i => ({
    title: i.title || '',
    hot: String(i.stat?.view || i.stat?.like || ''),
    url: `https://www.bilibili.com/video/${i.bvid}`
  }));
}

// 贴吧: 官方 topicList API
async function tieba() {
  const d = await fetchJson('https://tieba.baidu.com/hottopic/browse/topicList');
  const list = d?.data?.bang_topic?.topic_list || [];
  if (!list.length) throw new Error('无数据');
  return list.map(i => ({
    title: i.topic_name || '',
    hot: String(i.discuss_num || ''),
    url: `https://tieba.baidu.com/t/${i.topic_id || ''}`
  }));
}

const PLATFORMS = [
  { id: 'biliHot', name: 'B站热门', fn: biliHot },
  { id: 'tieba', name: '贴吧热榜', fn: tieba },
];

async function main() {
  console.log('抓取热榜数据...\n');
  const RESULTS = {};

  for (const p of PLATFORMS) {
    try {
      const data = await p.fn();
      RESULTS[p.id] = data;
      console.log(`  ✓ ${p.name} (${data.length} 条)`);
    } catch (e) {
      console.log(`  ✗ ${p.name}: ${e.message}`);
    }
  }

  const output = { updated: new Date().toISOString(), data: RESULTS };
  const outPath = path.resolve(__dirname, '..', 'hotlist.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n已保存到 hotlist.json (${Object.keys(RESULTS).length}/${PLATFORMS.length} 个平台)`);
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
