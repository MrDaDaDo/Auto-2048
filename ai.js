// 2048 AI：Expectimax 搜尋 + 查表式盤面評分，可用 Web Worker 平行運算
// 演算法與評分方式參考 nneonneo/2048-ai：
// 盤面壓成 64 位元（每格 4 位元存方塊指數），因 JS 位元運算只有 32 位元，拆成 hi（第 0、1 列）與 lo（第 2、3 列）
// 每列 16 位元，第 j 欄位於 (3 - j) * 4 位元；移動與評分都以「每列查表」完成

// 演算法核心：必須完全自給自足（不可引用外部變數），
// 因為 Web Worker 會用 createAICore.toString() 重建同一份程式碼
function createAICore() {
  const CPROB_MIN = 1e-4;   // 累積機率低於此值的分支直接評分，不再展開
  const CACHE_DEPTH = 15;   // 只快取此深度以內的機率節點
  const LOST_BASE = 200000; // 每列的基礎分，讓正常盤面分數為正；無路可走的盤面為 0
  const MONO_POWER = 4;
  const SUM_POWER = 3.5;

  // ---------- 每列查表 ----------
  const ROW_LEFT = new Uint16Array(65536);
  const ROW_RIGHT = new Uint16Array(65536);
  const T_HI = new Uint32Array(65536); // 轉置用：第 0 列的 4 格分別放到新第 0～3 列的第 0 欄
  const T_LO = new Uint32Array(65536);
  const EMPTY = new Uint8Array(65536);
  const HEUR = new Float64Array(65536);
  let heurKey = '';

  function reverseRow(r) {
    return ((r & 0xf) << 12) | ((r & 0xf0) << 4) | ((r >> 4) & 0xf0) | (r >> 12);
  }

  for (let r = 0; r < 65536; r++) {
    const line = [(r >> 12) & 15, (r >> 8) & 15, (r >> 4) & 15, r & 15];
    // 向左滑動並合併（32768 + 32768 受 4 位元限制，視為不可合併）
    const vals = line.filter(v => v);
    const out = [];
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] === vals[i + 1] && vals[i] < 15) { out.push(vals[i] + 1); i++; }
      else out.push(vals[i]);
    }
    while (out.length < 4) out.push(0);
    const left = (out[0] << 12) | (out[1] << 8) | (out[2] << 4) | out[3];
    ROW_LEFT[r] = left;
    ROW_RIGHT[reverseRow(r)] = reverseRow(left);
    T_HI[r] = ((line[0] << 28) | (line[1] << 12)) >>> 0;
    T_LO[r] = ((line[2] << 28) | (line[3] << 12)) >>> 0;
    EMPTY[r] = 4 - vals.length;
  }

  // 每列評分：空格、可合併數、單調性、方塊大小總和（大方塊越少越好，迫使 AI 盡早合併）
  function buildHeur(w) {
    const key = [w.empty, w.mono, w.merges, w.sum].join();
    if (key === heurKey) return;
    heurKey = key;
    for (let r = 0; r < 65536; r++) {
      const line = [(r >> 12) & 15, (r >> 8) & 15, (r >> 4) & 15, r & 15];
      let sum = 0, empty = 0, merges = 0, prev = 0, counter = 0;
      for (const rank of line) {
        sum += Math.pow(rank, SUM_POWER);
        if (!rank) { empty++; continue; }
        if (prev === rank) counter++;
        else if (counter > 0) { merges += 1 + counter; counter = 0; }
        prev = rank;
      }
      if (counter > 0) merges += 1 + counter;
      let monoLeft = 0, monoRight = 0;
      for (let i = 1; i < 4; i++) {
        const a = Math.pow(line[i - 1], MONO_POWER), b = Math.pow(line[i], MONO_POWER);
        if (line[i - 1] > line[i]) monoLeft += a - b; else monoRight += b - a;
      }
      HEUR[r] = LOST_BASE + w.empty * empty + w.merges * merges
        - w.mono * Math.min(monoLeft, monoRight) - w.sum * sum;
    }
  }

  // ---------- 盤面操作（結果寫入共用變數，避免配置物件） ----------
  let tH = 0, tL = 0; // transpose 結果
  let mH = 0, mL = 0; // moveBoard 結果

  function transpose(hi, lo) {
    const r0 = hi >>> 16, r1 = hi & 0xffff, r2 = lo >>> 16, r3 = lo & 0xffff;
    tH = (T_HI[r0] | (T_HI[r1] >>> 4) | (T_HI[r2] >>> 8) | (T_HI[r3] >>> 12)) >>> 0;
    tL = (T_LO[r0] | (T_LO[r1] >>> 4) | (T_LO[r2] >>> 8) | (T_LO[r3] >>> 12)) >>> 0;
  }

  function applyRows(table, hi, lo) {
    mH = ((table[hi >>> 16] << 16) | table[hi & 0xffff]) >>> 0;
    mL = ((table[lo >>> 16] << 16) | table[lo & 0xffff]) >>> 0;
  }

  // dir：0 上、1 下、2 左、3 右
  function moveBoard(hi, lo, dir) {
    if (dir === 2) return applyRows(ROW_LEFT, hi, lo);
    if (dir === 3) return applyRows(ROW_RIGHT, hi, lo);
    transpose(hi, lo);
    applyRows(dir === 0 ? ROW_LEFT : ROW_RIGHT, tH, tL);
    transpose(mH, mL);
    mH = tH; mL = tL;
  }

  function rowsHeur(hi, lo) {
    return HEUR[hi >>> 16] + HEUR[hi & 0xffff] + HEUR[lo >>> 16] + HEUR[lo & 0xffff];
  }

  function heur(hi, lo) {
    transpose(hi, lo);
    return rowsHeur(hi, lo) + rowsHeur(tH, tL);
  }

  function countEmpty(hi, lo) {
    return EMPTY[hi >>> 16] + EMPTY[hi & 0xffff] + EMPTY[lo >>> 16] + EMPTY[lo & 0xffff];
  }

  function countDistinct(hi, lo) {
    let bits = 0;
    for (let s = 0; s < 32; s += 4) bits |= (1 << ((hi >>> s) & 15)) | (1 << ((lo >>> s) & 15));
    bits >>= 1; // 不計空格
    let n = 0;
    while (bits) { bits &= bits - 1; n++; }
    return n;
  }

  // ---------- 轉置表（開放定址雜湊，每次計算以 gen 區分新舊資料） ----------
  const TT_BITS = 20, TT_SIZE = 1 << TT_BITS, TT_PROBE = 8;
  const ttHi = new Int32Array(TT_SIZE), ttLo = new Int32Array(TT_SIZE), ttGen = new Int32Array(TT_SIZE);
  const ttDepth = new Uint8Array(TT_SIZE), ttVal = new Float64Array(TT_SIZE);
  let gen = 0;

  function ttSlot(hi, lo) {
    return (Math.imul(hi ^ Math.imul(lo, 0x9e3779b1), 0x85ebca6b) ^ lo) >>> (32 - TT_BITS);
  }

  // ---------- Expectimax ----------
  let depthLimit = 3, curDepth = 0;

  // 玩家節點：選擇期望值最高的方向；無路可走時為 0（遠低於任何正常盤面）
  function moveNode(hi, lo, cprob) {
    let best = 0;
    curDepth++;
    for (let dir = 0; dir < 4; dir++) {
      moveBoard(hi, lo, dir);
      const nh = mH, nl = mL;
      if (nh !== hi || nl !== lo) {
        const s = chanceNode(nh, nl, cprob);
        if (s > best) best = s;
      }
    }
    curDepth--;
    return best;
  }

  // 機率節點：每個空格以 90% / 10% 放入 2 或 4，取期望值
  function chanceNode(hi, lo, cprob) {
    if (cprob < CPROB_MIN || curDepth >= depthLimit) return heur(hi, lo);

    let slot = -1;
    if (curDepth < CACHE_DEPTH) {
      slot = ttSlot(hi, lo);
      for (let i = 0; i < TT_PROBE; i++) {
        const j = (slot + i) & (TT_SIZE - 1);
        if (ttGen[j] !== gen) break;
        if (ttHi[j] === (hi | 0) && ttLo[j] === (lo | 0)) {
          if (ttDepth[j] <= curDepth) return ttVal[j]; // 快取值的剩餘搜尋深度不少於目前所需
          break;
        }
      }
    }

    const open = countEmpty(hi, lo);
    cprob /= open;
    let res = 0;
    for (let s = 0; s < 32; s += 4) {
      if (!((hi >>> s) & 15)) {
        res += 0.9 * moveNode((hi | (1 << s)) >>> 0, lo, cprob * 0.9);
        res += 0.1 * moveNode((hi | (2 << s)) >>> 0, lo, cprob * 0.1);
      }
      if (!((lo >>> s) & 15)) {
        res += 0.9 * moveNode(hi, (lo | (1 << s)) >>> 0, cprob * 0.9);
        res += 0.1 * moveNode(hi, (lo | (2 << s)) >>> 0, cprob * 0.1);
      }
    }
    res /= open;

    if (slot >= 0) {
      // 找空位或同一盤面；都沒有就覆蓋最後一個探測位置
      let j = slot;
      for (let i = 0; i < TT_PROBE; i++) {
        j = (slot + i) & (TT_SIZE - 1);
        if (ttGen[j] !== gen || (ttHi[j] === (hi | 0) && ttLo[j] === (lo | 0))) break;
      }
      ttGen[j] = gen; ttHi[j] = hi | 0; ttLo[j] = lo | 0; ttDepth[j] = curDepth; ttVal[j] = res;
    }
    return res;
  }

  // ---------- 對外介面 ----------
  const DIRS = ['up', 'down', 'left', 'right'];

  // 指數陣列（長度 16）→ [hi, lo]
  function encode(board) {
    let hi = 0, lo = 0;
    for (let k = 0; k < 16; k++) {
      const v = Math.min(board[k], 15);
      if (k < 8) hi |= v << (28 - 4 * k);
      else lo |= v << (28 - 4 * (k - 8));
    }
    return [hi >>> 0, lo >>> 0];
  }

  // 自動深度（params.depth 為 0）：盤面上不同的方塊越多，局面越複雜，搜得越深
  function searchDepth(hi, lo, params) {
    return params.depth > 0 ? params.depth : Math.max(3, countDistinct(hi, lo) - 2);
  }

  // 將根節點展開：每個合法方向的第一層機率節點拆成獨立工作，供平行計算
  // 回傳 { dirs: [{ dir, score }], tasks: [{ d, hi, lo, weight }], depth }
  function rootTasks(board, params) {
    const [hi, lo] = encode(board);
    const depth = searchDepth(hi, lo, params);
    const dirs = [];
    const tasks = [];
    for (let dir = 0; dir < 4; dir++) {
      moveBoard(hi, lo, dir);
      const nh = mH, nl = mL;
      if (nh === hi && nl === lo) continue;
      const d = dirs.length;
      dirs.push({ dir: DIRS[dir], score: 1e-6 });
      const open = countEmpty(nh, nl);
      for (let s = 0; s < 32; s += 4) {
        for (const [v, p] of [[1, 0.9], [2, 0.1]]) {
          if (!((nh >>> s) & 15)) tasks.push({ d, hi: (nh | (v << s)) >>> 0, lo: nl, weight: p / open });
          if (!((nl >>> s) & 15)) tasks.push({ d, hi: nh, lo: (nl | (v << s)) >>> 0, weight: p / open });
        }
      }
    }
    return { dirs, tasks, depth };
  }

  // 計算一批工作的值。searchId 相同的多批工作屬於同一次搜尋，共用轉置表；
  // 不同搜尋的盤面深度基準不同，必須清空（以 gen 標記）
  let lastSearch = null;
  function solveTasks(tasks, params, depth, searchId) {
    buildHeur(params);
    if (searchId === undefined || searchId !== lastSearch) {
      gen++;
      lastSearch = searchId;
    }
    depthLimit = depth;
    curDepth = 0;
    return tasks.map(t => moveNode(t.hi, t.lo, t.weight));
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
onmessage = e => postMessage({ id: e.data.id, values: core.solveTasks(e.data.tasks, e.data.params, e.data.depth, e.data.searchId) });`;

  let workers = [];
  let workersBroken = false;
  let nextId = 0;
  let nextSearch = 0;
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

  function runOnWorker(worker, tasks, params, depth, searchId) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, tasks, params, depth, searchId });
    });
  }

  // 動態分配：工作依預估成本由大到小排序（新方塊為 2 的分支機率高、剪枝少，最花時間），
  // 每個 Worker 做完一小批就領下一批，避免某個 Worker 拖住全部
  async function solveParallel(tasks, params, depth, n) {
    const searchId = nextSearch++;
    const order = tasks.map((t, i) => i).sort((a, b) => tasks[b].weight - tasks[a].weight);
    const batch = Math.max(1, Math.floor(order.length / (n * 4)));
    const values = new Array(tasks.length);
    let next = 0;
    async function drain(worker) {
      while (next < order.length) {
        const idx = order.slice(next, next += batch);
        const vals = await runOnWorker(worker, idx.map(i => tasks[i]), params, depth, searchId);
        idx.forEach((i, j) => { values[i] = vals[j]; });
      }
    }
    await Promise.all(workers.slice(0, n).map(drain));
    return values;
  }

  async function bestMove(board, params) {
    const { dirs, tasks, depth } = core.rootTasks(board, params);
    if (!dirs.length) return null;

    // 淺層搜尋每步只需幾毫秒，Worker 的訊息往返反而更慢，只在深層時平行
    let values;
    const n = Math.min(params.threads || 1, tasks.length);
    if (depth >= PARALLEL_MIN_DEPTH && n > 1 && ensureWorkers(params.threads)) {
      try {
        values = await solveParallel(tasks, params, depth, n);
      } catch {
        values = core.solveTasks(tasks, params, depth);
      }
    } else {
      values = core.solveTasks(tasks, params, depth);
    }
    return core.pickBest(dirs, tasks, values);
  }

  return { bestMove };
})();
