/*
 * content/notes/introduction-to-agent-skills.js
 * 這門課的逐課中文筆記（6 堂）。
 *
 * 一門課一個檔案：改某一門課時不會碰到其他課，多個人（或多個代理）
 * 可以同時改不同課程而不會互相覆蓋。原本全部擠在一個 393 KB 的
 * content/notes.js 裡，那個檔案已經拆掉。
 */
window.ACADEMY_LESSON_NOTES = window.ACADEMY_LESSON_NOTES || {};
Object.assign(window.ACADEMY_LESSON_NOTES, {
  '434525': {
    tldr: '一直在重複解釋的那件事，就該寫成 skill。',
    overview: 'skill 是一個資料夾，裡面放 SKILL.md。Claude Code 遇到對應任務就自動照著做。它是按需載入，跟 CLAUDE.md 不一樣。',
    concepts: [
      ['skill 的本體', 'skill 是一個資料夾，裝著指示和資源，Claude Code 需要時才拿來用。'],
      ['description 決定命中率', 'description 是路由條件，不是註解——Claude 靠它判斷要不要用這個 skill。'],
      ['存放位置', '兩個地方，決定這個 skill 只有你用還是全隊共用。', [
        '個人：~/.claude/skills，跟著你走到每個專案',
        '專案：repo 根目錄的 .claude/skills，會進版控、全隊共用',
        'Windows 的個人路徑是 C:/Users/<你的帳號>/.claude/skills'
      ]],
      ['三種客製機制的差別', '差別在什麼時候被載入。', [
        'CLAUDE.md：每次對話都載入',
        'skills：只在請求對得上時才載入',
        'slash command：你自己打出來才會執行'
      ]],
      ['適合寫成 skill 的知識', '共通點是「有時候才需要」的專門知識。', [
        '團隊 code review 標準',
        'commit message 格式',
        '品牌規範',
        '文件範本',
        '除錯流程'
      ]]
    ],
    workflow: [
      '找出你一直重複對 Claude 交代的規則。',
      '永遠適用的寫進 CLAUDE.md，其餘寫成 skill。',
      '決定範圍：只有自己用，還是全隊共用。',
      '建立 SKILL.md，填 name 和 description。',
      'description 要寫清楚做什麼、何時該用。',
      '發一個相關請求，看終端機有沒有載入它。'
    ],
    example: '課程的例子叫 pr-review。frontmatter 只有 name 和 description 兩行，底下接你的 review 檢查清單和格式偏好。之後請 Claude 看 PR，它自己就會把這份 skill 拉進來。',
    pitfalls: [
      '每次對話都要生效的通則寫成 skill，反而不會穩定觸發。',
      'description 太籠統，Claude 就抓不到何時該用。',
      '個人與專案 skill 放錯地方，不是汙染版控就是換專案失效。'
    ]
  },
  '434527': {
    tldr: '啟動只讀 name 和 description，命中才載入內文。',
    overview: '這堂從零建一個 skill。啟動時只讀 metadata，放再多也不吃 context。命中後才載入完整內文。',
    concepts: [
      ['skill 的目錄結構', '一個目錄裡放一個 SKILL.md，上下兩段各有分工。', [
        '上半部 frontmatter：name 與 description',
        '下半部：實際要它怎麼做的指示'
      ]],
      ['啟動時只載 metadata', '啟動時掃四個位置，只讀 name 和 description，不會把內文吃進 context。'],
      ['語意比對加確認', '你的訊息會跟所有 description 做語意比對，命中後跳確認提示，同意才載入內文。'],
      ['優先序階層', '同名衝突時左邊勝出。', [
        'Enterprise → Personal → Project → Plugins',
        'Enterprise 最高，Plugins 最低'
      ]],
      ['更新方式', '改就直接編輯 SKILL.md，但新建的 skill 要重開 session 才看得到。']
    ],
    /* 這一堂是動手教學，步驟裡的字面值（指令、欄位值）不能為了字數上限而省掉——
       少了它們，「寫 name 和 description」就變成不知道要打什麼。字數規則讓路。 */
    workflow: [
      '建目錄：mkdir -p ~/.claude/skills/pr-description',
      '在裡面建 SKILL.md，frontmatter 寫 name: pr-description 與 description: Writes pull request descriptions.',
      'frontmatter 底下寫步驟：先跑 git diff main...HEAD 看完整變更，再照固定格式寫。',
      '重開 session，確認新 skill 出現在清單裡。',
      '發一個對應請求實測，沒觸發就調 description。'
    ],
    example: '課程做的是個人 skill pr-description。它先跑 git diff main...HEAD 看清整條分支的變更。再照 ## What、## Why、## Changes 三段輸出。Changes 那段要把相關的歸在一起，也標出刪除或改名的檔案。',
    pitfalls: [
      '建好 skill 沒重開 session，就以為沒生效。',
      '以為專案 skill 會蓋掉同名個人 skill，其實 Personal 優先。',
      '以為 skill 內文一開場就進 context，其實要命中才載入。'
    ]
  },
  '434526': {
    tldr: 'SKILL.md 保持精簡，細節拆到支援檔案讓它需要時才讀。',
    overview: 'frontmatter 有兩個必填、兩個選填。skill 跟你的對話共用同一個 context window。所以 SKILL.md 要精簡，細節拆出去。',
    concepts: [
      ['四個 metadata 欄位', '兩個必填、兩個選填。', [
        'name（必填）：辨識這個 skill',
        'description（必填）：告訴 Claude 何時該用',
        'allowed-tools（選填）：限制生效期間能用的工具',
        'model（選填）：指定用哪個 Claude 模型'
      ]],
      ['好的 description 回答兩個問題', '要回答做什麼和何時該用，沒觸發就把你實際會講的話補進去。'],
      ['allowed-tools 做為安全邊界', '設成 Read, Grep, Glob, Bash 就是唯讀型 skill，不會動到檔案。'],
      ['progressive disclosure', '一個檔案塞 2000 行會吃掉 context、也難維護，所以拆成目錄。', [
        'scripts/：可執行程式',
        'references/：補充文件',
        'assets/：圖片、範本這類資料檔',
        '在 SKILL.md 裡標明各檔何時該讀'
      ]],
      ['腳本不進 context', 'script 執行時程式碼不進 context，只有輸出耗 token，所以適合這幾種事。', [
        '環境檢查',
        '需要每次結果一致的資料轉換',
        '寫成測過的程式碼比現場生成更可靠的操作'
      ]]
    ],
    workflow: [
      '先寫必填的 name 和 description。',
      'description 要交代用途，也要交代觸發時機。',
      '要限制權限就加 allowed-tools。',
      '有速度或深度需求再加 model。',
      '把 SKILL.md 控制在 500 行以內。',
      '超出的內容拆進 scripts/、references/、assets/。',
      '在 SKILL.md 標明什麼情況該讀哪個檔。',
      '用不同講法多測幾次，沒觸發就補關鍵字。'
    ],
    example: '課程的例子是 codebase-onboarding。它用 allowed-tools 鎖成唯讀、model 設 sonnet。architecture-guide.md 放在支援檔案裡，問到系統設計才讀。',
    pitfalls: [
      '所有內容塞進一個 SKILL.md，又佔 context 又難維護。',
      'description 只寫做什麼，沒寫何時用，語意比對就抓不準。',
      '以為省略 allowed-tools 會有預設限制，其實是完全不限。'
    ]
  },
  '434528': {
    tldr: '五種機制的差別在觸發方式和執行位置，別互相硬塞。',
    overview: '這堂橫向比較五種客製機制。差別在兩件事：什麼時候被觸發、在哪個 context 執行。選錯只會讓設定變複雜。',
    concepts: [
      ['CLAUDE.md vs skills', 'CLAUDE.md 每次都載入，skills 只在請求對得上時載入。', [
        'CLAUDE.md：永遠適用的專案標準、框架與程式風格偏好',
        'CLAUDE.md：像「絕不修改資料庫 schema」這種限制',
        'skills：只跟特定任務相關的專門知識與詳細流程'
      ]],
      ['skills vs subagents', 'skills 加進這段對話，subagent 在另一個 context 跑。', [
        '要委派任務 → subagent',
        '要跟主對話不同的工具權限 → subagent',
        '要把委派工作跟主 context 隔離 → subagent'
      ]],
      ['skills vs hooks', 'hooks 是事件驅動，skills 是請求驅動。', [
        'hooks：存檔後、工具呼叫前自動觸發，適合驗證和自動化副作用',
        'skills：看你在問什麼才啟動，影響 Claude 的判斷和作法'
      ]],
      ['MCP servers 屬於另一類', 'MCP servers 給的是外部工具與整合，跟 skills 不是同一個範疇。'],
      ['組合，不是取捨', '完整的設定五者都有，各管一段。', [
        'CLAUDE.md：恆常標準',
        'skills：按需專業知識',
        'hooks：事件自動化',
        'subagents：隔離委派',
        'MCP servers：外部整合'
      ]]
    ],
    workflow: [
      '每次對話都要在的，寫進 CLAUDE.md。',
      '只在特定主題才有用的，寫成 skill。',
      '要另一個 context 幫你做完再回報，用 subagent。',
      '要在存檔後或工具呼叫前自動跑，用 hook。',
      '缺的是外部系統的工具能力，接 MCP server。'
    ],
    example: '典型配置是五者並用。CLAUDE.md 寫團隊恆常規範。skills 放 code review 和文件撰寫這類按需專業。hooks 做存檔時的自動檢查。subagents 處理要隔離的委派。MCP servers 串接外部服務。',
    pitfalls: [
      '把所有客製都塞進同一個機制，複雜度反而升高。',
      '想「每次存檔就跑」卻寫成 skill，skill 不吃事件。',
      '為了隔離 context 去寫 skill，但它就在這段對話裡，隔不開。'
    ]
  },
  '434529': {
    tldr: '要共用就先問範圍：一個團隊、跨團隊，還是全組織。',
    overview: '這堂講怎麼把 skills 給別人用。範圍從一個團隊到全組織，方法各不同。最後一個坑：subagent 不會自動繼承 skills。',
    concepts: [
      ['Git 共用', '專案 skill 隨 repo 版控，clone 就有、pull 就更新。', [
        '放在專案的 .claude/skills 底下',
        '.claude 目錄同時裝著 agents、hooks、skills 和 settings'
      ]],
      ['Plugin 與 marketplace', 'plugin 把自訂功能打包，跨 repo 跨團隊散佈，適合不綁特定專案的 skills。'],
      ['Enterprise managed settings', '管理員可以全組織部署 skills，優先序最高。', [
        '適合強制性標準、資安要求、合規流程',
        'strictKnownMarketplaces 可限定 plugin 只能從指定來源安裝',
        '例如 github 的 acme-corp/approved-plugins',
        '例如 npm 的 @acme-corp/compliance-plugins'
      ]],
      ['subagents 不會自動繼承 skills', '內建 agent 完全用不了 skills，只有 custom subagent 可以。', [
        'Explorer、Plan、Verify 這些內建 agent 用不了',
        '你在 .claude/agents 自訂的 subagent 可以，但必須明確列出'
      ]],
      ['subagent 的 skills 載入時機', 'subagent 的 skills 在它啟動時就載入，不像主對話那樣按需載入。']
    ],
    workflow: [
      '要給團隊用：放進專案的 .claude/skills。',
      'commit、push，同事 pull 就拿到。',
      '要跨團隊或給社群：打包成 plugin 發到 marketplace。',
      '要全組織強制：找管理員用 managed settings 部署。',
      '要限制安裝來源，加 strictKnownMarketplaces。',
      '要讓 subagent 用 skills，先建 agent 設定檔。',
      '在 frontmatter 的 skills 欄位逐一列出。'
    ],
    example: '課程示範的 agent 叫 frontend-security-accessibility-reviewer。model 用 sonnet。關鍵是那行 skills: accessibility-audit, performance-check。委派給它時，這兩個 skill 每次 review 都生效。',
    pitfalls: [
      '以為建了 subagent 就自動吃到既有 skills。',
      '想讓內建的 Explorer、Plan、Verify 用 skills。',
      '把綁死自家 codebase 的 skill 發上公開 marketplace。'
    ]
  },
  '434530': {
    tldr: '先跑 validator 排掉結構問題，再照症狀分四類找。',
    overview: '這堂是除錯篇。skill 出問題幾乎都是四類。不觸發、載入不了、互相衝突、執行期出錯。先跑 validator，再對症下藥。',
    concepts: [
      ['先跑 validator', 'agent skills verifier 先抓結構性問題，省下大量瞎猜。', [
        '安裝後可以切到 skill 目錄執行',
        '也可以在任何位置直接跑'
      ]],
      ['不觸發＝description 問題', 'Claude 靠語意比對，解法是把你真正會講的話補成 trigger phrase。'],
      ['載入不了＝結構問題', 'SKILL.md 一定要放在具名目錄裡，檔名剛好是 SKILL.md。', [
        '不能直接丟在 skills 根目錄',
        '檔名 SKILL 全大寫、md 全小寫',
        '跑 claude --debug 看載入錯誤'
      ]],
      ['用錯 skill 或被蓋掉', '選錯多半是 description 太像，被蓋掉多半是同名的高優先序 skill 勝出。', [
        '選錯：把幾個 description 寫得更有區別',
        '被蓋掉：例如 enterprise 的 code-review 勝出',
        '解法：改名比較省事，或去找管理員談'
      ]],
      ['執行期錯誤三大來源', '幾乎都出在套件、執行權限、路徑分隔符號。', [
        '外部套件沒安裝',
        '腳本沒有執行權限，要 chmod +x',
        '路徑分隔符號用錯，一律用正斜線，Windows 也一樣'
      ]]
    ],
    workflow: [
      '先跑 skills validator，清掉結構層級的問題。',
      '不觸發：對照 description 跟你實際的講法。',
      '不載入：檢查目錄、檔名大小寫、YAML 語法。',
      '還是不行就跑 claude --debug 看錯誤。',
      '選錯 skill：把幾個 description 改得更有區別。',
      '被蓋掉：對照四層優先序，改名或找管理員。'
    ],
    example: '課程的觸發測試法：同一個效能分析 skill，用不同講法各試一次。像「help me profile this」、「why is this slow?」、「make this faster」。哪個講法沒觸發，就把那組關鍵字補進 description。',
    pitfalls: [
      '把 SKILL.md 直接丟在 skills 根目錄，不會被載入。',
      '檔名寫成 Skill.md 或 skill.md，必須剛好是 SKILL.md。',
      '在 Windows 上用反斜線寫路徑，一律要用正斜線。',
      '腳本忘了 chmod +x，執行期直接失敗。'
    ]
  },
});
