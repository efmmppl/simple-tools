// 文字冒险游戏 - 全局状态（场景、生命、背包等）
var advState = {};
// 剧情场景数据（场景名 → 场景对象）
var advStory = {};
// 打字机效果定时器
var advTypingTimer = null;
// 打字机效果完成回调
var advTypingCallback = null;

// 初始化 Web Audio 上下文
function advInitAudio() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    advState.audioCtx = ctx;
  } catch (e) {}
}

// 播放指定频率、时长和波形的音效
function advPlayTone(freq, duration, type) {
  var ctx = advState.audioCtx;
  if (!ctx) return;
  try {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// 拾取物品音效
function advPlayPickup() { advPlayTone(880, 0.1, 'sine'); setTimeout(function () { advPlayTone(1100, 0.15, 'sine'); }, 100); }
// 受伤音效
function advPlayDamage() { advPlayTone(150, 0.3, 'sawtooth'); }
// 成功音效
function advPlaySuccess() { advPlayTone(660, 0.1, 'sine'); setTimeout(function () { advPlayTone(880, 0.1, 'sine'); }, 120); setTimeout(function () { advPlayTone(1100, 0.2, 'sine'); }, 240); }
// 死亡音效
function advPlayDeath() { advPlayTone(300, 0.2, 'sawtooth'); setTimeout(function () { advPlayTone(200, 0.3, 'sawtooth'); }, 200); setTimeout(function () { advPlayTone(100, 0.5, 'sawtooth'); }, 450); }
// 点击音效
function advPlayClick() { advPlayTone(600, 0.05, 'sine'); }

// 停止打字机效果并触发回调
function advStopTyping() {
  if (advTypingTimer) { clearInterval(advTypingTimer); advTypingTimer = null; }
  if (advTypingCallback) { advTypingCallback(); advTypingCallback = null; }
}

// 检查背包中是否有指定物品
function advHasItem(item) { return advState.inventory.indexOf(item) !== -1; }

// 向背包添加物品，拾取时播放音效
function advAddItem(item) {
  if (!advHasItem(item)) { advState.inventory.push(item); advPlayPickup(); advRenderHUD(); }
}

// 从背包移除物品
function advRemoveItem(item) {
  var idx = advState.inventory.indexOf(item);
  if (idx !== -1) { advState.inventory.splice(idx, 1); advRenderHUD(); }
}

// 对玩家造成伤害（不低于 0）
function advDamage(amount) {
  advState.health = Math.max(0, advState.health - amount);
  advPlayDamage();
  advRenderHUD();
}

// 治疗玩家（不超过上限 100）
function advHeal(amount) {
  advState.health = Math.min(100, advState.health + amount);
  advRenderHUD();
}

advStory = {
  // ===== 开场 =====
  intro: {
    title: '◈ 神秘古堡：暗影传说 ◈',
    text: '你是江湖上小有名气的寻宝人"影子"，一生探访过无数秘境。\n\n这一次，你的目标是传说中的暗影古堡——据说里面沉睡着古代王族的珍宝。\n\n但你踏入古堡大门的那一刻，一股异样的力量将你击晕……',
    choices: [
      { text: '▶ 开始冒险', next: 'start' }
    ],
    onEnter: function () { advState.steps = 0; }
  },
  // ===== 地牢区域 =====
  start: {
    title: '醒来',
    text: '你缓缓睁开眼睛，后脑勺传来阵阵剧痛。\n\n四周一片漆黑，空气中弥漫着潮湿的霉味和铁锈的气息。你伸手摸索——冰冷的石板地面，粗糙的石墙。\n\n你被关在一间地牢里。',
    choices: [
      { text: '🔍 摸索周围环境', next: 'cell' }
    ]
  },
  cell: {
    title: '地牢',
    text: function () {
      var t = '你的眼睛逐渐适应了黑暗。这间牢房大约三步见方：\n';
      if (!advHasItem('rustyNail')) t += '\n• 墙角铺着一堆发霉的干草';
      t += '\n• 对面的墙上似乎刻着字';
      if (!advHasItem('lockpick')) t += '\n• 牢门是铁栅栏门，挂着锁';
      else t += '\n• 牢门已经被你撬开了';
      return t;
    },
    choices: function () {
      var c = [];
      if (!advHasItem('rustyNail')) c.push({ text: '搜索干草堆', next: 'cellHay' });
      c.push({ text: '查看墙上刻字', next: 'cellWall' });
      if (advState.canEscape) c.push({ text: '走出牢门', next: 'corridor' });
      else c.push({ text: '检查牢门', next: 'cellDoor' });
      return c;
    }
  },
  // 地牢 - 搜索干草堆获得生锈铁钉
  cellHay: {
    title: '干草堆',
    text: '你在发霉的干草堆中翻找，手指碰到了什么尖锐的东西。\n\n是一根生锈的铁钉！虽然锈迹斑斑，但用来撬锁应该足够了。',
    choices: [
      { text: '收进口袋', next: 'cell' }
    ],
    onEnter: function () { advAddItem('rustyNail'); }
  },
  // 地牢 - 墙上刻字，获得游戏提示
  cellWall: {
    title: '墙上刻字',
    text: '墙上刻着几行潦草的字迹：\n\n"我，皇家守卫凯恩，因背叛被囚于此。\n\n暗影古堡的秘密：\n\n- 武器库里有压制暗影的钢剑\n- 图书馆的古籍记载着光明护符的咒语\n- 地牢深处埋藏着 dungeonKey\n- 集齐三样，方能面对王座上的黑暗"\n\n刻字的最后，有一个指向下方的箭头。',
    choices: [
      { text: '返回牢房中央', next: 'cell' }
    ]
  },
  // 地牢 - 撬锁逃出牢房
  cellDoor: {
    title: '牢门',
    text: function () {
      if (advHasItem('rustyNail')) return '铁锁已经锈蚀得厉害。你用铁钉插入锁孔，轻轻转动——\n\n咔嗒！锁开了。\n\n牢门吱呀一声打开，一条幽暗的走廊展现在你面前。';
      return '铁栅栏门上挂着一把大锁。你用力拽了拽，纹丝不动。\n\n你需要什么东西来撬开它……也许牢房里能找到什么有用的东西。';
    },
    choices: function () {
      if (advHasItem('rustyNail')) {
        return [
          { text: '推开牢门，走进走廊', next: 'corridor' }
        ];
      }
      return [{ text: '返回牢房继续搜索', next: 'cell' }];
    },
    onEnter: function () {
      if (advHasItem('rustyNail')) { advState.canEscape = true; advPlaySuccess(); }
    }
  },
  corridor: {
    title: '走廊',
    text: '你站在一条长长的走廊中。墙壁上的火把发出昏暗摇曳的光。\n\n走廊向各个方向延伸：\n\n⬅ 西侧传来金属碰撞声——可能是武器库\n➡ 东侧飘来食物气味——似乎是厨房\n⬆ 北端是一扇厚重的雕花大门\n⬇ 南侧楼梯通向地下深处',
    choices: [
      { text: '⬅ 前往西侧武器库', next: 'armory' },
      { text: '➡ 前往东侧厨房', next: 'kitchen' },
      { text: '⬆ 走向雕花大门', next: 'greatHall' },
      { text: '⬇ 走下楼梯', next: 'dungeon' },
      { text: '📖 前往图书馆', next: 'library' }
    ],
    onEnter: function () { advState.steps++; }
  },
  armory: {
    title: '武器库',
    text: function () {
      var lines = ['武器库里横七竖八地散落着兵器架。灰尘覆盖了一切，但有些东西仍然闪着寒光。'];
      if (!advHasItem('sword')) lines.push('\n\n⚔ 一柄钢剑靠在墙角，剑刃依然锋利。剑柄上刻着铭文："光明驱散暗影"。');
      if (!advHasItem('shield')) lines.push('\n\n🛡 一面铁盾挂在墙上，虽然有些凹陷，但依然坚固。');
      if (advHasItem('sword') && advHasItem('shield')) lines.push('\n\n这里已经没什么有用的东西了。');
      return lines.join('');
    },
    choices: function () {
      var c = [];
      if (!advHasItem('sword')) c.push({ text: '⚔ 拿起钢剑', next: 'armorySword' });
      if (!advHasItem('shield')) c.push({ text: '🛡 取下铁盾', next: 'armoryShield' });
      c.push({ text: '返回走廊', next: 'corridor' });
      return c;
    }
  },
  // 武器库 - 获得钢剑
  armorySword: {
    title: '钢剑',
    text: '你握住剑柄，一股暖流涌入身体。剑身上的铭文泛起微弱的蓝光。\n\n这柄剑正是克制暗影的利器。',
    choices: [{ text: '收好钢剑', next: 'armory' }],
    onEnter: function () { advAddItem('sword'); }
  },
  // 武器库 - 获得铁盾
  armoryShield: {
    title: '铁盾',
    text: '你取下铁盾，试了试手感。虽然有些沉，但足以抵挡攻击。\n\n你将盾牌绑在左臂上。',
    choices: [{ text: '装备铁盾', next: 'armory' }],
    onEnter: function () { advAddItem('shield'); }
  },
  // ===== 厨房 =====
  kitchen: {
    title: '厨房',
    text: function () {
      var t = '厨房里一片狼藉，但灶台上还保留着一些东西。';
      if (!advHasItem('healthPotion')) t += '\n\n🧪 一瓶红色的液体，散发着药草的清香——治疗药水。';
      if (!advHasItem('food')) t += '\n\n🍞 桌子上有半块黑面包和一瓶水。虽然简陋，但能补充体力。';
      if (advHasItem('healthPotion') && advHasItem('food')) t += '\n\n能吃的东西都被你搜刮干净了。';
      if (advState.health < 100) t += '\n\n你的身体状况：' + advState.health + '/100';
      return t;
    },
    choices: function () {
      var c = [];
      if (!advHasItem('healthPotion')) c.push({ text: '🧪 拿走治疗药水', next: 'kitchenPotion' });
      if (!advHasItem('food')) c.push({ text: '🍞 拿走面包和水', next: 'kitchenFood' });
      if (advHasItem('healthPotion') && advState.health < 100) c.push({ text: '🧪 喝下治疗药水', next: 'kitchenDrink' });
      c.push({ text: '返回走廊', next: 'corridor' });
      return c;
    }
  },
  // 厨房 - 获得治疗药水
  kitchenPotion: {
    title: '治疗药水',
    text: '你将红色的药水瓶小心收好。瓶身微暖，散发出淡淡的草药香。',
    choices: [{ text: '继续搜索厨房', next: 'kitchen' }],
    onEnter: function () { advAddItem('healthPotion'); }
  },
  // 厨房 - 获得食物，回复 10 生命
  kitchenFood: {
    title: '面包和水',
    text: '虽然黑面包硬得像石头，但你实在太饿了。就着水吃了几口，体力恢复了一些。\n\n❤ +10 生命值',
    choices: [{ text: '感觉好多了', next: 'kitchen' }],
    onEnter: function () { advAddItem('food'); advHeal(10); }
  },
  // 厨房 - 喝下治疗药水，回复 30 生命
  kitchenDrink: {
    title: '饮用',
    text: '你拔开瓶塞，一口气喝下了治疗药水。一股暖流流过全身，伤口以肉眼可见的速度愈合。\n\n❤ +30 生命值',
    choices: [{ text: '状态恢复了', next: 'kitchen' }],
    onEnter: function () { advRemoveItem('healthPotion'); advHeal(30); }
  },
  // ===== 图书馆 =====
  library: {
    title: '图书馆',
    text: function () {
      var t = '一间巨大的圆形图书馆，高耸的书架直抵天花板。月光从穹顶的彩窗洒落，在地板上投下五彩斑斓的光影。';
      if (!advHasItem('ancientAmulet')) t += '\n\n📖 书架最上层有一本发光的古籍，封面写着"光明咒术"。';
      if (!advHasItem('mapFragment')) t += '\n\n🗺 一张泛黄的羊皮纸从书页中露出一角。';
      if (advHasItem('ancientAmulet') && advHasItem('mapFragment')) t += '\n\n你已取走了这里的秘密。';
      return t;
    },
    choices: function () {
      var c = [];
      if (!advHasItem('ancientAmulet')) c.push({ text: '📖 阅读光明咒术', next: 'libraryAmulet' });
      if (!advHasItem('mapFragment')) c.push({ text: '🗺 抽出羊皮纸', next: 'libraryMap' });
      c.push({ text: '返回走廊', next: 'corridor' });
      return c;
    }
  },
  // 图书馆 - 获得光明护符
  libraryAmulet: {
    title: '光明咒术',
    text: '你翻开古籍，一道金光闪现。书页上的文字仿佛活了过来，化作一串咒语涌入你的脑海。\n\n你按照书中的指引，在书架暗格中找到了一枚光明护符。护符散发着温暖的光芒，驱散了周围的阴冷气息。\n\n🔮 获得光明护符',
    choices: [{ text: '戴上护符', next: 'library' }],
    onEnter: function () { advAddItem('ancientAmulet'); }
  },
  // 图书馆 - 获得地图碎片
  libraryMap: {
    title: '羊皮纸',
    text: '你小心地抽出羊皮纸。这是一张古堡的局部地图！\n\n上面标记了一条密道——从王座厅的雕像后面可以通往藏宝室，绕过守卫。\n\n🗺 获得古堡地图碎片',
    choices: [{ text: '收好地图', next: 'library' }],
    onEnter: function () { advAddItem('mapFragment'); }
  },
  // ===== 地牢深处 =====
  dungeon: {
    title: '地牢深处',
    text: function () {
      if (advState.dungeonCleared) return '地牢深处一片死寂。暗影兽的尸体还躺在原地，你搜刮了它的巢穴，找到了 dungeonKey。\n\n出口就在上方。';
      if (!advHasItem('sword')) return '你走下楼梯，进入了一个更加阴暗的空间。突然，一双血红色的眼睛在黑暗中亮起！\n\n一头暗影兽朝你扑来！你手无寸铁，只能拼命躲闪。\n\n你被利爪划伤，勉强逃回走廊。\n\n❤ -25 生命值';
      return '你走下楼梯，进入了一个更加阴暗的空间。一双血红色的眼睛在黑暗中亮起！\n\n一头暗影兽低吼着朝你冲来。但你手握钢剑，毫无畏惧！';
    },
    choices: function () {
      if (advState.dungeonCleared) return [
        { text: '返回走廊', next: 'corridor' }
      ];
      if (!advHasItem('sword')) return [
        { text: '逃回走廊', next: 'corridor' }
      ];
      return [
        { text: '⚔ 拔剑迎战', next: 'dungeonFight' }
      ];
    },
    onEnter: function () {
      if (!advState.dungeonCleared && !advHasItem('sword')) {
        advDamage(25);
      }
    }
  },
  // 地牢深处 - 暗影兽战斗
  dungeonFight: {
    title: '战斗',
    text: '暗影兽咆哮着扑来，你侧身一闪，挥剑横斩！\n\n钢剑划出一道蓝光，正中暗影兽的腹部。它发出一声凄厉的嘶吼，化作黑烟消散。\n\n在它消失的地方，一把 dungeonKey 掉在地上。\n\n⚔ 战斗胜利！',
    choices: [
      { text: '🔑 捡起 dungeonKey', next: 'dungeonReward' }
    ]
  },
  // 地牢深处 - 获得 dungeonKey
  dungeonReward: {
    title: '地牢深处',
    text: '你捡起 dungeonKey，它通体漆黑，却微微发热。这应该就是通往王座厅的钥匙。\n\n暗影兽的巢穴里还有一些金币和宝石，你都收进了口袋。',
    choices: [
      { text: '返回走廊', next: 'corridor' }
    ],
    onEnter: function () {
      advAddItem('dungeonKey');
      advState.dungeonCleared = true;
      advState.hasDungeonKey = true;
      advPlaySuccess();
    }
  },
  // ===== 大厅 =====
  greatHall: {
    title: '大厅',
    text: function () {
      var t = '你推开雕花大门，眼前豁然开朗。\n\n这是一座宏伟的大厅，高耸的穹顶上绘满了壁画——描绘着古代王国与暗影军团的大战。\n\n大厅中央有一座石雕喷泉，虽然早已干涸。四周立着历代国王的石像。';
      if (!advHasItem('ruby')) t += '\n\n其中一尊骑士雕像的剑柄上镶嵌着一颗鸽血红的宝石，在幽暗中微微发光。';
      t += '\n\n北墙有一扇巨大的铁门，需要特殊的钥匙才能打开（dungeonKey）。';
      if (advHasItem('mapFragment')) t += '\n\n你想起地图上标记的密道入口，似乎就在某尊雕像后面。';
      return t;
    },
    choices: function () {
      var c = [];
      if (!advHasItem('ruby')) c.push({ text: '🔴 取下骑士剑上的宝石', next: 'greatHallRuby' });
      if (advHasItem('dungeonKey')) c.push({ text: '🚪 用 dungeonKey 打开铁门', next: 'throneRoom' });
      if (advHasItem('mapFragment') && advHasItem('dungeonKey')) c.push({ text: '🗺 寻找地图上的密道', next: 'secretEnding' });
      c.push({ text: '上楼前往塔楼', next: 'tower' });
      c.push({ text: '下楼前往墓穴', next: 'crypt' });
      c.push({ text: '返回走廊', next: 'corridor' });
      return c;
    },
    onEnter: function () { advState.steps++; }
  },
  // 大厅 - 获得红宝石
  greatHallRuby: {
    title: '红宝石',
    text: '你走近骑士雕像，伸手触碰剑柄上的宝石。\n\n就在你的指尖碰到宝石的瞬间，雕像的眼睛亮起了诡异的光芒！\n\n但什么都没有发生。宝石顺利地被你取了下来，温润光滑，内部仿佛有火焰在流动。\n\n🔴 获得红宝石',
    choices: [{ text: '收好宝石', next: 'greatHall' }],
    onEnter: function () { advAddItem('ruby'); }
  },
  // ===== 塔楼 =====
  tower: {
    title: '塔楼',
    text: function () {
      var t = '你沿着旋转石梯爬上塔楼。顶层的房间里，窗户敞开着，夜风灌进来。\n\n从这里望去，可以看到古堡外的森林和远方的山峦。\n\n月亮正圆，月光如水。';
      if (!advHasItem('rope')) t += '\n\n房间角落里有一卷结实的麻绳，足够承受一个人的重量。';
      if (advHasItem('rope')) t += '\n\n麻绳还在那里，也许逃走是个不错的选择……';
      return t;
    },
    choices: function () {
      var c = [];
      if (!advHasItem('rope')) c.push({ text: '🧗 拿走麻绳', next: 'towerRope' });
      if (advHasItem('rope')) c.push({ text: '🧗 用麻绳从窗户逃生', next: 'escape' });
      c.push({ text: '返回大厅', next: 'greatHall' });
      return c;
    }
  },
  // 塔楼 - 获得麻绳
  towerRope: {
    title: '麻绳',
    text: '你抖了抖麻绳，非常结实。无论是要继续深入还是随时撤退，这都会派上用场。',
    choices: [{ text: '绑好绳子背在身上', next: 'tower' }],
    onEnter: function () { advAddItem('rope'); }
  },
  // ===== 墓穴 =====
  crypt: {
    title: '墓穴',
    text: function () {
      if (advState.cryptSearched) return '墓穴已被你搜索一空。石棺周围散落着古代钱币。';
      if (advHasItem('ancientAmulet')) return '你步入墓穴，黑暗中有窸窣声传来。但光明护符散发出柔和的光芒，那些声音便退去了。\n\n你在石棺中发现了一件暗影护甲，轻便而坚韧。\n\n🔥 获得暗影护甲（+20 最大生命值）';
      return '你摸索着走下墓穴的台阶。黑暗中传来令人不安的窸窣声……\n\n突然，你撞到了什么——是一具石棺。你听到周围有更多动静，决定还是先离开为妙。';
    },
    choices: function () {
      if (advState.cryptSearched) return [{ text: '返回大厅', next: 'greatHall' }];
      if (advHasItem('ancientAmulet')) return [
        { text: '🔥 穿上暗影护甲', next: 'cryptArmor' },
        { text: '返回大厅', next: 'greatHall' }
      ];
      return [{ text: '赶紧返回大厅', next: 'greatHall' }];
    }
  },
  // 墓穴 - 获得暗影护甲（提升 20 最大生命）
  cryptArmor: {
    title: '暗影护甲',
    text: '你穿上暗影护甲，它仿佛为你量身定制。你感到一股力量注入体内——你的生命上限提升了。\n\n❤ 最大生命值 +20',
    choices: [{ text: '返回大厅', next: 'greatHall' }],
    onEnter: function () {
      advState.cryptSearched = true;
      advState.maxHealth = 120;
      advState.health = Math.min(advState.health + 20, advState.maxHealth);
      advAddItem('shadowArmor');
      advPlaySuccess();
    }
  },
  // ===== BOSS 战 =====
  throneRoom: {
    title: '◈ 王座厅 ◈',
    text: function () {
      var t = '铁门缓缓打开，你走进了一间巨大的王座厅。\n\n十二根黑曜石柱子支撑着穹顶，尽头的高台上，一座漆黑的王座上坐着一个人影——\n\n不，那不是人。\n\n它缓缓抬起头，两团幽蓝的火焰在眼眶中燃烧。暗影之王！\n\n一个低沉的声音回荡在大厅中：\n\n"又一个寻宝者……让我看看你有几分本事。"\n\n';
      if (advHasItem('sword') && advHasItem('ancientAmulet')) t += '\n你一手握剑，一手持护符。剑光与护符的光芒交织在一起——这正是克制暗影的力量！\n\n暗影之王发出一声怒吼，你感到它在畏惧。';
      else if (advHasItem('sword')) t += '\n你紧握钢剑，虽然剑刃散发着微弱的蓝光，但没有护符的保护，暗影之力仍然在侵蚀着你。\n\n这将是一场苦战。';
      else t += '\n你手无寸铁，暗影之王的狂笑震得整个大厅都在颤抖。';
      return t;
    },
    choices: function () {
      if (advHasItem('sword') && advHasItem('ancientAmulet')) return [
        { text: '⚔ 光明之力·全力一击！', next: 'bossWin' }
      ];
      if (advHasItem('sword')) return [
        { text: '⚔ 拼死一搏！', next: 'bossHard' },
        { text: '🏃 撤退！', next: 'greatHall' }
      ];
      return [
        { text: '😱 绝望……', next: 'bossLose' }
      ];
    },
    onEnter: function () { advPlayTone(200, 1, 'sawtooth'); }
  },
  // BOSS 战 - 完美结局（有剑 + 护符）
  bossWin: {
    title: '⚡ 光明之剑',
    text: '你举起钢剑，光明护符的能量顺着你的手臂涌入剑身。整柄剑迸发出耀眼的金色光芒！\n\n"这不可能——那是上古光明剑术——！"暗影之王惊恐地尖叫。\n\n你纵身跃起，一剑斩下。金光吞没了整个王座厅，暗影之王在光芒中化作飞灰。\n\n当光芒散去，王座厅恢复了宁静。阳光透过穹顶的裂缝照射进来——这是古堡数百年来第一次照进阳光。\n\n王座后面，一扇暗门缓缓打开，露出通往藏宝室的道路。',
    choices: [
      { text: '🚪 走进藏宝室', next: 'treasure' }
    ],
    onEnter: function () {
      advPlaySuccess();
      advState.ending = 'good';
    }
  },
  // BOSS 战 - 惨胜（有剑无护符）
  bossHard: {
    title: '苦战',
    text: '你冲向暗影之王，钢剑与它的暗影之爪碰撞出刺眼的火花。\n\n战斗持续了很久。你被击倒多次，但一次次爬起来。最终，你抓住一个破绽，将钢剑刺入了它的心脏。\n\n暗影之王发出最后的咆哮，化为黑烟消散。\n\n但你受了重伤……\n\n❤ -40 生命值',
    choices: [
      { text: '🚪 蹒跚走进藏宝室', next: 'treasure' }
    ],
    onEnter: function () {
      advDamage(40);
      advState.ending = 'hard';
      if (advState.health > 0) {
        setTimeout(function () {
          advPlaySuccess();
        }, 500);
      }
    }
  },
  // BOSS 战 - 败北（手无寸铁）
  bossLose: {
    title: '💀 暗影吞噬',
    text: '暗影之王伸出手，一股无形的力量将你提起，悬在半空。\n\n"弱者……永远只是养料。"\n\n黑暗淹没了你的意识。你的身体化作暗影的一部分，永远留在了古堡之中……',
    choices: [
      { text: '💀 再次挑战', next: '__restart' }
    ],
    isEnd: true,
    onEnter: function () { advPlayDeath(); advState.ending = 'death'; }
  },
  // ===== 结局 =====
  treasure: {
    title: '✨ 古代藏宝室 ✨',
    text: function () {
      var t = '你走进藏宝室，被眼前的景象震撼了——\n\n金币堆成小山，宝石镶嵌在黄金器皿上，墙上挂满了古代名画，架子上摆满了魔法卷轴和神器。\n\n数不尽的财富！';
      if (advState.ending === 'good') t += '\n\n阳光从藏宝室的窗户照进来，你沐浴在温暖的光芒中。你不仅找到了宝藏，还消灭了暗影之王，解放了这座古堡。\n\n🏆 完美结局！';
      else t += '\n\n你拖着受伤的身体，抓起一把金币。虽然代价惨重，但你活下来了。\n\n🏆 艰难取胜！';
      return t;
    },
    choices: [
      { text: '🏆 再来一次', next: '__restart' }
    ],
    isEnd: true,
    onEnter: function () { advPlaySuccess(); }
  },
  // 结局 - 从塔楼逃亡
  escape: {
    title: '🌙 月夜逃亡',
    text: '你将麻绳固定在窗框上，深吸一口气，滑了下去。\n\n绳子刚好够到城堡外的护城河。你扑通一声跳入水中，奋力游向对岸。\n\n当你爬上岸，回头望去——暗影古堡在月光下静静矗立，仿佛什么都没有发生过。\n\n你没有得到宝藏，但你保住了性命。有时候，这就够了。',
    choices: [
      { text: '🏆 再来一次', next: '__restart' }
    ],
    isEnd: true,
    onEnter: function () { advState.ending = 'escape'; advPlaySuccess(); }
  },
  // 结局 - 隐藏密道（需地图 + dungeonKey）
  secretEnding: {
    title: '🗺 密道发现',
    text: '你根据地图的指引，在骑士雕像的背后摸索。果然有一块砖是松动的。\n\n你用力一推，墙壁无声地滑开了，露出一条隐秘的通道。\n\n通道很窄，但仅容一人通过。你侧身挤了进去……\n\n通道尽头是一间密室，堆放着历代国王的真正宝藏——不是黄金珠宝，而是失传的魔法典籍和神器。\n\n你找到了比财富更有价值的东西：知识。\n\n🏆 隐藏结局：智慧的宝藏！',
    choices: [
      { text: '🏆 再来一次', next: '__restart' }
    ],
    isEnd: true,
    onEnter: function () {
      advState.ending = 'secret';
      advPlaySuccess();
    }
  },
  // 结局 - 生命归零
  death: {
    title: '☠ 陨落',
    text: function () {
      if (advState.health <= 0) return '你的视线逐渐模糊，身体再也支撑不住……\n\n暗影古堡中又多了一具骸骨。\n\n也许下一个冒险者会发现你的遗物。';
      return '命运在此转折……你的冒险结束了。';
    },
    choices: [
      { text: '💀 再来一次', next: '__restart' }
    ],
    isEnd: true,
    onEnter: function () { if (advState.ending !== 'death') advPlayDeath(); advState.ending = 'death'; }
  }
};

// 进入指定场景：渲染文本、绑定选项、触发打字机效果
function enterScene(sceneId) {
  advStopTyping();
  if (sceneId === '__restart') { resetAdventure(); return; }

  var textEl = document.getElementById('advText');
  if (textEl.advSkipFn) { textEl.removeEventListener('click', textEl.advSkipFn); textEl.advSkipFn = null; }

  var scene = advStory[sceneId];
  if (!scene) return;
  if (advState.health <= 0 && sceneId !== 'death') { enterScene('death'); return; }

  advState.scene = sceneId;
  if (scene.onEnter) scene.onEnter();
  if (advState.health <= 0 && sceneId !== 'death' && sceneId !== '__restart') { enterScene('death'); return; }

  var title = scene.title || '';
  var rawText = typeof scene.text === 'function' ? scene.text() : scene.text;
  var choices = typeof scene.choices === 'function' ? scene.choices() : scene.choices;

  var container = document.getElementById('advContainer');
  container.className = 'adv-container';
  if (scene.isEnd) container.classList.add('adv-end');
  var choicesEl = document.getElementById('advChoices');
  choicesEl.innerHTML = '';

  var titleHtml = title ? '<div class="adv-title">' + escapeHtml(title) + '</div>' : '';
  textEl.innerHTML = titleHtml + '<div class="adv-body"></div>';
  var bodyEl = textEl.querySelector('.adv-body');

  var choicesDisabled = scene.isEnd ? false : true;
  if (choicesDisabled) {
    var waitingEl = document.createElement('div');
    waitingEl.className = 'adv-waiting';
    waitingEl.textContent = '▎';
    choicesEl.appendChild(waitingEl);
  }

  advRenderHUD();

  var isVisible = document.getElementById('tool-adventure').classList.contains('active');

    // 直接显示完整文本（非打字机模式，用于后台标签页）
    function showFullText() {
    bodyEl.innerHTML = escapeHtml(rawText).replace(/\n/g, '<br>');
    choicesEl.innerHTML = '';
    choices.forEach(function (ch) {
      var btn = document.createElement('button');
      btn.className = 'adv-choice-btn adv-choice-show';
      btn.textContent = ch.text;
      btn.addEventListener('click', function () { advPlayClick(); enterScene(ch.next); });
      choicesEl.appendChild(btn);
    });
  }

  if (!isVisible) {
    showFullText();
    return;
  }

  var chars = escapeHtml(rawText).split('');
  var idx = 0;
  var speed = 18;

  if (scene.isEnd) speed = 30;

    // 逐字输出文本（打字机效果）
    function doType() {
    if (idx < chars.length) {
      bodyEl.textContent += chars[idx++];
      advTypingTimer = setTimeout(doType, speed);
    } else {
      bodyEl.innerHTML = bodyEl.textContent.replace(/\n/g, '<br>');
      advTypingTimer = null;
      choicesEl.innerHTML = '';
      choices.forEach(function (ch) {
        var btn = document.createElement('button');
        btn.className = 'adv-choice-btn';
        btn.textContent = ch.text;
        btn.addEventListener('click', function () { advPlayClick(); enterScene(ch.next); });
        choicesEl.appendChild(btn);
        setTimeout(function () { btn.classList.add('adv-choice-show'); }, 30);
      });
    }
  }

  advTypingTimer = setTimeout(doType, 200);

  // 点击跳过打字机效果，直接显示全文
  textEl.advSkipFn = function advSkipText() {
    if (advTypingTimer) {
      clearTimeout(advTypingTimer);
      advTypingTimer = null;
      bodyEl.textContent = escapeHtml(rawText);
      bodyEl.innerHTML = bodyEl.textContent.replace(/\n/g, '<br>');
      choicesEl.innerHTML = '';
      choices.forEach(function (ch) {
        var btn = document.createElement('button');
        btn.className = 'adv-choice-btn adv-choice-show';
        btn.textContent = ch.text;
        btn.addEventListener('click', function () { advPlayClick(); enterScene(ch.next); });
        choicesEl.appendChild(btn);
      });
    }
  };
  textEl.addEventListener('click', textEl.advSkipFn);
}

// 渲染 HUD：生命值进度条、步数、背包物品
function advRenderHUD() {
  var hudEl = document.getElementById('advHud');
  if (!hudEl) return;

  var health = advState.health;
  var maxHealth = advState.maxHealth || 100;
  var pct = Math.round((health / maxHealth) * 100);
  var color = pct > 60 ? '#6b8f5e' : pct > 30 ? '#d4a84a' : '#b85454';

  hudEl.innerHTML =
    '<div class="adv-hud-row">' +
    '  <div class="adv-hud-health">' +
    '    <span class="adv-hud-label">❤ 生命</span>' +
    '    <div class="adv-hud-bar-bg">' +
    '      <div class="adv-hud-bar" style="width:' + pct + '%;background:' + color + '"></div>' +
    '    </div>' +
    '    <span class="adv-hud-value">' + health + '/' + maxHealth + '</span>' +
    '  </div>' +
    '  <div class="adv-hud-steps">步数: ' + (advState.steps || 0) + '</div>' +
    '</div>' +
    '<div class="adv-hud-inv">' +
    '  <span class="adv-hud-label">🎒 背包:</span> ' +
    (advState.inventory.length === 0 ? '<span class="adv-hud-empty">空</span>' :
      advState.inventory.map(function (item) {
        var icons = { rustyNail: '📌', sword: '⚔', shield: '🛡', healthPotion: '🧪', food: '🍞', ancientAmulet: '🔮', mapFragment: '🗺', dungeonKey: '🔑', ruby: '🔴', rope: '🧗', shadowArmor: '🔥' };
        return '<span class="adv-hud-item">' + (icons[item] || '📦') + ' ' + item + '</span>';
      }).join(' ')) +
    '</div>';
}

// 重置游戏状态回到开场
function resetAdventure() {
  advStopTyping();
  advState = {
    scene: 'intro',
    health: 100,
    maxHealth: 100,
    inventory: [],
    steps: 0,
    canEscape: false,
    dungeonCleared: false,
    cryptSearched: false,
    hasDungeonKey: false,
    ending: null,
    audioCtx: advState.audioCtx || null
  };
  advRenderHUD();
  enterScene('intro');
}

// 重置按钮事件绑定
document.getElementById('advResetBtn').addEventListener('click', function () { advPlayClick(); resetAdventure(); });

// 初始游戏状态
advState = {
  scene: 'intro',
  health: 100,
  maxHealth: 100,
  inventory: [],
  steps: 0,
  canEscape: false,
  dungeonCleared: false,
  cryptSearched: false,
  hasDungeonKey: false,
  ending: null,
  audioCtx: null
};
advInitAudio();
enterScene('intro');
