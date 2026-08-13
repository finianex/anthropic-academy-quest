/*
 * content/route.js
 * 課綱衍生的中繼資料：島嶼分組、建議路線、先修關係、成就徽章。
 *
 * 這個檔案是「內容」不是「邏輯」——它描述課程之間的關係，不做任何運算。
 * 評估邏輯在 app/gamify.js。
 *
 * 資料來源標記：
 *   src:'official'  = 官方課程頁 prereq 欄位明文寫的（見 content/official.js）
 *   src:'authored'  = 本站依官方 audience / outcomes 文案判斷後自行編寫的
 * 保留這個標記是為了讓「哪些先修關係是官方說的、哪些是我們推的」永遠可稽核。
 */

/* ── 五座島 ─────────────────────────────────────────────────────────
   island.key 對應 index.html 的 ?island= 參數。
   category 對應 content/courses.js 的 course.category，是唯一的歸屬依據。 */
window.ACADEMY_ISLANDS = [
  {
    key: 'start', category: 'Claude 入門', tint: 'green',
    zh: '啟程島', en: 'Getting Started',
    blurb: '從第一次對話，到把 Claude 接進每天的工作。'
  },
  {
    key: 'fluency', category: 'AI 素養', tint: 'blue',
    zh: '素養島', en: 'AI Fluency',
    blurb: '4D 框架、AI 的能力與限制，以及各種身分的實際應用。'
  },
  {
    key: 'teach', category: '教育', tint: 'gold',
    zh: '講堂島', en: 'Teaching',
    blurb: '從自己會用，走到教得動學生與同儕。'
  },
  {
    key: 'build', category: '開發者', tint: 'coral',
    zh: '工坊島', en: 'Building',
    blurb: 'Claude Code、Agent Skills、Subagents、MCP 與 API。'
  },
  {
    key: 'cloud', category: '雲端', tint: 'purple',
    zh: '雲端島', en: 'Cloud',
    blurb: '在 Amazon Bedrock 與 Google Cloud 上跑 Claude。'
  }
];

/* ── 路段（島嶼路徑上的分段標題）────────────────────────────────── */
window.ACADEMY_BRANCHES = {
  trunk: { zh: '共同基礎',       hint: '不管之後往哪走，這四門都建議先修。' },
  build: { zh: '開發者之路',     hint: '從 Claude Code 到 API 與雲端平台。' },
  teach: { zh: '教育者之路',     hint: '先建立自己的素養，再帶領學生與同儕。' },
  org:   { zh: '組織與產品之路', hint: '把 4D 用在團隊、機構與產品流程上。' },
  cloud: { zh: '官方影片路線',   hint: '本站沒有這些課的文字筆記，節點連到官方影片。' }
};

/* ── 建議路線（全站唯一的順序來源）──────────────────────────────
   「目前位置」與「建議下一步」都由這個順序推導。
   島嶼頁只顯示屬於該島的課程，但仍照這裡的先後排列。

   主幹之後分三線：introduction-to-claude-cowork 的第一個學習成果就是
   「分辨 Chat、Cowork 與 Claude Code 三者各自的適用時機」，是天然的分岔點。 */
window.ACADEMY_ROUTE = [
  // ── 主幹：4 門、58 堂，全部有中文筆記 ──
  { slug: 'claude-101',                               branch: 'trunk' },
  { slug: 'ai-fluency-framework-foundations',         branch: 'trunk' },  // 6 門課的官方先修
  { slug: 'ai-capabilities-and-limitations',          branch: 'trunk' },
  { slug: 'introduction-to-claude-cowork',            branch: 'trunk' },

  // ── 工坊線：先把有筆記的 5 門走完（43 堂可讀），再進影片區 ──
  { slug: 'claude-code-101',                          branch: 'build' },
  { slug: 'introduction-to-agent-skills',             branch: 'build' },
  { slug: 'introduction-to-subagents',                branch: 'build' },
  { slug: 'claude-code-in-action',                    branch: 'build' },
  { slug: 'claude-platform-101',                      branch: 'build' },
  { slug: 'introduction-to-model-context-protocol',   branch: 'build' },
  { slug: 'model-context-protocol-advanced-topics',   branch: 'build' },
  { slug: 'claude-with-the-anthropic-api',            branch: 'build' },

  // ── 講堂線 ──
  { slug: 'ai-fluency-for-educators',                 branch: 'teach' },
  { slug: 'ai-fluency-for-students',                  branch: 'teach' },
  { slug: 'teaching-ai-fluency',                      branch: 'teach' },

  // ── 組織線 ──
  { slug: 'ai-fluency-for-nonprofits',                branch: 'org' },
  { slug: 'ai-fluency-for-small-businesses',          branch: 'org' },
  { slug: 'ai-fluency-for-builders',                  branch: 'org' },

  // ── 雲端：兩門是同一套課綱換平台，是「替代」不是「續集」──
  { slug: 'claude-in-amazon-bedrock',                 branch: 'cloud' },
  { slug: 'claude-with-google-vertex',                branch: 'cloud' }
];

/* pK–12 學習路徑：不是課程，是官方的兩門課組合，只在世界地圖上當一個地標。 */
window.ACADEMY_PATH_LANDMARK = {
  slug: 'ai-fluency-for-pk-12-educators',
  island: 'teach',
  zh: 'pK–12 教育工作者路徑',
  note: '官方學習路徑，內容在 Skilljar 上，本站只提供入口。'
};

/* ── 先修關係（軟性提示，不鎖節點）────────────────────────────── */
window.ACADEMY_PREREQ = {
  // 官方明文：這 6 門課的 prereq 都寫著建議先修「AI 素養：框架與基礎」
  'ai-fluency-for-educators':        { on: ['ai-fluency-framework-foundations'], src: 'official' },
  'ai-fluency-for-students':         { on: ['ai-fluency-framework-foundations'], src: 'official' },
  'teaching-ai-fluency':             { on: ['ai-fluency-framework-foundations'], src: 'official' },
  'ai-fluency-for-nonprofits':       { on: ['ai-fluency-framework-foundations'], src: 'official' },
  'ai-fluency-for-small-businesses': { on: ['ai-fluency-framework-foundations'], src: 'official' },
  'ai-fluency-for-builders':         { on: ['ai-fluency-framework-foundations'], src: 'official' },

  // 本站判斷：agent-skills 的適合對象是「已經在用 Claude Code」；
  // code-in-action 的學習成果是「判斷一條規則該寫進 CLAUDE.md、做成 skill，還是必須用 hook」，
  // 這預設你已經知道 skill 和 hook 是什麼。
  'introduction-to-agent-skills':    { on: ['claude-code-101'], src: 'authored' },
  'introduction-to-subagents':       { on: ['claude-code-101'], src: 'authored' },
  'claude-code-in-action':           { on: ['claude-code-101'], src: 'authored' },
  'model-context-protocol-advanced-topics':
                                     { on: ['introduction-to-model-context-protocol'], src: 'authored' }
};

/* ── 成就徽章 ────────────────────────────────────────────────────
   when 裡的條件全部 AND，欄位全部選填：
     lessons[]        這些課堂編號都要完成
     courses[]        這些課程都要完成
     visitedCourses   至少造訪過 N 門不同課程（造訪，不是完成）
     notes            自己寫過 N 篇筆記
     islandsAnyCourse N 座島各至少完成一門課

   課堂編號是從 content/catalogs.js 逐一核對過的真實 Skilljar id，不是估的。 */
window.ACADEMY_BADGES = [
  {
    id: 'first-chat', zh: '初次對話', xp: 20, icon: 'chat',
    desc: '完成「與 Claude 的第一次對話」。',
    when: { lessons: ['383390'] }
  },
  {
    id: 'four-d', zh: '四個 D 到手', xp: 60, icon: 'compass',
    desc: '走完 4D 框架的委派、描述、判別、盡責四個章節。',
    // 委派 291883/291886 · 描述 291891 · 判別 291898 · 盡責 291904
    when: { lessons: ['291883', '291886', '291891', '291898', '291904'] }
  },
  {
    id: 'black-box', zh: '看穿黑盒子', xp: 50, icon: 'eye',
    desc: '完成「AI 的能力與限制」全部 14 堂。',
    when: { courses: ['ai-capabilities-and-limitations'] }
  },
  {
    id: 'workflow', zh: '工作流上手', xp: 40, icon: 'loop',
    desc: '完成「探索 → 規劃 → 編碼 → 提交」那一整個章節。',
    when: { lessons: ['469792', '469793', '469794'] }
  },
  {
    id: 'three-tools', zh: '三工具齊備', xp: 80, icon: 'tools',
    desc: 'Skills、Subagents、以及 Claude Code 的客製化章節全部完成。',
    when: {
      courses: ['introduction-to-agent-skills', 'introduction-to-subagents'],
      lessons: ['469795', '469796', '469848', '469797', '469798']
    }
  },
  {
    id: 'protocol', zh: '協定實作者', xp: 100, icon: 'plug',
    desc: '兩門 MCP 課程都走完（影片課，以你自己的紀錄為準）。',
    when: {
      courses: ['introduction-to-model-context-protocol',
                'model-context-protocol-advanced-topics']
    }
  },
  {
    id: 'long-road', zh: '走完長路', xp: 150, icon: 'road',
    desc: '完成「使用 Claude API 建置應用」全部 85 堂。',
    when: { courses: ['claude-with-the-anthropic-api'] }
  },
  {
    id: 'two-clouds', zh: '雙雲通行證', xp: 150, icon: 'cloud',
    desc: 'Amazon Bedrock 與 Google Cloud 兩門都走完。',
    when: { courses: ['claude-in-amazon-bedrock', 'claude-with-google-vertex'] }
  },
  {
    id: 'teach-others', zh: '教得動別人', xp: 90, icon: 'podium',
    desc: '教育工作者、學生、教授 AI 素養三門課全部完成。',
    when: {
      courses: ['ai-fluency-for-educators', 'ai-fluency-for-students', 'teaching-ai-fluency']
    }
  },
  {
    id: 'cartographer', zh: '全境測繪', xp: 70, icon: 'map',
    // 刻意是「好奇心」徽章而不是「苦工」徽章——獎勵把這裡當參考書到處翻。
    desc: '20 門課每一門都至少點進去看過一堂。',
    when: { visitedCourses: 20 }
  },
  {
    id: 'note-taker', zh: '筆記人', xp: 60, icon: 'pen',
    desc: '自己寫下 25 篇課堂筆記。',
    when: { notes: 25 }
  },
  {
    id: 'island-hopper', zh: '環島一週', xp: 120, icon: 'boat',
    desc: '五座島各完成至少一門課。',
    when: { islandsAnyCourse: 5 }
  }
];
