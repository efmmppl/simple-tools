// 五子棋棋盘尺寸（15×15）
var GOMOKU_SIZE = 15;
// 四个检测方向：横、竖、撇、捺
var GOMOKU_DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
// 连子数对应的分值（用于 AI 评分）
var GOMOKU_SHAPE = [0, 1, 12, 120, 1400, 1200000];
// 人机模式下 AI 固定执白
var GOMOKU_AI = 2;

// 棋盘状态：0 空、1 黑、2 白
var gomokuBoard = [];
// 当前执子方
var gomokuCurrent = 1;
// 模式：ai 人机、pvp 双人
var gomokuMode = 'ai';
// 难度：easy / medium / hard
var gomokuDifficulty = 'medium';
// 对局是否结束
var gomokuOver = false;
// 落子历史（用于悔棋）
var gomokuHistory = [];
// 最后一手坐标
var gomokuLast = null;
// 获胜连线坐标
var gomokuWinLine = null;
// 画布与上下文
var gomokuCanvas = null;
var gomokuCtx = null;
var gomokuPixel = 0;

// gomokuInit - 初始化画布并开局
function gomokuInit() {
  gomokuCanvas = document.getElementById('gomokuCanvas');
  gomokuCtx = gomokuCanvas.getContext('2d');
  gomokuNewGame();
}

// gomokuNewGame - 重置棋盘开始新对局
function gomokuNewGame() {
  gomokuBoard = [];
  for (var r = 0; r < GOMOKU_SIZE; r++) {
    gomokuBoard[r] = [];
    for (var c = 0; c < GOMOKU_SIZE; c++) gomokuBoard[r][c] = 0;
  }
  gomokuCurrent = 1;
  gomokuOver = false;
  gomokuHistory = [];
  gomokuLast = null;
  gomokuWinLine = null;
  gomokuResize();
  gomokuUpdateStatus();
  gomokuUpdateRecord();
}

// gomokuResize - 按容器宽度与设备像素比重设画布尺寸
function gomokuResize() {
  if (!gomokuCanvas) return;
  var wrap = gomokuCanvas.parentElement;
  var availW = wrap.clientWidth || 0;
  var availH = window.innerHeight - 200;
  var size = availW > 0 ? availW : 860;
  if (size > 860) size = 860;
  if (availH > 560 && size > availH) size = availH;
  if (size < 280) size = 280;
  if (availW > 0 && size > availW) size = availW;
  if (size < 240) size = 240;
  var dpr = window.devicePixelRatio || 1;
  gomokuCanvas.width = Math.round(size * dpr);
  gomokuCanvas.height = Math.round(size * dpr);
  gomokuCanvas.style.width = size + 'px';
  gomokuCanvas.style.height = size + 'px';
  gomokuCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gomokuPixel = size;
  gomokuRender();
}

// gomokuThemeColor - 读取当前主题的 CSS 变量色值
function gomokuThemeColor(name, fallback) {
  var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// gomokuRender - 绘制棋盘、棋子与获胜连线
function gomokuRender() {
  if (!gomokuCtx) return;
  var ctx = gomokuCtx;
  var size = gomokuPixel;
  if (size <= 0) return;
  var cell = size / GOMOKU_SIZE;
  var boardBg = gomokuThemeColor('--card', '#fcfaf5');
  var lineColor = gomokuThemeColor('--text-mid', '#8a857c');
  var accent = gomokuThemeColor('--primary', '#6b8f5e');

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = boardBg;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  for (var i = 0; i < GOMOKU_SIZE; i++) {
    var p = (i + 0.5) * cell;
    ctx.beginPath();
    ctx.moveTo(cell / 2, p);
    ctx.lineTo(size - cell / 2, p);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p, cell / 2);
    ctx.lineTo(p, size - cell / 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  var stars = [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]];
  ctx.fillStyle = lineColor;
  for (var s = 0; s < stars.length; s++) {
    ctx.beginPath();
    ctx.arc((stars[s][1] + 0.5) * cell, (stars[s][0] + 0.5) * cell, Math.max(1.5, cell * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }

  for (var r = 0; r < GOMOKU_SIZE; r++) {
    for (var c = 0; c < GOMOKU_SIZE; c++) {
      if (gomokuBoard[r][c] !== 0) gomokuDrawStone(r, c, gomokuBoard[r][c], cell);
    }
  }

  if (gomokuWinLine) {
    var a = gomokuWinLine[0];
    var b = gomokuWinLine[gomokuWinLine.length - 1];
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(3, cell * 0.12);
    ctx.beginPath();
    ctx.moveTo((a.c + 0.5) * cell, (a.r + 0.5) * cell);
    ctx.lineTo((b.c + 0.5) * cell, (b.r + 0.5) * cell);
    ctx.stroke();
  }
}

// gomokuDrawStone - 绘制单颗棋子（含渐变与最后一手标记）
function gomokuDrawStone(r, c, player, cell) {
  var ctx = gomokuCtx;
  var x = (c + 0.5) * cell;
  var y = (r + 0.5) * cell;
  var radius = cell * 0.42;
  var grad = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.15, x, y, radius);
  if (player === 1) {
    grad.addColorStop(0, '#5a5750');
    grad.addColorStop(1, '#1d1b18');
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#d8d4cb');
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = player === 1 ? '#000000' : '#b9b4a9';
  ctx.stroke();

  if (gomokuLast && gomokuLast.r === r && gomokuLast.c === c && !gomokuWinLine) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, radius * 0.22), 0, Math.PI * 2);
    ctx.fillStyle = '#e5533d';
    ctx.fill();
  }
}

// gomokuUpdateStatus - 刷新状态提示文字
function gomokuUpdateStatus() {
  var el = document.getElementById('gomokuStatus');
  if (!el || gomokuOver) return;
  if (gomokuMode === 'ai') {
    el.textContent = gomokuCurrent === 1 ? '轮到你落子（黑棋）' : 'AI 思考中…';
  } else {
    el.textContent = gomokuCurrent === 1 ? '黑棋回合' : '白棋回合';
  }
}

// gomokuHandleClick - 画布点击落子
function gomokuHandleClick(e) {
  if (gomokuOver) return;
  if (gomokuMode === 'ai' && gomokuCurrent !== 1) return;
  var rect = gomokuCanvas.getBoundingClientRect();
  var cell = gomokuPixel / GOMOKU_SIZE;
  var c = Math.floor((e.clientX - rect.left) / cell);
  var r = Math.floor((e.clientY - rect.top) / cell);
  if (r < 0 || r >= GOMOKU_SIZE || c < 0 || c >= GOMOKU_SIZE) return;
  if (gomokuBoard[r][c] !== 0) return;
  gomokuPlace(r, c, gomokuCurrent);
  if (!gomokuOver && gomokuMode === 'ai' && gomokuCurrent === GOMOKU_AI) setTimeout(gomokuAiTurn, 180);
}

// gomokuPlace - 在 (r,c) 落下一子并判定胜负
function gomokuPlace(r, c, player) {
  gomokuBoard[r][c] = player;
  gomokuHistory.push({ r: r, c: c, player: player });
  gomokuLast = { r: r, c: c };
  var line = gomokuFindWin(r, c, player);
  if (line) {
    gomokuWinLine = line;
    gomokuOver = true;
    gomokuRender();
    gomokuFinish(player);
    return;
  }
  if (gomokuHistory.length === GOMOKU_SIZE * GOMOKU_SIZE) {
    gomokuOver = true;
    gomokuRender();
    gomokuFinish(0);
    return;
  }
  gomokuCurrent = player === 1 ? 2 : 1;
  gomokuRender();
  gomokuUpdateStatus();
}

// gomokuFinish - 对局结束，展示结果并记录战绩
function gomokuFinish(winner) {
  var el = document.getElementById('gomokuStatus');
  if (winner === 0) {
    el.textContent = '平局！';
  } else if (gomokuMode === 'ai') {
    el.textContent = winner === 1 ? '你赢了！' : 'AI 获胜，再接再厉';
  } else {
    el.textContent = (winner === 1 ? '黑棋' : '白棋') + '获胜！';
  }
  gomokuSaveRecord(winner);
}

// gomokuFindWin - 检查落子后是否形成五连，返回连线坐标
function gomokuFindWin(r, c, player) {
  for (var d = 0; d < 4; d++) {
    var dr = GOMOKU_DIRS[d][0];
    var dc = GOMOKU_DIRS[d][1];
    var line = [{ r: r, c: c }];
    var i, nr, nc;
    for (i = 1; i < 5; i++) {
      nr = r + dr * i;
      nc = c + dc * i;
      if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE || gomokuBoard[nr][nc] !== player) break;
      line.push({ r: nr, c: nc });
    }
    for (i = 1; i < 5; i++) {
      nr = r - dr * i;
      nc = c - dc * i;
      if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE || gomokuBoard[nr][nc] !== player) break;
      line.unshift({ r: nr, c: nc });
    }
    if (line.length >= 5) return line;
  }
  return null;
}

// gomokuUndo - 悔棋（人机模式回退双方各一手）
function gomokuUndo() {
  if (gomokuHistory.length === 0) return;
  gomokuOver = false;
  gomokuWinLine = null;
  var last = gomokuHistory.pop();
  gomokuBoard[last.r][last.c] = 0;
  gomokuCurrent = last.player;
  if (gomokuMode === 'ai' && gomokuCurrent === GOMOKU_AI && gomokuHistory.length > 0) {
    last = gomokuHistory.pop();
    gomokuBoard[last.r][last.c] = 0;
    gomokuCurrent = last.player;
  }
  var tail = gomokuHistory[gomokuHistory.length - 1];
  gomokuLast = tail ? { r: tail.r, c: tail.c } : null;
  gomokuRender();
  gomokuUpdateStatus();
}

// gomokuEvalPoint - 评估在 (r,c) 落子 player 的棋型分
function gomokuEvalPoint(board, r, c, player) {
  var total = 0;
  for (var d = 0; d < 4; d++) {
    var dr = GOMOKU_DIRS[d][0];
    var dc = GOMOKU_DIRS[d][1];
    for (var start = -4; start <= 0; start++) {
      var self = 0;
      var blocked = false;
      for (var k = 0; k < 5; k++) {
        var off = start + k;
        if (off === 0) { self++; continue; }
        var nr = r + dr * off;
        var nc = c + dc * off;
        if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) { blocked = true; break; }
        var v = board[nr][nc];
        if (v === player) self++;
        else if (v !== 0) { blocked = true; break; }
      }
      if (!blocked) total += GOMOKU_SHAPE[self];
    }
  }
  return total;
}

// gomokuCandidates - 收集已有棋子附近两格内的空位
function gomokuCandidates() {
  var list = [];
  var hasStone = false;
  for (var r = 0; r < GOMOKU_SIZE; r++) {
    for (var c = 0; c < GOMOKU_SIZE; c++) {
      if (gomokuBoard[r][c] === 0) continue;
      hasStone = true;
      for (var dr = -2; dr <= 2; dr++) {
        for (var dc = -2; dc <= 2; dc++) {
          var nr = r + dr;
          var nc = c + dc;
          if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) continue;
          if (gomokuBoard[nr][nc] !== 0) continue;
          if (!gomokuCandidateHas(list, nr, nc)) list.push({ r: nr, c: nc });
        }
      }
    }
  }
  if (!hasStone) return [{ r: 7, c: 7 }];
  return list;
}

// gomokuCandidateHas - 判断候选列表中是否已包含 (r,c)
function gomokuCandidateHas(list, r, c) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].r === r && list[i].c === c) return true;
  }
  return false;
}

// gomokuImmediate - 找出 player 一步制胜的点
function gomokuImmediate(player) {
  var cand = gomokuCandidates();
  for (var i = 0; i < cand.length; i++) {
    var r = cand[i].r;
    var c = cand[i].c;
    gomokuBoard[r][c] = player;
    var win = gomokuFindWin(r, c, player);
    gomokuBoard[r][c] = 0;
    if (win) return { r: r, c: c };
  }
  return null;
}

// gomokuRandomMove - 随机选择一个候选点
function gomokuRandomMove() {
  var cand = gomokuCandidates();
  return cand[Math.floor(Math.random() * cand.length)];
}

// gomokuGreedyMove - 贪心落子：兼顾进攻与防守
function gomokuGreedyMove(player) {
  var opp = player === 1 ? 2 : 1;
  var cand = gomokuCandidates();
  var best = cand[0];
  var bestScore = -Infinity;
  for (var i = 0; i < cand.length; i++) {
    var r = cand[i].r;
    var c = cand[i].c;
    var score = gomokuEvalPoint(gomokuBoard, r, c, player) * 1.05 + gomokuEvalPoint(gomokuBoard, r, c, opp) * 0.95 + Math.random() * 2;
    if (score > bestScore) { bestScore = score; best = cand[i]; }
  }
  return best;
}

// gomokuBestReplyScore - 评估对手最佳回应的分数
function gomokuBestReplyScore(player) {
  var opp = player === 1 ? 2 : 1;
  var cand = gomokuCandidates();
  var best = 0;
  for (var i = 0; i < cand.length; i++) {
    var r = cand[i].r;
    var c = cand[i].c;
    var score = gomokuEvalPoint(gomokuBoard, r, c, player) * 1.05 + gomokuEvalPoint(gomokuBoard, r, c, opp);
    if (score > best) best = score;
  }
  return best;
}

// gomokuHardMove - 困难模式：贪心基础上做一层预判
function gomokuHardMove() {
  var cand = gomokuCandidates();
  var scored = [];
  for (var i = 0; i < cand.length; i++) {
    var r = cand[i].r;
    var c = cand[i].c;
    var score = gomokuEvalPoint(gomokuBoard, r, c, GOMOKU_AI) * 1.05 + gomokuEvalPoint(gomokuBoard, r, c, 1);
    scored.push({ r: r, c: c, score: score });
  }
  scored.sort(function (a, b) { return b.score - a.score; });
  var top = scored.slice(0, 8);
  var best = top[0];
  var bestVal = -Infinity;
  for (var t = 0; t < top.length; t++) {
    gomokuBoard[top[t].r][top[t].c] = GOMOKU_AI;
    var reply = gomokuBestReplyScore(1);
    gomokuBoard[top[t].r][top[t].c] = 0;
    var val = top[t].score - reply * 0.9;
    if (val > bestVal) { bestVal = val; best = top[t]; }
  }
  return { r: best.r, c: best.c };
}

// gomokuAiTurn - AI 行棋
function gomokuAiTurn() {
  if (gomokuOver || gomokuCurrent !== GOMOKU_AI) return;
  var move;
  var winMove = gomokuImmediate(GOMOKU_AI);
  var blockMove = gomokuImmediate(1);
  if (winMove) {
    move = winMove;
  } else if (blockMove) {
    move = blockMove;
  } else if (gomokuDifficulty === 'easy') {
    move = Math.random() < 0.45 ? gomokuRandomMove() : gomokuGreedyMove(GOMOKU_AI);
  } else if (gomokuDifficulty === 'hard') {
    move = gomokuHardMove();
  } else {
    move = gomokuGreedyMove(GOMOKU_AI);
  }
  gomokuPlace(move.r, move.c, GOMOKU_AI);
}

// gomokuLoadRecord - 读取本地战绩
function gomokuLoadRecord() {
  try {
    var raw = localStorage.getItem('toolbox_gomoku_record');
    if (raw) {
      var obj = JSON.parse(raw);
      return { win: obj.win || 0, lose: obj.lose || 0, draw: obj.draw || 0 };
    }
  } catch (e) {}
  return { win: 0, lose: 0, draw: 0 };
}

// gomokuSaveRecord - 保存战绩（仅人机模式）
function gomokuSaveRecord(winner) {
  if (gomokuMode !== 'ai') return;
  var rec = gomokuLoadRecord();
  if (winner === 1) rec.win++;
  else if (winner === GOMOKU_AI) rec.lose++;
  else rec.draw++;
  try { localStorage.setItem('toolbox_gomoku_record', JSON.stringify(rec)); } catch (e) {}
  gomokuUpdateRecord();
}

// gomokuUpdateRecord - 刷新战绩展示
function gomokuUpdateRecord() {
  var el = document.getElementById('gomokuRecord');
  if (!el) return;
  var rec = gomokuLoadRecord();
  el.textContent = '战绩  胜 ' + rec.win + ' · 负 ' + rec.lose + ' · 平 ' + rec.draw;
}

gomokuInit();

// 模式切换：双人模式下隐藏难度选择并重开
document.getElementById('gomokuMode').addEventListener('change', function () {
  gomokuMode = this.value;
  var isAi = gomokuMode === 'ai';
  document.getElementById('gomokuDiffLabel').style.display = isAi ? '' : 'none';
  document.getElementById('gomokuDifficulty').style.display = isAi ? '' : 'none';
  gomokuNewGame();
});

// 难度切换
document.getElementById('gomokuDifficulty').addEventListener('change', function () {
  gomokuDifficulty = this.value;
});

// 重新开局与悔棋
document.getElementById('gomokuNewBtn').addEventListener('click', gomokuNewGame);
document.getElementById('gomokuUndoBtn').addEventListener('click', gomokuUndo);

// 画布点击落子
gomokuCanvas.addEventListener('click', gomokuHandleClick);

// 进入工具视图时校正画布尺寸
var gomokuView = document.getElementById('tool-gomoku');
new MutationObserver(function () {
  if (gomokuView.classList.contains('active')) requestAnimationFrame(gomokuResize);
}).observe(gomokuView, { attributes: true, attributeFilter: ['class'] });

// 窗口尺寸变化时重绘
window.addEventListener('resize', function () {
  if (gomokuView.classList.contains('active')) gomokuResize();
});
