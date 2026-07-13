// js/farm.js — 模拟农场：Canvas 格子地图 + 粒子系统 + 日夜循环

const FARM_COLS = 10, FARM_ROWS = 8;

const FARM_CROPS = {
  wheat: { name: '小麦', buyPrice: 3, sellPrice: 8, growTime: 20, color: '#c8b850', leafColor: '#7ab84a', fruitColor: '#d4c040' },
  carrot: { name: '胡萝卜', buyPrice: 5, sellPrice: 12, growTime: 30, color: '#e8944a', leafColor: '#6aaa3a', fruitColor: '#e8843a' },
  tomato: { name: '番茄', buyPrice: 8, sellPrice: 18, growTime: 40, color: '#cc5544', leafColor: '#5a9a3a', fruitColor: '#dd4433' }
};

const FARM_TOOL_LIST = ['hoe', 'wheat', 'carrot', 'tomato', 'water', 'harvest'];

const SKY_POINTS = [
  { t: 0, color: [26, 26, 62] }, { t: 0.12, color: [245, 214, 168] },
  { t: 0.3, color: [135, 206, 235] }, { t: 0.7, color: [135, 206, 235] },
  { t: 0.85, color: [232, 148, 106] }, { t: 1, color: [26, 26, 62] }
];

let farm, farmCanvas, farmCtx, farmAnimId;

function initFarm() {
  farmCanvas = document.getElementById('farmCanvas');
  farmCtx = farmCanvas.getContext('2d');
  farmCanvas.width = 300;
  farmCanvas.height = 200;
  farm = {
    grid: [], money: 100, energy: 100, maxEnergy: 100, day: 1,
    dayTime: 0.35, selectedTool: 'hoe',
    seeds: { wheat: 5, carrot: 5, tomato: 5 },
    particles: [], lastTime: 0, tileSize: 48, shopOpen: false,
    info: '选择工具，点击土地开始耕作', inventory: { wheat: 0, carrot: 0, tomato: 0 }
  };
  for (let r = 0; r < FARM_ROWS; r++) {
    farm.grid[r] = [];
    for (let c = 0; c < FARM_COLS; c++)
      farm.grid[r][c] = { type: 'grass', crop: null, watered: false };
  }
  updateFarmUI();
  startFarmLoop();
}

function resizeFarmCanvas() {
  const parentW = farmCanvas.parentElement.clientWidth;
  if (parentW <= 0) return;
  const w = parentW - 4;
  farm.tileSize = Math.max(28, Math.floor((w - 16) / FARM_COLS));
  farmCanvas.width = w;
  farmCanvas.height = farm.tileSize * FARM_ROWS + 16;
}

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function getSkyColor(dt) {
  for (let i = 0; i < SKY_POINTS.length - 1; i++) {
    if (dt >= SKY_POINTS[i].t && dt <= SKY_POINTS[i + 1].t) {
      const range = SKY_POINTS[i + 1].t - SKY_POINTS[i].t;
      const t = range === 0 ? 0 : (dt - SKY_POINTS[i].t) / range;
      return lerpColor(SKY_POINTS[i].color, SKY_POINTS[i + 1].color, t);
    }
  }
  return SKY_POINTS[SKY_POINTS.length - 1].color;
}

function isFarmVisible() {
  const view = document.getElementById('tool-farm');
  return view && view.classList.contains('active');
}

function startFarmLoop() {
  if (farmAnimId) return;
  farm.lastTime = performance.now();
  function loop(now) {
    farmAnimId = requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min((now - farm.lastTime) / 1000, 0.1);
    farm.lastTime = now;
    if (isFarmVisible() && farm) {
      resizeFarmCanvas();
      updateFarm(dt);
      renderFarm();
    }
  }
  farmAnimId = requestAnimationFrame(loop);
}

function updateFarm(dt) {
  farm.dayTime += dt * 0.02;
  if (farm.dayTime >= 1) { farm.dayTime -= 1; farm.day++; }

  for (let r = 0; r < FARM_ROWS; r++) {
    for (let c = 0; c < FARM_COLS; c++) {
      const tile = farm.grid[r][c];
      if (tile.type === 'planted' && tile.crop) {
        tile.crop.growth += dt;
        const cropDef = FARM_CROPS[tile.crop.type];
        const stageDur = cropDef.growTime / 4;
        const newStage = Math.min(3, Math.floor(tile.crop.growth / stageDur));
        if (newStage !== tile.crop.stage) tile.crop.stage = newStage;
      }
    }
  }

  if (farm.energy < farm.maxEnergy) farm.energy += dt * 2;
  if (farm.energy > farm.maxEnergy) farm.energy = farm.maxEnergy;

  updateFarmParticles(dt);
}

function updateFarmParticles(dt) {
  for (let i = farm.particles.length - 1; i >= 0; i--) {
    const p = farm.particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.15 * dt * 60;
    p.life -= dt;
    if (p.life <= 0) { farm.particles.splice(i, 1); }
  }
}

function spawnParticles(x, y, count, color, opts) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (opts?.speed || 1.5) + Math.random() * 2;
    farm.particles.push({
      x, y,
      vx: Math.cos(angle) * speed * (opts?.spread || 1),
      vy: Math.sin(angle) * speed * (opts?.spread || 1) - (opts?.upward || 0),
      life: 0.6 + Math.random() * 0.6,
      color: Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color,
      size: 2 + Math.random() * 3
    });
  }
}

function renderFarm() {
  const ctx = farmCtx;
  const W = farmCanvas.width, H = farmCanvas.height;
  if (W <= 10 || H <= 10) return;
  const ts = farm.tileSize;
  const pad = 8;
  const sky = getSkyColor(farm.dayTime);

  ctx.fillStyle = `rgb(${sky[0]},${sky[1]},${sky[2]})`;
  ctx.fillRect(0, 0, W, H);

  const nightAlpha = Math.max(0, Math.sin(farm.dayTime * Math.PI) * 0.35);

  // Draw sun/moon
  const sunAngle = farm.dayTime * Math.PI * 2 - Math.PI / 2;
  const sunX = W / 2 + Math.cos(sunAngle) * W * 0.4;
  const sunY = H * 0.7 + Math.sin(sunAngle) * H * 0.5;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 14, 0, Math.PI * 2);
  const isNight = farm.dayTime < 0.15 || farm.dayTime > 0.85;
  ctx.fillStyle = isNight ? '#e8e0c8' : '#fff4d6';
  ctx.fill();
  if (!isNight) {
    ctx.shadowColor = '#ffe894';
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw grid
  const ox = pad, oy = pad;
  for (let r = 0; r < FARM_ROWS; r++) {
    for (let c = 0; c < FARM_COLS; c++) {
      const x = ox + c * ts, y = oy + r * ts;
      const tile = farm.grid[r][c];
      drawFarmTile(ctx, x, y, ts, tile, r, c);
      if (tile.type === 'planted' && tile.crop) drawFarmCrop(ctx, x, y, ts, tile.crop);
    }
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= FARM_COLS; c++) {
    ctx.beginPath(); ctx.moveTo(ox + c * ts, oy); ctx.lineTo(ox + c * ts, oy + FARM_ROWS * ts); ctx.stroke();
  }
  for (let r = 0; r <= FARM_ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(ox, oy + r * ts); ctx.lineTo(ox + FARM_COLS * ts, oy + r * ts); ctx.stroke();
  }

  // Selection highlight
  if (farm.hoverCol >= 0 && farm.hoverCol < FARM_COLS && farm.hoverRow >= 0 && farm.hoverRow < FARM_ROWS) {
    const hx = ox + farm.hoverCol * ts, hy = oy + farm.hoverRow * ts;
    ctx.strokeStyle = '#6b8f5e';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(hx + 1, hy + 1, ts - 2, ts - 2);
  }

  // Particles
  for (const p of farm.particles) {
    const alpha = Math.min(p.life / 0.3, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Night overlay
  if (nightAlpha > 0.01) {
    ctx.fillStyle = `rgba(10,10,30,${nightAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawFarmTile(ctx, x, y, ts, tile, r, c) {
  const pad = 1;
  if (tile.type === 'grass') {
    const shade = ((r * 7 + c * 13) % 5) * 2 - 4;
    ctx.fillStyle = `rgb(${140 + shade},${184 + shade},${122 + shade})`;
    ctx.fillRect(x + pad, y + pad, ts - pad * 2, ts - pad * 2);
    const dotCount = 2 + ((r * 3 + c * 7) % 3);
    for (let i = 0; i < dotCount; i++) {
      const dx = x + 4 + ((r * 5 + c * 11 + i * 17) % (ts - 8));
      const dy = y + 4 + ((r * 7 + c * 13 + i * 23) % (ts - 8));
      ctx.fillStyle = 'rgba(100,140,80,0.2)';
      ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (tile.type === 'tilled') {
    ctx.fillStyle = '#8b6b4a';
    ctx.fillRect(x + pad, y + pad, ts - pad * 2, ts - pad * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = y + 5 + i * (ts / 3.5);
      ctx.beginPath(); ctx.moveTo(x + 3, ly); ctx.lineTo(x + ts - 3, ly); ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#8b6b4a';
    ctx.fillRect(x + pad, y + pad, ts - pad * 2, ts - pad * 2);
  }
}

function drawFarmCrop(ctx, x, y, ts, crop) {
  const cx = x + ts / 2, cy = y + ts - 4;
  const stage = crop.stage;
  const cropDef = FARM_CROPS[crop.type];

  if (stage === 0) {
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath(); ctx.arc(cx, cy - 4, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (stage === 1) {
    ctx.strokeStyle = cropDef.leafColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy - 1); ctx.lineTo(cx - 4, cy - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 1); ctx.lineTo(cx + 4, cy - 10); ctx.stroke();
  } else if (stage === 2) {
    const stemTop = cy - 14;
    ctx.strokeStyle = '#5a8a3a';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - 1); ctx.lineTo(cx, stemTop); ctx.stroke();
    ctx.fillStyle = cropDef.leafColor;
    ctx.beginPath(); ctx.ellipse(cx - 5, stemTop + 3, 4, 2.5, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 5, stemTop + 6, 4, 2.5, 0.3, 0, Math.PI * 2); ctx.fill();
  } else {
    const stemTop = cy - 16;
    ctx.strokeStyle = '#5a8a3a';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - 1); ctx.lineTo(cx, stemTop); ctx.stroke();
    ctx.fillStyle = cropDef.leafColor;
    ctx.beginPath(); ctx.ellipse(cx - 6, stemTop + 4, 5, 3, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 6, stemTop + 7, 5, 3, 0.4, 0, Math.PI * 2); ctx.fill();

    if (crop.type === 'wheat') {
      for (let i = -3; i <= 3; i += 2) {
        ctx.fillStyle = cropDef.fruitColor;
        ctx.beginPath(); ctx.ellipse(cx + i * 2, stemTop - 3, 3, 2, 0.2 * i, 0, Math.PI * 2); ctx.fill();
      }
    } else if (crop.type === 'carrot') {
      ctx.fillStyle = cropDef.fruitColor;
      ctx.beginPath(); ctx.ellipse(cx, cy - 6, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a8a3a';
      ctx.fillRect(cx - 5, cy - 14, 10, 4);
    } else {
      ctx.fillStyle = cropDef.fruitColor;
      ctx.beginPath(); ctx.arc(cx, stemTop - 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a8a3a';
      ctx.beginPath(); ctx.arc(cx, stemTop - 6, 3, 0, Math.PI * 2); ctx.fill();
    }

    const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,255,200,${pulse * 0.15})`;
    ctx.beginPath(); ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2); ctx.fill();
  }
}

function getFarmTileFromPos(mx, my) {
  const pad = 8;
  const ts = farm.tileSize;
  const col = Math.floor((mx - pad) / ts);
  const row = Math.floor((my - pad) / ts);
  if (col >= 0 && col < FARM_COLS && row >= 0 && row < FARM_ROWS) return { row, col };
  return null;
}

function handleFarmCanvasClick(e) {
  const rect = farmCanvas.getBoundingClientRect();
  const scaleX = farmCanvas.width / rect.width;
  const scaleY = farmCanvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  const pos = getFarmTileFromPos(mx, my);
  if (!pos) return;

  const tile = farm.grid[pos.row][pos.col];
  const tool = farm.selectedTool;

  if (tool === 'hoe') {
    if (tile.type !== 'grass') { setFarmInfo('这块地已经耕过了'); return; }
    if (farm.energy < 5) { setFarmInfo('体力不足，休息一下'); return; }
    tile.type = 'tilled';
    farm.energy -= 5;
    const cx = 8 + pos.col * farm.tileSize + farm.tileSize / 2;
    const cy = 8 + pos.row * farm.tileSize + farm.tileSize / 2;
    spawnParticles(cx, cy, 10, ['#8b6b4a', '#7a5a3a', '#9a7b5a'], { speed: 1.2, spread: 0.8, upward: 2 });
    setFarmInfo('耕地完成！');
  } else if (FARM_CROPS[tool]) {
    if (tile.type !== 'tilled') { setFarmInfo('需要先耕地才能种植'); return; }
    if (farm.seeds[tool] <= 0) { setFarmInfo(`${FARM_CROPS[tool].name}种子不够了，去商店买吧`); return; }
    if (farm.energy < 3) { setFarmInfo('体力不足'); return; }
    tile.type = 'planted';
    tile.crop = { type: tool, stage: 0, growth: 0 };
    farm.seeds[tool]--;
    farm.energy -= 3;
    const cx = 8 + pos.col * farm.tileSize + farm.tileSize / 2;
    const cy = 8 + pos.row * farm.tileSize + farm.tileSize / 2;
    spawnParticles(cx, cy, 8, ['#6aaa3a', '#5a9a2a', '#7aba4a'], { speed: 1, spread: 0.6, upward: 1.5 });
    setFarmInfo(`种下了${FARM_CROPS[tool].name}！`);
  } else if (tool === 'water') {
    if (tile.type !== 'planted') { setFarmInfo('只能给种了作物的土地浇水'); return; }
    if (farm.energy < 2) { setFarmInfo('体力不足'); return; }
    tile.watered = true;
    farm.energy -= 2;
    if (tile.crop) tile.crop.growth += 2;
    const cx = 8 + pos.col * farm.tileSize + farm.tileSize / 2;
    const cy = 8 + pos.row * farm.tileSize + farm.tileSize / 2;
    spawnParticles(cx, cy, 10, ['#6ab8d4', '#8ad4ee', '#b0e4f4'], { speed: 0.8, spread: 1.2, upward: -0.5 });
    setFarmInfo('浇水完成，作物加速生长！');
  } else if (tool === 'harvest') {
    if (tile.type !== 'planted' || !tile.crop) { setFarmInfo('这里没有可收获的作物'); return; }
    if (tile.crop.stage < 3) { setFarmInfo('作物还没成熟呢'); return; }
    const cropType = tile.crop.type;
    const cropDef = FARM_CROPS[cropType];
    const bonus = 1 + Math.floor(Math.random() * 2);
    farm.inventory[cropType] = (farm.inventory[cropType] || 0) + 1 + bonus;
    tile.type = 'tilled';
    tile.crop = null;
    const cx = 8 + pos.col * farm.tileSize + farm.tileSize / 2;
    const cy = 8 + pos.row * farm.tileSize + farm.tileSize / 2;
    spawnParticles(cx, cy, 20, [cropDef.color, cropDef.fruitColor, '#f0e040'], { speed: 2, spread: 1.5, upward: 1.5 });
    setFarmInfo(`收获${cropDef.name}！获得 ${1 + bonus} 个，到商店出售换钱`);
  }
  updateFarmUI();
}

function setFarmInfo(msg) {
  farm.info = msg;
  document.getElementById('farmInfo').textContent = msg;
}

function updateFarmUI() {
  document.getElementById('farmMoney').textContent = farm.money;
  document.getElementById('farmEnergy').textContent = Math.floor(farm.energy);
  document.getElementById('farmDay').textContent = farm.day;
  document.getElementById('farmSeedsWheat').textContent = farm.seeds.wheat;
  document.getElementById('farmSeedsCarrot').textContent = farm.seeds.carrot;
  document.getElementById('farmSeedsTomato').textContent = farm.seeds.tomato;

  document.querySelectorAll('.farm-tool').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === farm.selectedTool);
  });
}

function handleFarmToolSelect(toolId) {
  farm.selectedTool = toolId;
  const names = { hoe: '耕地', wheat: '种植小麦', carrot: '种植胡萝卜', tomato: '种植番茄', water: '浇水', harvest: '收获' };
  setFarmInfo(`当前工具：${names[toolId] || toolId}。点击土地使用`);
  updateFarmUI();
}

function handleFarmShop() {
  farm.shopOpen = !farm.shopOpen;
  document.getElementById('farmShop').style.display = farm.shopOpen ? 'block' : 'none';
  if (farm.shopOpen) updateFarmShop();
}

function updateFarmShop() {
  let sellTotal = 0;
  for (const type of ['wheat', 'carrot', 'tomato']) {
    sellTotal += farm.inventory[type] * FARM_CROPS[type].sellPrice;
  }
  document.getElementById('farmSellPrice').textContent = `💰 ${sellTotal}`;
}

function handleFarmBuy(cropType) {
  const def = FARM_CROPS[cropType];
  if (farm.money < def.buyPrice) { setFarmInfo(`钱不够，${def.name}种子需要 ${def.buyPrice} 💰`); return; }
  farm.money -= def.buyPrice;
  farm.seeds[cropType]++;
  setFarmInfo(`购买了 ${def.name}种子`);
  updateFarmUI();
  updateFarmShop();
}

function handleFarmSell() {
  let total = 0;
  for (const type of ['wheat', 'carrot', 'tomato']) {
    if (farm.inventory[type] > 0) {
      total += farm.inventory[type] * FARM_CROPS[type].sellPrice;
      farm.inventory[type] = 0;
    }
  }
  if (total === 0) { setFarmInfo('库存里没有可卖的作物'); return; }
  farm.money += total;
  setFarmInfo(`出售库存，获得 ${total} 💰`);
  updateFarmUI();
  updateFarmShop();
}

function handleFarmReset() {
  if (!confirm('确定要重新开始吗？所有进度将丢失！')) return;
  if (farmAnimId) { cancelAnimationFrame(farmAnimId); farmAnimId = null; }
  initFarm();
}

// 鼠标悬浮高亮
let farmMousePos = null;

function handleFarmMouseMove(e) {
  const rect = farmCanvas.getBoundingClientRect();
  const scaleX = farmCanvas.width / rect.width;
  const scaleY = farmCanvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  farmMousePos = { mx, my };
  const pos = getFarmTileFromPos(mx, my);
  if (pos) { farm.hoverCol = pos.col; farm.hoverRow = pos.row; }
  else { farm.hoverCol = -1; farm.hoverRow = -1; }
}

function handleFarmMouseLeave() {
  farm.hoverCol = -1; farm.hoverRow = -1;
}

document.addEventListener('DOMContentLoaded', () => {
  initFarm();

  farmCanvas.addEventListener('click', handleFarmCanvasClick);
  farmCanvas.addEventListener('mousemove', handleFarmMouseMove);
  farmCanvas.addEventListener('mouseleave', handleFarmMouseLeave);

  document.getElementById('farmToolbar').addEventListener('click', e => {
    const btn = e.target.closest('.farm-tool');
    if (btn && btn.dataset.tool) handleFarmToolSelect(btn.dataset.tool);
  });

  document.getElementById('farmShopBtn').addEventListener('click', handleFarmShop);
  document.getElementById('farmShopClose').addEventListener('click', () => { farm.shopOpen = false; document.getElementById('farmShop').style.display = 'none'; });

  document.getElementById('farmShop').addEventListener('click', e => {
    const btn = e.target.closest('.farm-shop-btn');
    if (!btn) return;
    if (btn.id === 'farmSellBtn') handleFarmSell();
    else if (btn.dataset.crop) handleFarmBuy(btn.dataset.crop);
  });

  document.getElementById('farmResetBtn').addEventListener('click', handleFarmReset);

  window.addEventListener('resize', () => { if (farm) resizeFarmCanvas(); });
});
