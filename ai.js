// 2048 AI：Expectimax 搜尋 + 可調權重的盤面評分，可用 Web Worker 平行運算
// 盤面以長度 16 的陣列表示，值為方塊的指數（2 → 1、4 → 2、2048 → 11，空格為 0）

// 演算法核心：必須完全自給自足（不可引用外部變數），
// 因為 Web Worker 會用 createAICore.toString() 重建同一份程式碼
function createAICore() {
  const N = 4;
  const DIRS = ['up', 'down', 'left', 'right'];
  const CORNERS = [0, N - 1, N * (N - 1), N * N - 1];
  const TILES = [[1, 0.9], [2, 0.1]]; // 新方塊：2（90%）、4（10%）
  const MIN_PROB = 1e-4;  // 累積機率低於此值的分支直接評分，不再展開
  const LOSE = -1e6;      // 無路可走的盤面分數

  // 每個方向的 4 條線（盤面索引），索引 0 為方塊移動的終點端
  const LINES = {};
  for (const dir of DIRS) {
    LINES[dir] = [];
    for (let i = 0; i < N; i++) {
      const line = [];
      for (let j = 0; j < N; j++) {
        if (dir === 'left') line.push(i * N + j);
        else if (dir === 'right') line.push(i * N + (N - 1 - j));
        else if (dir === 'up') line.push(j * N + i);
        else line.push((N - 1 - j) * N + i);
      }
      LINES[dir].push(line);
    }
  }

  // 回傳移動後的新盤面；若盤面沒有變化則回傳 null
  function move(b, dir) {
    const out = b.slice();
    let moved = false;
    for (const line of LINES[dir]) {
      const vals = [];
      for (const k of line) if (b[k]) vals.push(b[k]);
      const merged = [];
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] === vals[i + 1]) {
          merged.push(vals[i] + 1);
          i++;
        } else {
          merged.push(vals[i]);
        }
      }
      for (let j = 0; j < N; j++) {
        const v = merged[j] || 0;
        if (out[line[j]] !== v) moved = true;
        out[line[j]] = v;
      }
    }
    return moved ? out : null;
  }

  // 盤面評分：空格、單調性、平滑度、最大方塊、最大方塊是否在角落
  function evaluate(b, w) {
    let empty = 0, max = 0, maxIdx = 0, smooth = 0;
    for (let k = 0; k < N * N; k++) {
      const v = b[k];
      if (!v) { empty++; continue; }
      if (v > max) { max = v; maxIdx = k; }
      const c = k % N;
      if (c + 1 < N && b[k + 1]) smooth -= Math.abs(v - b[k + 1]);
      if (k + N < N * N && b[k + N]) smooth -= Math.abs(v - b[k + N]);
    }

    // 單調性：分別累計整體「遞增」與「遞減」的違反量，取較小的懲罰（列、欄各算一次）
    let rowInc = 0, rowDec = 0, colInc = 0, colDec = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j + 1 < N; j++) {
        const a = b[i * N + j], n = b[i * N + j + 1];
        if (a > n) rowInc += n - a; else rowDec += a - n;
        const p = b[j * N + i], q = b[(j + 1) * N + i];
        if (p > q) colInc += q - p; else colDec += p - q;
      }
    }
    const mono = Math.max(rowInc, rowDec) + Math.max(colInc, colDec);
    const corner = CORNERS.includes(maxIdx) ? max : 0;

    return w.empty * Math.log(empty + 1)
      + w.mono * mono
      + w.smooth * smooth
      + w.max * max
      + w.corner * corner;
  }

  function emptyCells(b) {
    const list = [];
    for (let k = 0; k < N * N; k++) if (!b[k]) list.push(k);
    return list;
  }

  // 玩家節點：選擇期望值最高的方向
  function maxNode(b, depth, prob, ctx) {
    let best = LOSE;
    for (const dir of DIRS) {
      const nb = move(b, dir);
      if (nb) best = Math.max(best, chanceNode(nb, depth, prob, ctx));
    }
    return best;
  }

  // 機率節點：在每個空格分別放入 2 或 4，取期望值
  function chanceNode(b, depth, prob, ctx) {
    if (depth <= 1 || prob < MIN_PROB) return evaluate(b, ctx.w);

    const key = String.fromCharCode.apply(null, b) + depth;
    const cached = ctx.cache.get(key);
    if (cached !== undefined) return cached;

    const empties = emptyCells(b);
    if (!empties.length) return evaluate(b, ctx.w);

    let sum = 0;
    for (const k of empties) {
      for (const [v, p] of TILES) {
        b[k] = v;
        sum += p * maxNode(b, depth - 1, prob * p / empties.length, ctx);
      }
      b[k] = 0;
    }
    const value = sum / empties.length;
    ctx.cache.set(key, value);
    return value;
  }

  // 將根節點展開：每個合法方向的第一層機率節點拆成獨立工作，供平行計算
  // 回傳 { dirs: [{ dir, score }], tasks: [{ d, board, weight }] }
  // 深度為 1 時不需展開，直接以評分作為 score
  function rootTasks(board, params) {
    const dirs = [];
    const tasks = [];
    for (const dir of DIRS) {
      const nb = move(board, dir);
      if (!nb) continue;
      const d = dirs.length;
      const empties = emptyCells(nb);
      if (params.depth <= 1 || !empties.length) {
        dirs.push({ dir, score: evaluate(nb, params) });
        continue;
      }
      dirs.push({ dir, score: 0 });
      for (const k of empties) {
        for (const [v, p] of TILES) {
          const child = nb.slice();
          child[k] = v;
          tasks.push({ d, board: child, weight: p / empties.length });
        }
      }
    }
    return { dirs, tasks };
  }

  // 計算一批工作的值（同一批共用轉置表快取）
  function solveTasks(tasks, params) {
    const ctx = { w: params, cache: new Map() };
    return tasks.map(t => maxNode(t.board, params.depth - 1, t.weight, ctx));
  }

  // 依工作結果加總各方向的期望值，回傳最佳方向
  function pickBest(dirs, tasks, values) {
    tasks.forEach((t, i) => { dirs[t.d].score += t.weight * values[i]; });
    let best = null;
    for (const d of dirs) if (!best || d.score > best.score) best = d;
    return best ? best.dir : null;
  }

  return { rootTasks, solveTasks, pickBest };
}

// 對外介面：AI.bestMove(board, params) 回傳 Promise<方向 | null>
// params.threads > 1 時使用 Web Worker 平行運算，失敗時自動退回單執行緒
const AI = (() => {
  const core = createAICore();
  const PARALLEL_MIN_DEPTH = 4;
  const workerSrc = `const core = (${createAICore.toString()})();
onmessage = e => postMessage({ id: e.data.id, values: core.solveTasks(e.data.tasks, e.data.params) });`;

  let workers = [];
  let workersBroken = false;
  let nextId = 0;
  const pending = new Map(); // id → { resolve, reject }

  function createWorker() {
    const url = URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' }));
    const w = new Worker(url);
    URL.revokeObjectURL(url);
    w.onmessage = e => {
      const job = pending.get(e.data.id);
      pending.delete(e.data.id);
      if (job) job.resolve(e.data.values);
    };
    w.onerror = e => {
      e.preventDefault();
      workersBroken = true;
      pending.forEach(job => job.reject(new Error('worker error')));
      pending.clear();
    };
    return w;
  }

  // 確保 Worker 數量等於 n；無法建立時回傳 false
  function ensureWorkers(n) {
    if (workersBroken || typeof Worker === 'undefined') return false;
    try {
      while (workers.length < n) workers.push(createWorker());
      while (workers.length > n) workers.pop().terminate();
      return true;
    } catch {
      workersBroken = true;
      workers.forEach(w => w.terminate());
      workers = [];
      return false;
    }
  }

  function runOnWorker(worker, tasks, params) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, tasks, params });
    });
  }

  // 連續分塊：相鄰工作（同方向、相近空格）的子盤面重複度高，
  // 放在同一個 Worker 才能共用該 Worker 的快取。實測比交錯分配或更細的動態分塊都快。
  async function solveParallel(tasks, params, n) {
    const size = Math.ceil(tasks.length / n);
    const chunks = [];
    for (let i = 0; i < tasks.length; i += size) chunks.push(tasks.slice(i, i + size));
    const results = await Promise.all(chunks.map((c, j) => runOnWorker(workers[j], c, params)));
    return results.flat();
  }

  async function bestMove(board, params) {
    const { dirs, tasks } = core.rootTasks(board, params);
    if (!dirs.length) return null;

    // 淺層搜尋每步只需幾毫秒，Worker 的訊息往返反而更慢（實測深度 3 慢約 6 倍），只在深層時平行
    let values;
    const n = Math.min(params.threads || 1, tasks.length);
    if (params.depth >= PARALLEL_MIN_DEPTH && n > 1 && ensureWorkers(params.threads)) {
      try {
        values = await solveParallel(tasks, params, n);
      } catch {
        values = core.solveTasks(tasks, params);
      }
    } else {
      values = core.solveTasks(tasks, params);
    }
    return core.pickBest(dirs, tasks, values);
  }

  return { bestMove };
})();
