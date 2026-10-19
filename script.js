const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
  [0, 4, 8], [2, 4, 6]               // diagonals
];

const boardEl = document.getElementById('board');
const cells = [...boardEl.querySelectorAll('.cell')];
const statusEl = document.getElementById('status');
const diffSeg = document.getElementById('diffSeg');
const modeBtns = document.querySelectorAll('[data-mode]');
const diffBtns = document.querySelectorAll('[data-diff]');
const restartBtn = document.getElementById('restartBtn');
const resetBtn = document.getElementById('resetBtn');

const scoreEls = {
  X: document.getElementById('scoreX'),
  O: document.getElementById('scoreO'),
  D: document.getElementById('scoreD')
};
const cardX = document.getElementById('cardX');
const cardO = document.getElementById('cardO');
const labelX = document.getElementById('labelX');
const labelO = document.getElementById('labelO');

// Chance that the computer plays its best move
const SMARTNESS = { easy: 0, medium: 0.6, hard: 1 };

let board = Array(9).fill(null);
let current = 'X';
let starter = 'X';
let gameOver = false;
let mode = 'cpu';          // 'pvp' or 'cpu'
let difficulty = 'hard';
let scores = { X: 0, O: 0, D: 0 };
let cpuTimer = null;

// ---------- Helpers ----------
function getWinner(b) {
  for (const line of WINS) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return { player: b[a], line };
    }
  }
  return null;
}

function humanCanMove() {
  return !gameOver && !(mode === 'cpu' && current === 'O');
}

function setStatus(text, state = '') {
  statusEl.textContent = text;
  statusEl.dataset.state = state;
  statusEl.classList.remove('pop');
  void statusEl.offsetWidth;        // restarts the animation
  statusEl.classList.add('pop');
}

function updateScores() {
  scoreEls.X.textContent = scores.X;
  scoreEls.O.textContent = scores.O;
  scoreEls.D.textContent = scores.D;
}

function updateLabels() {
  labelX.textContent = mode === 'cpu' ? 'You (X)' : 'Player X';
  labelO.textContent = mode === 'cpu' ? 'Computer (O)' : 'Player O';
}

function updateTurnUI() {
  cardX.classList.toggle('turn', !gameOver && current === 'X');
  cardO.classList.toggle('turn', !gameOver && current === 'O');
  boardEl.dataset.turn = humanCanMove() ? current : '';

  if (mode === 'cpu') {
    if (current === 'X') setStatus('Your turn', 'x');
    else setStatus('Computer is thinking…', 'thinking');
  } else {
    setStatus(`Player ${current}'s turn`, current.toLowerCase());
  }
}

// ---------- Game flow ----------
function newRound() {
  clearTimeout(cpuTimer);
  board = Array(9).fill(null);
  gameOver = false;
  current = starter;

  cells.forEach((cell, i) => {
    cell.className = 'cell';
    cell.innerHTML = '';
    cell.setAttribute('aria-label', `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, empty`);
  });
  boardEl.className = 'board';

  updateTurnUI();
  if (mode === 'cpu' && current === 'O') computerTurn();
}

function place(i) {
  board[i] = current;
  cells[i].innerHTML = `<span class="mark ${current.toLowerCase()}"></span>`;
  cells[i].setAttribute('aria-label', `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, ${current}`);

  const result = getWinner(board);
  if (result) {
    endGame(result.player, result.line);
  } else if (board.every(Boolean)) {
    endGame(null, []);
  } else {
    current = current === 'X' ? 'O' : 'X';
    updateTurnUI();
    if (mode === 'cpu' && current === 'O') computerTurn();
  }
}

function endGame(winner, line) {
  gameOver = true;
  cardX.classList.remove('turn');
  cardO.classList.remove('turn');
  boardEl.dataset.turn = '';

  if (winner) {
    scores[winner]++;
    line.forEach(i => cells[i].classList.add('win', `win-${winner.toLowerCase()}`));
    boardEl.classList.add('over');

    if (mode === 'cpu') {
      setStatus(winner === 'X' ? 'You win!' : 'Computer wins', winner.toLowerCase());
    } else {
      setStatus(`Player ${winner} wins!`, winner.toLowerCase());
    }
  } else {
    scores.D++;
    boardEl.classList.add('draw');
    setStatus("It's a draw", 'draw');
  }
  updateScores();
}

// ---------- Computer player ----------
function computerTurn() {
  boardEl.dataset.turn = '';
  cpuTimer = setTimeout(() => {
    place(chooseMove());
  }, 600);
}

function chooseMove() {
  const empty = board.map((v, i) => (v === null ? i : null)).filter(i => i !== null);

  if (Math.random() < SMARTNESS[difficulty]) {
    return bestMove(empty);
  }
  return empty[Math.floor(Math.random() * empty.length)];
}

function bestMove(empty) {
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const i of empty) {
    board[i] = 'O';
    const score = minimax(board, false, 0);
    board[i] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [i];
    } else if (score === bestScore) {
      bestMoves.push(i);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// Looks at every possible future game. O wants a high score, X wants a low one.
function minimax(b, isComputerTurn, depth) {
  const result = getWinner(b);
  if (result) return result.player === 'O' ? 10 - depth : depth - 10;
  if (b.every(Boolean)) return 0;

  let best = isComputerTurn ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (b[i] === null) {
      b[i] = isComputerTurn ? 'O' : 'X';
      const score = minimax(b, !isComputerTurn, depth + 1);
      b[i] = null;
      best = isComputerTurn ? Math.max(best, score) : Math.min(best, score);
    }
  }
  return best;
}

// ---------- Events ----------
cells.forEach((cell, i) => {
  cell.addEventListener('click', () => {
    if (!humanCanMove() || board[i]) return;
    place(i);
  });
});

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    modeBtns.forEach(b => b.classList.toggle('active', b === btn));
    diffSeg.classList.toggle('hidden', mode === 'pvp');

    scores = { X: 0, O: 0, D: 0 };
    starter = 'X';
    updateScores();
    updateLabels();
    newRound();
  });
});

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    difficulty = btn.dataset.diff;
    diffBtns.forEach(b => b.classList.toggle('active', b === btn));

    scores = { X: 0, O: 0, D: 0 };
    starter = 'X';
    updateScores();
    newRound();
  });
});

restartBtn.addEventListener('click', () => {
  if (gameOver) starter = starter === 'X' ? 'O' : 'X';   // take turns starting
  newRound();
});

resetBtn.addEventListener('click', () => {
  scores = { X: 0, O: 0, D: 0 };
  starter = 'X';
  updateScores();
  newRound();
});

// Start
updateLabels();
updateScores();
newRound();