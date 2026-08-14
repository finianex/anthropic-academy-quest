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
    overview: '這一堂先把 skills 是什麼講清楚：它是一個資料夾，裡面放 SKILL.md 這種 markdown 指示檔，讓 Claude Code 在遇到特定任務時自動照著做。重點在於 skills 是「按需載入」的，跟每次對話都灌進去的 CLAUDE.md、以及要手動打的 slash command 分屬不同機制。判斷準則很直白：你如果一直在跟 Claude 重複解釋同一件事，那件事就該寫成 skill。',
    concepts: [
      ['skill 的本體', 'skill 是一個資料夾，裡面裝指示與資源。Claude Code 會掃描並在需要時使用它，用來把某類任務處理得更準確。'],
      ['description 決定命中率', 'Claude 是靠 frontmatter 裡的 description 來判斷這次請求要不要用這個 skill，所以 description 不是註解，是路由條件。'],
      ['存放位置', '個人 skills 放 ~/.claude/skills，跟著你走到每個專案；專案 skills 放 repo 根目錄下的 .claude/skills，會進版控、全隊共用。Windows 上個人路徑是 C:/Users/<你的帳號>/.claude/skills。'],
      ['三種客製機制的差別', 'CLAUDE.md 每次對話都載入；skills 只在請求對得上時才載入；slash command 一定要你自己打出來才會執行。'],
      ['適合寫成 skill 的知識', '團隊 code review 標準、commit message 格式、品牌規範、文件範本、除錯流程——這些都是「有時候才需要」的專門知識。']
    ],
    workflow: [
      '注意自己在哪些事情上重複對 Claude 交代同樣的背景或規則。',
      '判斷這份知識是「永遠適用」還是「特定任務才適用」：前者寫進 CLAUDE.md，後者寫成 skill。',
      '決定範圍：只有自己要用就放 ~/.claude/skills，整隊要用就放專案的 .claude/skills。',
      '建立 SKILL.md，frontmatter 至少寫 name 與 description，description 要寫清楚做什麼、何時該用。',
      '實際發一個相關請求，確認終端機出現該 skill 被載入的提示。'
    ],
    example: '課程用的例子是 pr-review：frontmatter 寫 name: pr-review、description: Reviews pull requests for code quality.，frontmatter 底下就放你的 review 檢查清單與格式偏好。之後只要請 Claude 幫忙看 PR，它自己就會把這份 skill 拉進來。',
    pitfalls: [
      '把 skill 當成 CLAUDE.md 在用——每次對話都要生效的專案通則不該寫成 skill，那樣反而不會穩定觸發。',
      'description 寫得太籠統或太像註解，導致 Claude 判斷不出何時該用，skill 等於沒寫。',
      '把個人 skill 放進專案 .claude/skills（或反過來），結果不是汙染了全隊版控，就是換個專案就失效。'
    ]
  },
  '434527': {
    overview: '這一堂帶你從零建立一個 skill，並解釋 Claude Code 在背後怎麼載入與比對 skills。關鍵機制是：啟動時只讀取每個 skill 的 name 與 description，不讀內文；收到請求後用語意比對挑出候選，經你確認才把完整內容載入 context。最後說明四個來源的優先序，解決同名衝突。',
    concepts: [
      ['skill 的目錄結構', 'skill 是一個目錄，裡面放一個 SKILL.md：上半部 frontmatter 放 name、description，下半部寫實際指示。'],
      ['啟動時只載 metadata', 'Claude Code 啟動會掃四個位置，但只讀 name 和 description，不會把內文吃進 context，所以放很多 skills 也不會爆掉。'],
      ['語意比對加確認', '你送出請求後，Claude 拿你的訊息去跟所有 description 做語意比對；找到相符的會先跳出確認提示，同意後才載入完整內容。'],
      ['優先序階層', '同名衝突的勝出順序是 Enterprise → Personal → Project → Plugins，Enterprise 最高、Plugins 最低。'],
      ['更新方式', '要改 skill 就直接編輯它的 SKILL.md；因為載入發生在啟動時，新建 skill 後要重開 session 才看得到。']
    ],
    workflow: [
      '建目錄：mkdir -p ~/.claude/skills/pr-description。',
      '在該目錄中建立 SKILL.md，frontmatter 寫 name: pr-description 與 description: Writes pull request descriptions.。',
      'frontmatter 底下寫實際步驟，例如先跑 git diff main...HEAD 看清這條分支的所有變更，再依固定格式撰寫。',
      '重新啟動 Claude Code session，確認新的 skill 出現在清單裡。',
      '發一個對應請求做實測；沒觸發就回頭調整 description。'
    ],
    example: '課程做的是 pr-description 這個個人 skill：指示 Claude 先執行 git diff main...HEAD，再依 ## What（一句話說明這個 PR 做了什麼）、## Why（為何需要這個改動）、## Changes（條列具體變更、相關的歸在一起、註明刪除或改名的檔案）三段輸出。',
    pitfalls: [
      '建好 skill 卻沒重啟 session，就以為沒生效——載入時機在啟動。',
      '以為 clone 下來的專案 skill 會蓋掉你的同名個人 skill，其實 Personal 優先於 Project。',
      '誤以為所有 skill 內文開場就進 context；實際只有 name 與 description 常駐，內文要等命中並確認後才載入。'
    ]
  },
  '434526': {
    overview: '這一堂講進階設定：SKILL.md frontmatter 除了必填的 name 和 description，還有選填的 allowed-tools 與 model；以及怎麼把 description 寫得穩定觸發。後半重點是 progressive disclosure——skill 跟你的對話共用同一個 context window，所以 SKILL.md 要保持精簡，把細節拆到支援檔案，讓 Claude 需要時才讀。',
    concepts: [
      ['四個 metadata 欄位', 'name（必填）辨識 skill；description（必填）告訴 Claude 何時用；allowed-tools（選填）限制 skill 生效期間可用的工具；model（選填）指定用哪個 Claude 模型。'],
      ['好的 description 回答兩個問題', '這個 skill 做什麼？Claude 什麼時候該用它？沒有按預期觸發時，就補上你實際會用的講法當關鍵字。'],
      ['allowed-tools 做為安全邊界', '例如設成 Read, Grep, Glob, Bash 就變成唯讀型 skill，不會動到檔案。完全不寫這個欄位就等於不設限。'],
      ['progressive disclosure', '把 2000 行塞進一個檔案有兩個問題：吃掉大量 context window，而且難以維護。改成目錄拆分：scripts/ 放可執行程式、references/ 放補充文件、assets/ 放圖片範本等資料檔，並在 SKILL.md 裡標明各檔何時該讀。'],
      ['腳本不進 context', 'skill 目錄裡的 script 執行時不會把程式碼內容載入 context，只有輸出耗 token，因此適合環境檢查、需要一致性的資料轉換，以及「寫成測過的程式碼比現場生成更可靠」的操作。']
    ],
    workflow: [
      '先寫出 name 與 description 這兩個必填欄位，description 同時交代用途與觸發時機。',
      '評估這個 skill 該不該限制權限，需要就加上 allowed-tools；有速度或深度需求再加 model。',
      '把 SKILL.md 控制在 500 行以內，這是課程給的經驗法則。',
      '超出的內容拆進 scripts/、references/、assets/，並在 SKILL.md 裡寫明什麼情況才去讀哪個檔。',
      '用不同講法多測幾次觸發，沒中就往 description 補關鍵字。'
    ],
    example: '課程的 codebase-onboarding skill：frontmatter 設 allowed-tools: Read, Grep, Glob, Bash 與 model: sonnet，讓它只能讀不能改；同時把 architecture-guide.md 放進支援檔案，只有當有人問到系統設計時 Claude 才去讀那份文件。',
    pitfalls: [
      '把所有內容都塞進單一巨大的 SKILL.md，既佔 context 又難維護——這正是 progressive disclosure 要解決的。',
      'description 只寫「做什麼」沒寫「何時用」，語意比對就抓不準。',
      '以為省略 allowed-tools 會有預設限制；實際上不寫就是完全不限制。'
    ]
  },
  '434528': {
    overview: '這一堂做橫向比較：skills、CLAUDE.md、subagents、hooks、MCP servers 各自解決什麼問題。核心差別在觸發方式與執行位置——CLAUDE.md 恆常載入、skills 依請求載入、hooks 由事件觸發、subagents 在獨立 context 執行、MCP servers 提供外部工具串接。選錯機制會讓設定變得不必要地複雜。',
    concepts: [
      ['CLAUDE.md vs skills', 'CLAUDE.md 每次對話都載入，適合永遠適用的專案標準、像「絕不修改資料庫 schema」這種限制、以及框架與程式風格偏好。skills 適合只在特定任務相關的專門知識與詳細流程。'],
      ['skills vs subagents', 'skills 是把知識加進「目前這段對話」；subagents 在另一個 context 執行。需要委派任務、需要跟主對話不同的工具權限、需要把委派工作跟主 context 隔離時，用 subagent。'],
      ['skills vs hooks', 'hooks 是事件驅動，檔案存檔、特定工具呼叫前會自動觸發，適合驗證與自動化副作用。skills 是請求驅動，依你在問什麼而啟動，影響的是 Claude 的判斷與作法。'],
      ['MCP servers 屬於另一類', 'MCP servers 提供的是外部工具與整合，跟 skills 根本不是同一個範疇，不該拿來互相取代。'],
      ['組合而非取捨', '完整的設定通常同時包含五者：CLAUDE.md 管恆常標準、skills 管按需專業知識、hooks 管事件自動化、subagents 管隔離委派、MCP servers 管外部整合。']
    ],
    workflow: [
      '先問這份知識是不是每次對話都要在：是就寫進 CLAUDE.md。',
      '再問它是不是只在特定主題出現時才有用：是就寫成 skill。',
      '如果需要的是「另一個 context 幫我把事做完再回報」，改用 subagent。',
      '如果是要在某個事件發生時自動執行（存檔後、工具呼叫前），用 hook。',
      '如果缺的是外部系統的工具能力，接 MCP server，不要硬塞成 skill。'
    ],
    example: '一組典型配置：CLAUDE.md 寫團隊恆常規範，skills 放 code review 與文件撰寫這類按需專業，hooks 負責存檔時的自動檢查，subagents 處理需要隔離的委派工作，MCP servers 串接外部服務——各司其職。',
    pitfalls: [
      '把所有客製都硬塞進同一個機制（通常是 CLAUDE.md 或 skills），造成不必要的複雜度。',
      '想要「每次存檔就跑一次」卻寫成 skill——那是 hook 的職責，skill 不會被事件觸發。',
      '為了隔離 context 而寫 skill：skill 就是載進目前這段對話，達不到隔離效果，該用 subagent。'
    ]
  },
  '434529': {
    overview: '這一堂講 skills 怎麼散佈出去：最簡單是把專案 skills 提交進 Git 讓全隊共用，範圍更大用 plugin 上架 marketplace，全組織強制則用 enterprise managed settings。最後有個容易踩到的點——subagents 不會自動看到你的 skills，必須在 custom agent 的 frontmatter 用 skills 欄位明確列出來。',
    concepts: [
      ['Git 共用', '放在 .claude/skills 的專案 skills 會隨 repo 一起版控，任何人 clone 就有，push 更新後大家下次 pull 就拿到。.claude 目錄本身就同時裝著 agents、hooks、skills 與 settings。'],
      ['Plugin 與 marketplace', 'plugin 是把自訂功能打包分享的機制，跨 repo、跨團隊散佈。適合那些不太綁特定專案、對社群其他人也有用的 skills。'],
      ['Enterprise managed settings', '管理員可透過 managed settings 全組織部署 skills，優先序最高，適合強制性標準、資安要求、合規流程。該設定檔支援 strictKnownMarketplaces，可限定 plugin 只能從指定來源安裝（例如 github 的 acme-corp/approved-plugins，或 npm 的 @acme-corp/compliance-plugins）。'],
      ['subagents 不會自動繼承 skills', '內建 agent（Explorer、Plan、Verify）完全無法使用 skills；只有你自己在 .claude/agents 定義的 custom subagent 可以用，而且必須明確列出。'],
      ['subagent 的 skills 載入時機', 'subagent 的 skills 是在它啟動時就載入，不像主對話那樣按需載入。']
    ],
    workflow: [
      '要給團隊用：把 skill 放進專案 .claude/skills 並 commit、push。',
      '要跨團隊或給社群用：打包成 plugin，發佈到 marketplace 供人安裝。',
      '要全組織強制：交由管理員透過 managed settings 部署，必要時搭配 strictKnownMarketplaces 限制安裝來源。',
      '要讓 subagent 用到 skills：在 .claude/agents 建立 agent markdown 檔。',
      '在該 agent 的 frontmatter 加上 skills 欄位，逐一列出要載入的 skill 名稱。'
    ],
    example: '課程示範的 agent 檔 frontmatter 為 name: frontend-security-accessibility-reviewer、tools 含 Bash/Glob/Grep/Read/WebFetch/WebSearch/Skill、model: sonnet、color: blue，並以 skills: accessibility-audit, performance-check 明確載入兩個 skill。委派給它時，這兩個 skill 會套用在每一次 review。',
    pitfalls: [
      '以為建了 subagent 就自動吃得到既有 skills——沒有在 frontmatter 列 skills 就完全不會載入。',
      '想讓內建的 Explorer / Plan / Verify 用 skills：這條路走不通，只有 custom subagent 可以。',
      '把高度綁定自家 codebase 結構的 skill 發到公開 marketplace，對別人沒用；這類東西留在 repo 內共用即可。'
    ]
  },
  '434530': {
    overview: '這一堂是除錯篇。skill 出問題幾乎都落在四類：不觸發、載入不了、彼此衝突、執行期出錯。標準流程是先跑 skills validator 把結構問題排除，再依症狀對症下藥，不要一開始就亂猜。',
    concepts: [
      ['先跑 validator', 'agent skills verifier 指令能先抓出結構性問題，安裝後可切到 skill 目錄執行，也可以在任何位置直接跑。先做這步能省下大量瞎猜時間。'],
      ['不觸發＝description 問題', 'Claude 用語意比對，你的請求要跟 description 的語意有重疊。解法是照你真正會講的話補進 trigger phrase。'],
      ['載入不了＝結構問題', 'SKILL.md 必須放在一個具名目錄裡，不能直接丟在 skills 根目錄；檔名必須剛好是 SKILL.md，SKILL 全大寫、md 全小寫。可以跑 claude --debug 看載入錯誤。'],
      ['用錯 skill 或被蓋掉', '選錯 skill 通常是幾個 description 太相似，把它們寫得更有區別即可。個人 skill 被忽略則多半是同名的高優先序 skill（例如 enterprise 的 code-review）勝出，改名通常是比較省事的解法，或去找管理員談。'],
      ['執行期錯誤三大來源', '外部套件沒安裝、腳本沒有執行權限（需要 chmod +x）、路徑分隔符號用錯（一律用正斜線，Windows 上也一樣）。']
    ],
    workflow: [
      '先執行 skills validator，把結構層級的問題清掉。',
      '不觸發：檢查 description 跟你實際的講法是否對得上，補上關鍵字。',
      '不載入：確認 SKILL.md 在具名目錄內、檔名大小寫正確、YAML 語法無誤，必要時 claude --debug 看錯誤。',
      '選錯 skill：把幾個 description 改得更互相區別。',
      '被高優先序 skill 蓋掉：對照 Enterprise → Personal → Project → Plugins 的階層，改名或聯絡管理員。'
    ],
    example: '課程給的觸發測試法：假設有個效能分析 skill，就用「help me profile this」「why is this slow?」「make this faster」等不同講法各試一次，哪個講法沒觸發，就把那組關鍵字補進 description。',
    pitfalls: [
      '把 SKILL.md 直接放在 skills 根目錄而不是放在具名子目錄裡，skill 就不會被載入。',
      '檔名寫成 Skill.md 或 skill.md——必須剛好是 SKILL.md。',
      '在 Windows 上用反斜線寫路徑；課程明講一律用正斜線。腳本忘了 chmod +x 也會在執行期直接失敗。'
    ]
  },
});
