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
      hint_depth: 'How many moves ahead to simulate. Deeper is stronger but slower (5 may lag).',
      param_threads: 'Threads',
      hint_threads: 'Web Workers computing in parallel (default: all CPU cores)',
      param_delay: 'Delay per move (ms)',
      hint_delay: 'Extra wait between moves during autoplay',
      param_anim: 'Animation (ms)',
      hint_anim: 'Tile slide duration; 0 = no animation (fastest)',
      param_empty: 'Empty cells weight',
      hint_empty: 'Prefer keeping more empty cells',
      param_mono: 'Monotonicity weight',
      hint_mono: 'Prefer rows/columns ordered by value',
      param_smooth: 'Smoothness weight',
      hint_smooth: 'Prefer neighboring tiles with similar values (easier merges)',
      param_max: 'Max tile weight',
      hint_max: 'Prefer building larger tiles',
      param_corner: 'Corner weight',
      hint_corner: 'Prefer keeping the largest tile in a corner',
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
      hint_depth: '往後模擬幾步，越深越強但越慢（5 可能卡頓）',
      param_threads: '執行緒數',
      hint_threads: '平行運算的 Web Worker 數量（預設為全部 CPU 核心）',
      param_delay: '每步間隔 (ms)',
      hint_delay: 'AI 自動玩時每步之間額外等待的時間',
      param_anim: '動畫時間 (ms)',
      hint_anim: '方塊滑動動畫的時間，0 為關閉動畫（最快）',
      param_empty: '空格權重',
      hint_empty: '偏好保留更多空格',
      param_mono: '單調性權重',
      hint_mono: '偏好每行／每列依大小排列',
      param_smooth: '平滑度權重',
      hint_smooth: '偏好相鄰方塊數值接近（容易合併）',
      param_max: '最大方塊權重',
      hint_max: '偏好做出更大的方塊',
      param_corner: '角落權重',
      hint_corner: '偏好把最大方塊放在角落',
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
      hint_depth: '往后模拟几步，越深越强但越慢（5 可能卡顿）',
      param_threads: '线程数',
      hint_threads: '并行计算的 Web Worker 数量（默认为全部 CPU 核心）',
      param_delay: '每步间隔 (ms)',
      hint_delay: 'AI 自动玩时每步之间额外等待的时间',
      param_anim: '动画时间 (ms)',
      hint_anim: '方块滑动动画的时间，0 为关闭动画（最快）',
      param_empty: '空格权重',
      hint_empty: '偏好保留更多空格',
      param_mono: '单调性权重',
      hint_mono: '偏好每行／每列按大小排列',
      param_smooth: '平滑度权重',
      hint_smooth: '偏好相邻方块数值接近（容易合并）',
      param_max: '最大方块权重',
      hint_max: '偏好做出更大的方块',
      param_corner: '角落权重',
      hint_corner: '偏好把最大方块放在角落',
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
      hint_depth: '何手先まで読むか。深いほど強いが遅くなります（5 は重くなる場合あり）',
      param_threads: 'スレッド数',
      hint_threads: '並列計算に使う Web Worker の数（デフォルトは全 CPU コア）',
      param_delay: '1手ごとの間隔 (ms)',
      hint_delay: '自動プレイ時に各手の間に追加で待つ時間',
      param_anim: 'アニメーション (ms)',
      hint_anim: 'タイルのスライド時間。0 でアニメーションなし（最速）',
      param_empty: '空きマスの重み',
      hint_empty: '空きマスを多く残すことを優先',
      param_mono: '単調性の重み',
      hint_mono: '各行・各列を大きさ順に並べることを優先',
      param_smooth: '滑らかさの重み',
      hint_smooth: '隣り合うタイルの値が近い配置を優先（合体しやすい）',
      param_max: '最大タイルの重み',
      hint_max: 'より大きなタイルを作ることを優先',
      param_corner: '角の重み',
      hint_corner: '最大タイルを角に置くことを優先',
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
      hint_depth: '몇 수 앞까지 시뮬레이션할지 정합니다. 깊을수록 강하지만 느립니다(5는 끊길 수 있음)',
      param_threads: '스레드 수',
      hint_threads: '병렬 계산에 사용할 Web Worker 수(기본값: 전체 CPU 코어)',
      param_delay: '수당 간격 (ms)',
      hint_delay: '자동 플레이 시 각 수 사이의 추가 대기 시간',
      param_anim: '애니메이션 (ms)',
      hint_anim: '타일 이동 애니메이션 시간, 0이면 애니메이션 없음(가장 빠름)',
      param_empty: '빈칸 가중치',
      hint_empty: '빈칸을 더 많이 남기는 것을 선호',
      param_mono: '단조성 가중치',
      hint_mono: '각 행/열이 크기순으로 정렬되는 것을 선호',
      param_smooth: '평탄도 가중치',
      hint_smooth: '인접 타일의 값이 비슷한 배치를 선호(합치기 쉬움)',
      param_max: '최대 타일 가중치',
      hint_max: '더 큰 타일을 만드는 것을 선호',
      param_corner: '모서리 가중치',
      hint_corner: '가장 큰 타일을 모서리에 두는 것을 선호',
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
