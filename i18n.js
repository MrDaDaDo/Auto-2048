// 多語言：預設英文，依瀏覽器語言自動切換；使用者手動選擇後會記住
const I18N = (() => {
  const LANG_KEY = 'lang2048';
  const FALLBACK = 'en';

  const NAMES = {
    en: 'English',
    'zh-Hant': '繁體中文',
    'zh-Hans': '简体中文',
    ja: '日本語',
    ko: '한국어',
  };

  const DICT = {
    en: {
      score: 'Score',
      best: 'Best',
      intro: 'Join the numbers and get to the <b>2048</b> tile!',
      newGame: 'New Game',
      win: 'You win!',
      gameOver: 'Game over!',
      retry: 'Try again',
      tip: '<b>How to play:</b> Use the <b>arrow keys</b> or <b>WASD</b> to move the tiles. On mobile, swipe on the board.',
      aiStart: 'AI Autoplay',
      aiStop: 'Stop AI',
      hint: 'Hint',
      aiParams: 'AI Settings',
      reset: 'Reset to defaults',
      aiMoves: 'AI moves: {n}',
      suggest: 'Suggested: {arrow}',
      noMoves: 'No moves left',
      param_depth: 'Search depth',
      hint_depth: 'How many moves ahead to simulate. Auto searches deeper as the board gets more complex. Higher fixed values are stronger but slower.',
      param_threads: 'Threads',
      hint_threads: 'Web Workers computing in parallel (default: all CPU cores)',
      param_delay: 'Delay per move (ms)',
      hint_delay: 'Extra wait between moves during autoplay',
      param_anim: 'Animation (ms)',
      hint_anim: 'Tile slide duration; 0 = no animation (fastest)',
      param_empty: 'Empty cells weight',
      hint_empty: 'Reward for each empty cell',
      param_mono: 'Monotonicity weight',
      hint_mono: 'Penalty when rows/columns are not ordered by value',
      param_merges: 'Merges weight',
      hint_merges: 'Reward for adjacent equal tiles that can be merged',
      param_sum: 'Tile sum weight',
      hint_sum: 'Penalty for many large tiles on the board (encourages merging early)',
      auto: 'Auto',
      aboutTitle: 'About Auto-2048',
      about: 'Auto-2048 is a free, open-source 2048 game with a built-in AI solver. Press <b>AI Autoplay</b> to watch an <b>Expectimax</b> search play the game for you, or press <b>Hint</b> to see the best next move. Open <b>AI Settings</b> to tune the search depth and heuristic weights (empty cells, monotonicity, merges, tile sum) and see how they change the AI’s strategy. Source code on <a href="https://github.com/MrDaDaDo/Auto-2048">GitHub</a>.',
    },
    'zh-Hant': {
      score: '分數',
      best: '最佳',
      intro: '合併數字，拼出 <b>2048</b>！',
      newGame: '新遊戲',
      win: '你贏了！',
      gameOver: '遊戲結束',
      retry: '再玩一次',
      tip: '<b>操作方式：</b>使用 <b>方向鍵</b> 或 <b>WASD</b> 移動方塊；手機可直接滑動。',
      aiStart: 'AI 自動玩',
      aiStop: '停止 AI',
      hint: '提示',
      aiParams: 'AI 參數',
      reset: '恢復預設',
      aiMoves: 'AI 已走 {n} 步',
      suggest: '建議：{arrow}',
      noMoves: '無路可走',
      param_depth: '搜尋深度',
      hint_depth: '往後模擬幾步。「自動」會隨盤面變複雜而搜得更深；固定值越高越強但越慢。',
      param_threads: '執行緒數',
      hint_threads: '平行運算的 Web Worker 數量（預設為全部 CPU 核心）',
      param_delay: '每步間隔 (ms)',
      hint_delay: 'AI 自動玩時每步之間額外等待的時間',
      param_anim: '動畫時間 (ms)',
      hint_anim: '方塊滑動動畫的時間，0 為關閉動畫（最快）',
      param_empty: '空格權重',
      hint_empty: '每個空格的加分',
      param_mono: '單調性權重',
      hint_mono: '各列/欄沒有依大小排列時的扣分',
      param_merges: '合併權重',
      hint_merges: '相鄰且相同、可以合併的方塊加分',
      param_sum: '方塊總和權重',
      hint_sum: '盤面上大方塊越多扣分越多（鼓勵盡早合併）',
      auto: '自動',
      aboutTitle: '關於 Auto-2048',
      about: 'Auto-2048 是免費、開源的 2048 遊戲，內建 AI 解題器。按 <b>AI 自動玩</b> 就能看 <b>Expectimax</b> 搜尋演算法幫你玩，按 <b>提示</b> 則會顯示最佳的下一步。打開 <b>AI 參數</b> 可以調整搜尋深度與評分權重（空格、單調性、合併、方塊總和），觀察 AI 策略如何改變。原始碼在 <a href="https://github.com/MrDaDaDo/Auto-2048">GitHub</a>。',
    },
    'zh-Hans': {
      score: '分数',
      best: '最佳',
      intro: '合并数字，拼出 <b>2048</b>！',
      newGame: '新游戏',
      win: '你赢了！',
      gameOver: '游戏结束',
      retry: '再玩一次',
      tip: '<b>操作方式：</b>使用 <b>方向键</b> 或 <b>WASD</b> 移动方块；手机可直接滑动。',
      aiStart: 'AI 自动玩',
      aiStop: '停止 AI',
      hint: '提示',
      aiParams: 'AI 参数',
      reset: '恢复默认',
      aiMoves: 'AI 已走 {n} 步',
      suggest: '建议：{arrow}',
      noMoves: '无路可走',
      param_depth: '搜索深度',
      hint_depth: '往后模拟几步。“自动”会随盘面变复杂而搜得更深；固定值越高越强但越慢。',
      param_threads: '线程数',
      hint_threads: '并行计算的 Web Worker 数量（默认为全部 CPU 核心）',
      param_delay: '每步间隔 (ms)',
      hint_delay: 'AI 自动玩时每步之间额外等待的时间',
      param_anim: '动画时间 (ms)',
      hint_anim: '方块滑动动画的时间，0 为关闭动画（最快）',
      param_empty: '空格权重',
      hint_empty: '每个空格的加分',
      param_mono: '单调性权重',
      hint_mono: '各行/列没有按大小排列时的扣分',
      param_merges: '合并权重',
      hint_merges: '相邻且相同、可以合并的方块加分',
      param_sum: '方块总和权重',
      hint_sum: '盘面上大方块越多扣分越多（鼓励尽早合并）',
      auto: '自动',
      aboutTitle: '关于 Auto-2048',
      about: 'Auto-2048 是免费、开源的 2048 游戏，内置 AI 解题器。按 <b>AI 自动玩</b> 就能看 <b>Expectimax</b> 搜索算法帮你玩，按 <b>提示</b> 则会显示最佳的下一步。打开 <b>AI 参数</b> 可以调整搜索深度与评分权重（空格、单调性、合并、方块总和），观察 AI 策略如何变化。源代码在 <a href="https://github.com/MrDaDaDo/Auto-2048">GitHub</a>。',
    },
    ja: {
      score: 'スコア',
      best: 'ベスト',
      intro: '数字を合体させて <b>2048</b> を目指そう！',
      newGame: 'ニューゲーム',
      win: 'クリア！',
      gameOver: 'ゲームオーバー',
      retry: 'もう一度',
      tip: '<b>操作方法：</b><b>矢印キー</b>または <b>WASD</b> でタイルを動かします。スマホではボードをスワイプしてください。',
      aiStart: 'AI 自動プレイ',
      aiStop: 'AI を停止',
      hint: 'ヒント',
      aiParams: 'AI 設定',
      reset: 'デフォルトに戻す',
      aiMoves: 'AI：{n} 手',
      suggest: 'おすすめ：{arrow}',
      noMoves: '動かせる手がありません',
      param_depth: '探索の深さ',
      hint_depth: '何手先までシミュレーションするか。「自動」は盤面が複雑になるほど深く探索します。固定値は大きいほど強いが遅くなります。',
      param_threads: 'スレッド数',
      hint_threads: '並列計算に使う Web Worker の数（デフォルトは全 CPU コア）',
      param_delay: '1手ごとの間隔 (ms)',
      hint_delay: '自動プレイ時に各手の間に追加で待つ時間',
      param_anim: 'アニメーション (ms)',
      hint_anim: 'タイルのスライド時間。0 でアニメーションなし（最速）',
      param_empty: '空きマスの重み',
      hint_empty: '空きマス 1 つごとの加点',
      param_mono: '単調性の重み',
      hint_mono: '行/列が大きさ順に並んでいないときの減点',
      param_merges: '合体の重み',
      hint_merges: '隣り合う同じ数字（合体可能）への加点',
      param_sum: 'タイル合計の重み',
      hint_sum: '大きなタイルが多いほど減点（早めの合体を促す）',
      auto: '自動',
      aboutTitle: 'Auto-2048 について',
      about: 'Auto-2048 は AI ソルバーを内蔵した、無料でオープンソースの 2048 ゲームです。<b>AI 自動プレイ</b>を押すと <b>Expectimax</b> 探索が代わりにプレイし、<b>ヒント</b>を押すと最善の次の一手が表示されます。<b>AI 設定</b>で探索の深さや評価の重み（空きマス・単調性・合体・タイル合計）を調整して、AI の戦略の変化を確かめられます。ソースコードは <a href="https://github.com/MrDaDaDo/Auto-2048">GitHub</a> で公開しています。',
    },
    ko: {
      score: '점수',
      best: '최고',
      intro: '숫자를 합쳐서 <b>2048</b> 타일을 만드세요!',
      newGame: '새 게임',
      win: '승리!',
      gameOver: '게임 오버',
      retry: '다시 하기',
      tip: '<b>조작 방법:</b> <b>방향키</b> 또는 <b>WASD</b>로 타일을 움직입니다. 모바일에서는 보드를 스와이프하세요.',
      aiStart: 'AI 자동 플레이',
      aiStop: 'AI 중지',
      hint: '힌트',
      aiParams: 'AI 설정',
      reset: '기본값으로 복원',
      aiMoves: 'AI 진행: {n}수',
      suggest: '추천: {arrow}',
      noMoves: '더 이상 움직일 수 없습니다',
      param_depth: '탐색 깊이',
      hint_depth: '몇 수 앞까지 시뮬레이션할지 정합니다. 자동은 판이 복잡해질수록 더 깊이 탐색합니다. 고정값이 클수록 강하지만 느립니다.',
      param_threads: '스레드 수',
      hint_threads: '병렬 계산에 사용할 Web Worker 수(기본값: 전체 CPU 코어)',
      param_delay: '수당 간격 (ms)',
      hint_delay: '자동 플레이 시 각 수 사이의 추가 대기 시간',
      param_anim: '애니메이션 (ms)',
      hint_anim: '타일 이동 애니메이션 시간, 0이면 애니메이션 없음(가장 빠름)',
      param_empty: '빈칸 가중치',
      hint_empty: '빈칸 하나당 가산점',
      param_mono: '단조성 가중치',
      hint_mono: '행/열이 크기순으로 정렬되지 않았을 때의 감점',
      param_merges: '합치기 가중치',
      hint_merges: '인접한 같은 타일(합칠 수 있음)에 대한 가산점',
      param_sum: '타일 합계 가중치',
      hint_sum: '큰 타일이 많을수록 감점(일찍 합치도록 유도)',
      auto: '자동',
      aboutTitle: 'Auto-2048 소개',
      about: 'Auto-2048은 AI 솔버가 내장된 무료 오픈 소스 2048 게임입니다. <b>AI 자동 플레이</b>를 누르면 <b>Expectimax</b> 탐색이 대신 플레이하고, <b>힌트</b>를 누르면 최선의 다음 수를 보여 줍니다. <b>AI 설정</b>에서 탐색 깊이와 평가 가중치(빈칸, 단조성, 합치기, 타일 합계)를 조정해 AI 전략이 어떻게 바뀌는지 확인해 보세요. 소스 코드는 <a href="https://github.com/MrDaDaDo/Auto-2048">GitHub</a>에 있습니다.',
    },
  };

  // 依瀏覽器語言清單找出第一個支援的語言；都不支援則回傳英文
  function detect() {
    const list = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];
    for (const raw of list) {
      const l = (raw || '').toLowerCase();
      if (l.startsWith('zh')) return /hant|tw|hk|mo/.test(l) ? 'zh-Hant' : 'zh-Hans';
      if (l.startsWith('ja')) return 'ja';
      if (l.startsWith('ko')) return 'ko';
      if (l.startsWith('en')) return 'en';
    }
    return FALLBACK;
  }

  function loadSaved() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return DICT[saved] ? saved : null;
    } catch {
      return null;
    }
  }

  let lang = loadSaved() || detect();
  const listeners = [];

  function t(key, vars = {}) {
    const text = DICT[lang][key] ?? DICT[FALLBACK][key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  }

  // 套用到帶有 data-i18n（純文字）或 data-i18n-html（含標記）屬性的元素
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
  }

  function setLang(next) {
    if (!DICT[next]) return;
    lang = next;
    try { localStorage.setItem(LANG_KEY, next); } catch { /* 忽略 */ }
    apply();
    listeners.forEach(fn => fn());
  }

  return {
    t,
    apply,
    setLang,
    getLang: () => lang,
    onChange: fn => listeners.push(fn),
    NAMES,
  };
})();
