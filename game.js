const SIZE = 4;
const WIN_VALUE = 2048;
const BEST_KEY = 'best2048';

const boardEl = document.getElementById('board');
const tileLayer = document.getElementById('tileLayer');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlayEl = document.getElementById('overlay');
const winToast = document.getElementById('winToast');
const t = I18N.t;
const WIN_TOAST_MS = 2500;

// grid[r][c] 為方塊物件 { value, r, c, el, inner } 或 null
let grid, score, best, won, gameOver;
let animating = false;
let moveTimer = null;
let toastTimer = null;

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function saveBest() {
  try { localStorage.setItem(BEST_KEY, best); } catch { /* 無法存取 localStorage 時忽略 */ }
}

function buildGrid() {
  boardEl.innerHTML = '';
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    boardEl.appendChild(cell);
  }
}

function newGame() {
  stopAi();
  clearTimeout(moveTimer);
  animating = false;
  tileLayer.innerHTML = '';
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  score = 0;
  won = false;
  gameOver = false;
  overlayEl.classList.remove('show');
  hideWinToast();
  addRandomTile();
  addRandomTile();
  updateScore();
}

// ---------- 方塊 DOM ----------

function createTile(value, r, c) {
  const el = document.createElement('div');
  el.className = 'tile';
  const inner = document.createElement('div');
  el.appendChild(inner);
  const tile = { value, r, c, el, inner };
  setPosition(tile, r, c);
  setValue(tile, value);
  playAnimation(tile, 'new');
  tileLayer.appendChild(el);
  return tile;
}

function setPosition(tile, r, c) {
  tile.r = r;
  tile.c = c;
  tile.el.style.setProperty('--r', r);
  tile.el.style.setProperty('--c', c);
}

function setValue(tile, value) {
  tile.value = value;
  tile.inner.className = 'tile-inner ' + (value <= WIN_VALUE ? 't' + value : 'tsuper');
  tile.inner.textContent = value;
}

function playAnimation(tile, name) {
  tile.inner.classList.remove('new', 'merged');
  void tile.inner.offsetWidth; // 強制重排，讓動畫可重新播放
  tile.inner.classList.add(name);
}

// ---------- 遊戲邏輯 ----------

function emptyCells() {
  const list = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) list.push([r, c]);
  return list;
}

function addRandomTile() {
  const empty = emptyCells();
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = createTile(Math.random() < 0.9 ? 2 : 4, r, c);
}

// 依方向取得每一條線的座標，順序為方塊移動的方向（索引 0 為終點端）
function getLine(dir, i) {
  const idx = [...Array(SIZE).keys()];
  switch (dir) {
    case 'left':  return idx.map(j => [i, j]);
    case 'right': return idx.map(j => [i, SIZE - 1 - j]);
    case 'up':    return idx.map(j => [j, i]);
    case 'down':  return idx.map(j => [SIZE - 1 - j, i]);
  }
}

function move(dir) {
  if (animating || gameOver) return;

  let moved = false;
  const removed = [];   // 被合併掉、動畫後要移除的方塊
  const upgraded = [];  // 合併後數值加倍的方塊

  for (let i = 0; i < SIZE; i++) {
    const line = getLine(dir, i);
    const tiles = line.map(([r, c]) => grid[r][c]).filter(Boolean);
    line.forEach(([r, c]) => { grid[r][c] = null; });

    let target = 0;
    let last = null; // 上一個放置、且本回合尚未合併的方塊
    for (const tile of tiles) {
      if (last && last.value === tile.value) {
        // 與前一個方塊合併：滑到同一格，動畫結束後移除
        setPosition(tile, last.r, last.c);
        tile.el.classList.add('merged-away');
        removed.push(tile);
        upgraded.push(last);
        score += tile.value * 2;
        last = null;
        moved = true;
      } else {
        const [r, c] = line[target++];
        if (tile.r !== r || tile.c !== c) moved = true;
        setPosition(tile, r, c);
        grid[r][c] = tile;
        last = tile;
      }
    }
  }
  if (!moved) return;

  updateScore();
  const finish = () => {
    removed.forEach(t => t.el.remove());
    upgraded.forEach(t => {
      setValue(t, t.value * 2);
      playAnimation(t, 'merged');
    });
    addRandomTile();
    animating = false;
    checkState();
  };
  // 動畫時間為 0 時立即完成，不等待計時器
  if (params.anim > 0) {
    animating = true;
    moveTimer = setTimeout(finish, params.anim);
  } else {
    finish();
  }
}

// 將動畫時間套用到 CSS 變數（滑動、出現、合併動畫共用）
function applyAnimSpeed() {
  document.documentElement.style.setProperty('--anim', params.anim);
}

function canMove() {
  if (emptyCells().length) return true;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c].value;
      if (c + 1 < SIZE && grid[r][c + 1].value === v) return true;
      if (r + 1 < SIZE && grid[r + 1][c].value === v) return true;
    }
  return false;
}

function checkState() {
  // 拼出 2048 只顯示勝利提示，不中斷遊戲，可繼續玩並累計分數
  if (!won && grid.some(row => row.some(tile => tile && tile.value === WIN_VALUE))) {
    won = true;
    showWinToast();
  }
  if (!canMove()) {
    gameOver = true;
    overlayEl.classList.add('show');
  }
}

function updateScore() {
  if (score > best) {
    best = score;
    saveBest();
  }
  scoreEl.textContent = score;
  bestEl.textContent = best;
}

function showWinToast() {
  winToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideWinToast, WIN_TOAST_MS);
}

function hideWinToast() {
  clearTimeout(toastTimer);
  winToast.classList.remove('show');
}

// 鍵盤操作
const KEY_MAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down',
  A: 'left', D: 'right', W: 'up', S: 'down',
};

document.addEventListener('keydown', e => {
  const dir = KEY_MAP[e.key];
  if (!dir) return;
  e.preventDefault();
  move(dir);
});

// 觸控滑動操作
let touchStart = null;
boardEl.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

boardEl.addEventListener('touchend', e => {
  if (!touchStart) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
  else move(dy > 0 ? 'down' : 'up');
});

document.getElementById('newGame').addEventListener('click', newGame);
document.getElementById('retryBtn').addEventListener('click', newGame);

// ---------- AI ----------

const PARAMS_KEY = 'ai2048Params';
const CPU_CORES = navigator.hardwareConcurrency || 4;
// 參數名稱與說明文字由 i18n 的 param_<key> / hint_<key> 提供
const PARAM_DEFS = [
  { key: 'depth',  min: 1, max: 5,    step: 1,    def: 3 },
  { key: 'threads', min: 1, max: CPU_CORES, step: 1, def: CPU_CORES },
  { key: 'delay',  min: 0, max: 1000, step: 10,   def: 100 },
  { key: 'anim',   min: 0, max: 300,  step: 10,   def: 120 },
  { key: 'empty',  min: 0, max: 5,    step: 0.1,  def: 2.7 },
  { key: 'mono',   min: 0, max: 5,    step: 0.1,  def: 1.0 },
  { key: 'smooth', min: 0, max: 1,    step: 0.05, def: 0.1 },
  { key: 'max',    min: 0, max: 5,    step: 0.1,  def: 1.0 },
  { key: 'corner', min: 0, max: 5,    step: 0.1,  def: 1.0 },
];
const ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };

const aiToggle = document.getElementById('aiToggle');
const aiStatus = document.getElementById('aiStatus');
const paramsEl = document.getElementById('params');
const langSelect = document.getElementById('langSelect');

let params = loadParams();
let aiRunning = false;
let aiTimer = null;
let aiRunId = 0;
let aiMoves = 0;
let status = null; // { key, vars }，切換語言時重新顯示

function defaultParams() {
  return Object.fromEntries(PARAM_DEFS.map(d => [d.key, d.def]));
}

// 讀取已儲存參數，並限制在各參數的範圍內
function loadParams() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(PARAMS_KEY) || '{}'); } catch { /* 忽略 */ }
  return Object.fromEntries(PARAM_DEFS.map(d => {
    const v = Number(saved[d.key]);
    return [d.key, Number.isFinite(v) ? Math.min(d.max, Math.max(d.min, v)) : d.def];
  }));
}

function saveParams() {
  try { localStorage.setItem(PARAMS_KEY, JSON.stringify(params)); } catch { /* 忽略 */ }
}

function buildParamControls() {
  paramsEl.innerHTML = '';
  for (const d of PARAM_DEFS) {
    const row = document.createElement('label');
    row.className = 'param';
    row.innerHTML = `<span></span>
      <input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${params[d.key]}">
      <span class="val">${params[d.key]}</span>`;
    row.firstElementChild.textContent = t('param_' + d.key);
    const input = row.querySelector('input');
    const val = row.querySelector('.val');
    input.addEventListener('input', () => {
      params[d.key] = Number(input.value);
      val.textContent = input.value;
      saveParams();
      applyAnimSpeed();
    });
    const hint = document.createElement('div');
    hint.className = 'param-hint';
    hint.textContent = t('hint_' + d.key);
    paramsEl.append(row, hint);
  }
}

function setStatus(key, vars) {
  status = key ? { key, vars } : null;
  aiStatus.textContent = status ? t(key, vars) : '';
}

// 將目前盤面轉成 AI 使用的指數陣列
function logBoard() {
  return grid.flat().map(tile => (tile ? Math.log2(tile.value) : 0));
}

function updateAiToggle() {
  aiToggle.textContent = t(aiRunning ? 'aiStop' : 'aiStart');
  aiToggle.classList.toggle('running', aiRunning);
}

function startAi() {
  aiRunning = true;
  aiRunId++;
  aiMoves = 0;
  updateAiToggle();
  aiStep(aiRunId);
}

function stopAi() {
  aiRunning = false;
  aiRunId++; // 使計算中的舊回合結果失效
  clearTimeout(aiTimer);
  updateAiToggle();
}

// runId 用來辨識同一輪自動玩；停止或重新開始後，計算中的舊結果會被丟棄
async function aiStep(runId) {
  if (runId !== aiRunId) return;
  if (gameOver) {
    stopAi();
    return;
  }
  if (animating) {
    aiTimer = setTimeout(aiStep, 20, runId);
    return;
  }
  const board = logBoard();
  const dir = await AI.bestMove(board, params);
  if (runId !== aiRunId) return;
  // 計算期間盤面若被玩家手動改變，重新計算
  if (animating || logBoard().join() !== board.join()) {
    aiTimer = setTimeout(aiStep, 20, runId);
    return;
  }
  if (!dir) {
    stopAi();
    return;
  }
  move(dir);
  aiMoves++;
  setStatus('aiMoves', { n: aiMoves });
  aiTimer = setTimeout(aiStep, params.anim + params.delay, runId);
}

aiToggle.addEventListener('click', () => (aiRunning ? stopAi() : startAi()));

document.getElementById('hintBtn').addEventListener('click', async () => {
  if (gameOver) return;
  const board = logBoard();
  const dir = await AI.bestMove(board, params);
  if (logBoard().join() !== board.join()) return; // 盤面已改變，提示失效
  if (dir) setStatus('suggest', { arrow: ARROWS[dir] });
  else setStatus('noMoves');
});

document.getElementById('resetParams').addEventListener('click', () => {
  params = defaultParams();
  saveParams();
  buildParamControls();
  applyAnimSpeed();
});

// ---------- 語言 ----------

function buildLangSelect() {
  for (const [code, name] of Object.entries(I18N.NAMES)) {
    langSelect.add(new Option(name, code));
  }
  langSelect.value = I18N.getLang();
  langSelect.addEventListener('change', () => I18N.setLang(langSelect.value));
}

// 由 JS 產生的文字需在切換語言時重新產生
I18N.onChange(() => {
  buildParamControls();
  updateAiToggle();
  setStatus(status && status.key, status && status.vars);
});

best = loadBest();
I18N.apply();
buildLangSelect();
buildParamControls();
applyAnimSpeed();
updateAiToggle();
buildGrid();
newGame();
