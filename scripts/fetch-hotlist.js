const fs = require('fs');
const path = require('path');

const PLATFORMS = [
  { id: 'wbHot', name: '微博热搜' },
  { id: 'zhihuHot', name: '知乎热榜' },
  { id: 'biliHot', name: 'B站热门' },
  { id: 'douyinHot', name: '抖音热搜' },
  { id: 'toutiao', name: '头条热榜' },
  { id: 'baidu', name: '百度热搜' },
  { id: 'tieba', name: '贴吧热榜' },
  { id: 'douban', name: '豆瓣热门' },
];

const RESULTS = {};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchVVHan(type) {
  const url = `https://api.vvhan.com/api/hotlist?type=${type}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchBiliRanking() {
  const res = await fetch('https://api.bilibili.com/x/web-interface/popular', {
    headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchBaiduHot() {
  const res = await fetch('https://top.baidu.com/board?tab=realtime', {
    headers: { 'User-Agent': UA }
  });
  const html = await res.text();
  const m = html.match(/<!--\s*realtime_data\s*-->([\s\S]*?)<!--\s*\/realtime_data\s*-->/);
  if (!m) throw new Error('百度热搜数据未找到');
  const data = JSON.parse(m[1].trim());
  return data;
}

async function fetchAll() {
  const errors = [];

  for (const platform of PLATFORMS) {
    try {
      const data = await fetchVVHan(platform.id);
      if (data && data.data && Array.isArray(data.data)) {
        RESULTS[platform.id] = data.data.map(item => ({
          title: item.title || '',
          hot: item.hot || '',
          url: item.url || ''
        }));
        console.log(`  ✓ ${platform.name} (${RESULTS[platform.id].length} 条)`);
        continue;
      }
      throw new Error('数据格式异常');
    } catch (e) {
      errors.push(`${platform.name}: ${e.message}`);
      console.log(`  ✗ ${platform.name}: ${e.message}`);
    }

    // Fallback for B站
    if (platform.id === 'biliHot') {
      try {
        const data = await fetchBiliRanking();
        if (data && data.data && data.data.list) {
          RESULTS[platform.id] = data.data.list.slice(0, 30).map(item => ({
            title: item.title || '',
            hot: String(item.stat?.view || ''),
            url: `https://www.bilibili.com/video/${item.bvid}`
          }));
          console.log(`    ↳ B站备用API ✓ (${RESULTS[platform.id].length} 条)`);
        }
      } catch (e2) {
        errors.push(`B站备用: ${e2.message}`);
      }
    }

    // Fallback for 百度
    if (platform.id === 'baidu') {
      try {
        const data = await fetchBaiduHot();
        const cards = data?.data?.cards || [];
        const items = cards.flatMap(c => c.content?.word || []);
        if (items.length) {
          RESULTS[platform.id] = items.map(item => ({
            title: item.word || item.query || '',
            hot: String(item.hotScore || item.heat || ''),
            url: `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || item.query || '')}`
          }));
          console.log(`    ↳ 百度HTML备用 ✓ (${RESULTS[platform.id].length} 条)`);
        }
      } catch (e2) {
        errors.push(`百度备用: ${e2.message}`);
      }
    }
  }

  // Save
  const output = {
    updated: new Date().toISOString(),
    data: RESULTS
  };
  const outPath = path.resolve(__dirname, '..', 'hotlist.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n已保存到 hotlist.json (${Object.keys(RESULTS).length}/${PLATFORMS.length} 个平台)`);

  if (errors.length) {
    console.log(`\n${errors.length} 个错误:`);
    errors.forEach(e => console.log(`  - ${e}`));
    process.exit(1);
  }
}

console.log('抓取热榜数据...\n');
fetchAll().catch(e => {
  console.error('严重错误:', e.message);
  process.exit(1);
});
