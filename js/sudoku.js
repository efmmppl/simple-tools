var sudokuSolution = [];
var sudokuPuzzle = [];
var sudokuUser = [];
var sudokuDifficulty = 'medium';
var sudokuSelected = { r: -1, c: -1 };

function sudokuShuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
}

function sudokuIsValid(board, r, c, num) {
  for (var i = 0; i < 9; i++) {
    if (board[r][i] === num || board[i][c] === num) return false;
  }
  var br = Math.floor(r / 3) * 3;
  var bc = Math.floor(c / 3) * 3;
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      if (board[br + i][bc + j] === num) return false;
    }
  }
  return true;
}

function sudokuSolve(board, random) {
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      var nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      if (random) sudokuShuffle(nums);
      for (var i = 0; i < 9; i++) {
        if (!sudokuIsValid(board, r, c, nums[i])) continue;
        board[r][c] = nums[i];
        if (sudokuSolve(board, random)) return true;
        board[r][c] = 0;
      }
      return false;
    }
  }
  return true;
}

function sudokuGenerate(diff) {
  var board = [];
  for (var r = 0; r < 9; r++) {
    board[r] = [];
    for (var c = 0; c < 9; c++) board[r][c] = 0;
  }
  sudokuSolve(board, true);
  var solution = board.map(function (row) { return row.slice(); });
  var puzzle = solution.map(function (row) { return row.slice(); });
  var cells = [];
  for (var i = 0; i < 81; i++) cells.push(i);
  sudokuShuffle(cells);
  var remove = diff === 'easy' ? 35 : diff === 'hard' ? 54 : 45;
  for (var i = 0; i < remove; i++) {
    puzzle[Math.floor(cells[i] / 9)][cells[i] % 9] = 0;
  }
  return { puzzle: puzzle, solution: solution };
}

function sudokuNewGame(diff) {
  sudokuDifficulty = diff || 'medium';
  var result = sudokuGenerate(sudokuDifficulty);
  sudokuSolution = result.solution;
  sudokuPuzzle = result.puzzle;
  sudokuUser = sudokuPuzzle.map(function (row) { return row.slice(); });
  sudokuSelected = { r: -1, c: -1 };
  sudokuRender();
  document.getElementById('sudokuStatus').textContent = '';
}

function sudokuRender() {
  var grid = document.getElementById('sudokuGrid');
  grid.innerHTML = '';
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var cell = document.createElement('div');
      cell.className = 'sudoku-cell';
      if (r === 2 || r === 5) cell.classList.add('sudoku-border-bottom');
      if (c === 2 || c === 5) cell.classList.add('sudoku-border-right');
      if (sudokuSelected.r === r && sudokuSelected.c === c) cell.classList.add('sudoku-selected');
      var val = sudokuUser[r][c];
      if (val !== 0) {
        cell.textContent = val;
        cell.classList.add(sudokuPuzzle[r][c] !== 0 ? 'sudoku-fixed' : 'sudoku-user');
      }
      cell.addEventListener('click', (function (rr, cc) {
        return function () { sudokuSelectCell(rr, cc); };
      })(r, c));
      grid.appendChild(cell);
    }
  }
}

function sudokuSelectCell(r, c) {
  if (sudokuPuzzle[r][c] !== 0) return;
  sudokuSelected = { r: r, c: c };
  sudokuRender();
  document.getElementById('sudokuNumberInput').focus();
}

function sudokuInputNumber(num) {
  if (sudokuSelected.r < 0 || sudokuSelected.c < 0) return;
  if (sudokuPuzzle[sudokuSelected.r][sudokuSelected.c] !== 0) return;
  sudokuUser[sudokuSelected.r][sudokuSelected.c] = num;
  sudokuRender();
  sudokuCheckComplete();
}

function sudokuClearCell() {
  if (sudokuSelected.r < 0 || sudokuSelected.c < 0) return;
  if (sudokuPuzzle[sudokuSelected.r][sudokuSelected.c] !== 0) return;
  sudokuUser[sudokuSelected.r][sudokuSelected.c] = 0;
  sudokuRender();
}

function sudokuCheckComplete() {
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (sudokuUser[r][c] !== sudokuSolution[r][c]) return;
    }
  }
  document.getElementById('sudokuStatus').textContent = '恭喜！数独完成！';
}

function sudokuHint() {
  if (sudokuSelected.r < 0 || sudokuSelected.c < 0) return;
  if (sudokuPuzzle[sudokuSelected.r][sudokuSelected.c] !== 0) return;
  sudokuUser[sudokuSelected.r][sudokuSelected.c] = sudokuSolution[sudokuSelected.r][sudokuSelected.c];
  sudokuRender();
  sudokuCheckComplete();
}

function sudokuShowAnswer() {
  sudokuUser = sudokuSolution.map(function (row) { return row.slice(); });
  sudokuRender();
  document.getElementById('sudokuStatus').textContent = '已显示答案';
}

sudokuNewGame('medium');

document.getElementById('sudokuNewBtn').addEventListener('click', function () {
  sudokuNewGame(document.getElementById('sudokuDifficulty').value);
});

document.getElementById('sudokuDifficulty').addEventListener('change', function () {
  sudokuNewGame(this.value);
});

var sudokuNumBtns = document.querySelectorAll('.sudoku-num-btn');
for (var i = 0; i < sudokuNumBtns.length; i++) {
  sudokuNumBtns[i].addEventListener('click', function () {
    var num = parseInt(this.getAttribute('data-num'), 10);
    if (isNaN(num)) sudokuClearCell();
    else sudokuInputNumber(num);
  });
}

document.getElementById('sudokuHintBtn').addEventListener('click', sudokuHint);
document.getElementById('sudokuAnswerBtn').addEventListener('click', sudokuShowAnswer);

document.getElementById('sudokuNumberInput').addEventListener('input', function () {
  var val = this.value.replace(/[^1-9]/g, '').slice(0, 1);
  this.value = val;
  if (val) {
    sudokuInputNumber(parseInt(val, 10));
    this.value = '';
  }
});

document.getElementById('sudokuNumberInput').addEventListener('keydown', function (e) {
  if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault();
    sudokuClearCell();
  }
});
