/*
 * content/notes/claude-code-in-action.js
 * 這門課的逐課中文筆記（10 堂）。
 *
 * 一門課一個檔案：改某一門課時不會碰到其他課，多個人（或多個代理）
 * 可以同時改不同課程而不會互相覆蓋。原本全部擠在一個 393 KB 的
 * content/notes.js 裡，那個檔案已經拆掉。
 */
window.ACADEMY_LESSON_NOTES = window.ACADEMY_LESSON_NOTES || {};
Object.assign(window.ACADEMY_LESSON_NOTES, {
  '486901': {
    tldr: '長工作階段靠兩件事：動工前界定範圍，執行中修方向。',
    overview: '跨十幾個檔案的重構，跟順手做件小事是兩回事。整堂歸納成兩個習慣：先界定範圍，再一路修正方向。',
    concepts: [
      ['先用 plan mode 界定範圍', 'Plan 模式只讀不寫：把程式碼看過、判斷哪裡要改，再把計畫交給你。', [
        '計畫拿到手要真的讀完，不要只掃過',
        '計畫愈周全，執行時的意外愈少',
        '有缺漏就當場叫它補'
      ]],
      ['/compact 要帶指示', '命令後面接的文字決定摘要保留什麼，裸打一次等於放棄方向盤。', [
        '機制：濃縮成摘要、拿摘要當新脈絡、刪掉舊訊息',
        '帶指示的寫法：/compact Focus on the --version flag implementation'
      ]],
      ['Rewind 是回到檢查點', '每一次使用者提示都會建立一個檢查點，選單提供五種操作。', [
        '還原程式碼與對話',
        '只還原對話',
        '只還原程式碼',
        'summarize from here：壓縮檢查點之後',
        'summarize up to here：壓縮檢查點之前，保留實作段落'
      ]],
      ['Goal 與 Loop 讓它更自主', 'Goal 設的是完成條件，Loop 是在回合之間重跑同一段提示。', [
        '/goal all tests in src/billing pass, and the type checker reports zero errors',
        '由一個快速評估器判定是否達標，未達標就繼續做',
        '取消用 /goal clear',
        'Loop 依固定或自訂節奏重跑，適合輪詢 CI 或部署狀態',
        'Loop 按 escape 停止'
      ]],
      ['Worktree 讓多個 agent 不互相踩踏', '同一個 repo 跑多個 agent，等於一台車兩個方向盤。', [
        '每個工作階段有獨立檔案樹，不會覆蓋對方的修改',
        '工作階段結束時，乾淨的 worktree 會自動移除',
        '.worktreeinclude 放在 repo 根目錄，列出要複製進每個 worktree 的 git-ignored 檔案，例如環境變數檔'
      ]]
    ],
    workflow: [
      '先進 plan mode，讓它只讀程式碼、產出計畫。',
      '逐行讀計畫，有缺漏就當場要它改。',
      '確認後才放行執行。',
      '脈絡快滿時，用帶指示的 /compact 濃縮。',
      '走偏就開 rewind 選單，還原到檢查點。',
      '「完成」比「步驟」好描述時改下 /goal。',
      '要平行推進多條線，就開 worktree。'
    ],
    example: '課程的例子是實作 --version 旗標。對話拉長後不要裸打 /compact，要在後面補上這條線索。目標型的工作寫成 /goal，讓它一直做到評估器確認通過。',
    pitfalls: [
      '計畫只掃一眼就放行，後面的意外全會回來找你。',
      '裸打 /compact，關鍵細節被摘要掉。',
      '走偏了還用提示講回來，忘記可以 rewind。',
      '忘記 rewind 可以只還原程式碼或只還原對話。'
    ]
  },
  '486929': {
    tldr: 'CLAUDE.md 是指引不是強制，每一行都在搶注意力。',
    overview: '幾乎每個人都會踩到同一個陷阱：CLAUDE.md 愈長愈肥。它是指引，不是強制設定。先判斷規則該不該寫在這裡。',
    concepts: [
      ['指引 vs. 強制', '寫「絕不 push 到 main」只是期待它讀到就照做，大多數時候會，但不算保證。', [
        '硬規則要放進 hook',
        'hook 是在動作前執行的程式碼，可以真的擋下來'
      ]],
      ['四個存放位置', 'CLAUDE.md 有四層，啟動時全部一起載入。', [
        'managed policy：平台團隊控管的組織層',
        'user：跟著你這台機器，跨所有專案的個人偏好',
        'project：進版控，與團隊共用',
        'local：不進 git，只屬於你在這個 repo 的私人筆記',
        'local 最常被忽略，但很好用'
      ]],
      ['用 import 拆檔，但不會省脈絡', '專案檔太長就用路徑匯入語法拆開，載入的脈絡量不變。', [
        '@.claude/conventions/code-style.md',
        '@.claude/conventions/testing.md',
        '@.claude/conventions/workflow.md',
        '拆檔只是整理結構，不會減少脈絡'
      ]],
      ['規則要具體、可檢查', '「遵循最佳實務」這種句子連你自己都說不清標準。', [
        '反例：Follow best practices for API routes.',
        '正例：Put new API routes in src/api/handlers, one per file.',
        '正例明確到可以驗證'
      ]],
      ['禁止時要指名替代方案', '只說不要用等於留白，把替代作法講死才有辦法照做。', [
        '留白：Don’t use default exports.',
        '講死：Use named exports, not default exports.',
        'IMPORTANT、YOU MUST 這類字確實會拉高優先度',
        '但強調是一種預算，全篇都強調等於沒有強調',
        '只留給最關鍵的幾條'
      ]]
    ],
    workflow: [
      '寫規則前先問：這是指引還是硬線。',
      '硬線改寫成 hook，不要留在 CLAUDE.md。',
      '依適用範圍挑層級：組織、個人、團隊、自己。',
      '專案檔變長就用 @ 匯入拆成 conventions 系列檔。',
      '把每條規則改寫成具體可檢查的句子。',
      'Claude 做錯就回頭修 CLAUDE.md，當它是產品程式碼。'
    ],
    example: 'API 路由那組對照最清楚：模糊版沒有標準，具體版指名資料夾與一檔一路由，可以照著查。default exports 那組同理，指名 named exports 才有辦法照著做。',
    pitfalls: [
      '硬規則寫進 CLAUDE.md 就以為安全，其實沒東西會擋。',
      '以為 import 拆檔能省脈絡，拆檔只改善組織。',
      '每條規則都加 IMPORTANT，把強調預算花光。'
    ]
  },
  '486930': {
    tldr: '第一個該做的技能是驗證技能，別再靠你記得檢查。',
    overview: '專案一長大就會出現重複性工作。第一個值得自動化的是驗證，因為它現在完全依賴你記得去檢查。順便釐清三種指令介面的分工。',
    concepts: [
      ['驗證不該依賴你的記性', '原本的流程完全靠你記得回頭複查、記得叫它跑測試。', [
        '技能的 description 一被匹配就自動觸發',
        '每次都走同一套步驟，不用你開口'
      ]],
      ['驗證技能的四個步驟', '第三步是關鍵：測試變綠燈不等於正確，測試本身可能被鬆綁。', [
        '跑測試套件',
        '讀 diff',
        '確認沒有為了讓測試通過而偷偷放寬測試',
        '回報通過或失敗，附上證據'
      ]],
      ['技能資料夾不只有 skill.md', '旁邊可以放參考檔和腳本，等於技能自帶工具。', [
        'reference.md 收詳細材料，由 skill.md 連過去',
        'Claude 只在真的需要深度時才讀 reference.md',
        '腳本（例如 check.sh）是被執行，不是載進脈絡'
      ]],
      ['skill.md 要瘦', '主檔只描述要做什麼，長篇解說與可執行腳本推到側檔。', [
        '技能本身是一個資料夾加一個 skill.md',
        'skill.md 寫名稱、觸發用的 description、流程本身',
        '平常只有 description 進脈絡'
      ]],
      ['三個介面的分工', '前兩者是 Claude 去遵守的指示，hook 才是會執行的程式碼。', [
        'CLAUDE.md：隨時適用的慣例，例如命名規則、檔案放哪',
        'skill：綁定特定任務類型的流程與參考資料',
        'hook：Claude 絕不能跳過的規則'
      ]]
    ],
    workflow: [
      '先建驗證技能：一個資料夾加一個 skill.md。',
      '把 description 寫成重構類任務會觸發。',
      '流程依序寫：跑測試、讀 diff、查測試有無放寬。',
      '最後輸出結論與證據。',
      '冗長說明搬到 reference.md，檢查搬到腳本。',
      '同樣形狀套到發版檢查、遷移、開 PR 前檢查。',
      '不能被跳過的規則改放 hook。'
    ],
    example: '你請 Claude 重構一段程式碼。它完成後，這次變更符合驗證技能的 description，技能自動觸發：跑測試、讀 diff、確認沒有偷偷鬆綁測試，最後回報結論與證據。整串流程你一句話都沒說。',
    pitfalls: [
      '把測試全綠當驗證完成，忽略測試可能被放寬。',
      '什麼都塞進 skill.md，該進側檔的沒搬出去。',
      '把不能跳過的規則寫成技能流程，以為有強制力。'
    ]
  },
  '486932': {
    tldr: 'auto 的分類器只擋危險動作，不看程式碼對不對。',
    overview: '權限模式讓你一次決定哪些事可以不問你。這堂把六種模式的界線攤開。重點是 auto 的分類器擋什麼、不擋什麼。',
    concepts: [
      ['六種模式', '六種的界線一次看完，之後照情境挑。', [
        'Manual：只讀，其餘一律先問',
        'Accept edits：讀取、檔案編輯與常見檔案系統 bash 指令直接跑，先做後審',
        'Plan：只讀，只研究與提案，不動檔案',
        'Auto：全部接受，但每個動作執行前由另一個分類器模型審查',
        'Don’t ask：只允許事先核可的工具，其餘無提示直接拒絕',
        'Bypass permissions：略過所有檢查'
      ]],
      ['shift-tab 循環', '日常那幾種不用記指令，按 shift-tab 就會循環。', [
        '循環範圍：manual、accept edits、plan',
        '剩下的模式要另外指定'
      ]],
      ['Auto 擋的是什麼', '設計上擋的是危險動作，放行的是日常工作。', [
        '擋：正式環境部署與資料庫遷移',
        '擋：強制推送，或把下載內容直接管進 shell',
        '擋：把敏感資料送到外部端點',
        '擋：刪掉工作階段才有的檔案',
        '放行：專案內的本機編輯',
        '放行：依 lock 檔安裝相依套件',
        '放行：唯讀請求、推到自己的分支'
      ]],
      ['分類器只看意圖，不看正確性', '它判斷動作危不危險，不判斷程式碼對不對。', [
        'auto 在執行前守住意圖',
        'stop hook 在結束後跑測試，守住正確性',
        '一前一後，要搭配著用'
      ]],
      ['Don’t ask 給無人值守的場景', '沒有人在旁邊按核可的時候就用它。', [
        '適用：CI pipeline、排程任務、整夜批次',
        'Bypass permissions 只適合隔離的容器或虛擬機',
        'bypass 等同 dangerously-skip-permissions'
      ]]
    ],
    workflow: [
      '日常互動按 shift-tab 在三種模式間切換。',
      '要放手讓它連續跑就切到 auto。',
      '同時掛上 stop hook 執行測試，補上正確性。',
      '無人值守的 CI、排程、整夜批次改用 don’t ask。',
      '只在隔離容器或 VM 裡才用 bypass。'
    ],
    example: '整夜跑一批重構就選 auto。分類器會攔下強制推送與正式環境遷移，同時放行本機編輯與推到自己分支。再加一個 stop hook 跑測試，測試沒過就不准結束回合。若這批工作排在 CI 裡沒人看著，就改成 don’t ask。',
    pitfalls: [
      '以為 auto 的分類器會幫你抓錯誤程式碼。',
      '無人值守用 bypass，那該用 don’t ask。',
      'bypass 只該出現在隔離容器或 VM。',
      '不分任務都用同一種模式，不是一直被打斷就是放行過頭。'
    ]
  },
  '486933': {
    tldr: 'Hooks 把「通常會照做」變成「一定會照做」。',
    overview: 'CLAUDE.md 裡的指示是請求，不是保證。Hooks 是真的會執行的程式碼。這堂挑出最該熟的幾個事件與寫法。',
    concepts: [
      ['值得記住的事件', '一個工作階段會觸發約 30 個 hook 事件，先熟這幾個。', [
        'PreToolUse：工具呼叫前，強制力的核心，可以在事情發生前擋下來',
        'PostToolUse：工具呼叫成功後，通常拿來自動格式化或 lint',
        'Stop：Claude 想結束回合時，條件沒滿足就可以拒絕（子代理對應 SubagentStop）',
        'PreCompact / PostCompact：壓縮前後',
        'InstructionsLoaded：CLAUDE.md 或規則檔載入時',
        'SessionStart：開場時觸發、負責預備環境，只想在全新啟動時跑就用 startup 來源'
      ]],
      ['壓縮後補脈絡不要用 PostCompact', '這是常見誤區：要用帶 compact matcher 的 SessionStart，那個才會真的進脈絡。'],
      ['PreToolUse 的 JSON 決策', '印出 JSON 再用 0 退出就是回話，關鍵欄位是 permissionDecision。', [
        'allow：放行',
        'deny：擋下',
        'ask：交回使用者決定',
        'defer：只適用非互動的 -p 執行，由呼叫端暫停工具再恢復，很少用到'
      ]],
      ['退出碼的語意', '最容易搞錯的是 1：看起來像錯誤，但不會阻擋，指令照跑。', [
        '0：成功，標準輸出若是 JSON 會被解析',
        '0：純文字多數事件會被忽略，但 SessionStart、UserPromptSubmit、UserPromptExpansion 會加入脈絡',
        '1：不阻擋',
        '2：阻擋型錯誤，標準錯誤會餵回給 Claude 當脈絡'
      ]],
      ['與其擋下，不如改寫', 'PreToolUse 的 JSON 有 updatedInput，可以改寫呼叫而不是拒絕它。', [
        '例子：把 bash 指令裡的密鑰洗掉再放行',
        'updatedInput 是整體取代，不是局部合併'
      ]]
    ],
    workflow: [
      '先確認這條規則必須被強制，才寫成 hook。',
      '事前攔截挑 PreToolUse。',
      '事後格式化挑 PostToolUse，收尾把關挑 Stop。',
      '用 matcher 指定要監看的工具，例如 Bash。',
      '必要時再用 if 條件縮小範圍。',
      '要細緻決策就印 JSON 設 permissionDecision。',
      '簡單情境用退出碼，擋下一律用 2。',
      '危險但不必全擋，改用 updatedInput 重寫指令。'
    ],
    example: '對 Bash 工具掛一個 PreToolUse 守門員：matcher 選中 Bash，if 條件再縮小到特定情境。直覺作法是回傳 deny 擋掉危險呼叫。更實用的是回傳 updatedInput，把密鑰洗掉後讓它照跑。',
    pitfalls: [
      '想擋卻用退出碼 1，指令照樣執行，該用 2。',
      '想在壓縮後補回脈絡卻掛在 PostCompact。',
      '想靠 PostToolUse 阻擋危險動作，工具早就跑完了。'
    ]
  },
  '486935': {
    tldr: '自動化是一條光譜，預設從 routine 起步。',
    overview: '信任它能做某件事之後，下一步就是不再手動做。這堂把自動化排成一條光譜。重點是知道每一段適合什麼工作。',
    concepts: [
      ['Routines：一個會自己跑的儲存提示', 'Routine 綁定提示、它作用的 repo、需要的 connector，再加上排程。', [
        '沒有腳本、伺服器或 workflow 檔要維護，機器是 Anthropic 的',
        '觸發：cron 排程，例如每天早上 9 點',
        '觸發：對它的 API 端點發 HTTP POST',
        '觸發：GitHub 事件，例如新 PR 進來',
        '建立方式：claude.ai/code/routines 網頁，或終端機 /schedule daily dependency audit at 9am'
      ]],
      ['Routines 的三個限制', '用之前先確認這三件事。', [
        '目前是研究預覽',
        '週期性排程最密只能每小時一次',
        '每次執行從預設分支的全新 clone 開始，且只能推到 claude/ 前綴的分支，除非對該 repo 放寬'
      ]],
      ['Headless 模式與 -p', '要跑在自己的環境就用 headless，核心是 -p（--print）旗標。', [
        '例子：claude -p "summarize the changes in this diff"',
        '-p 會略過 hooks、skills、plugins、MCP servers 與 CLAUDE.md 的自動探索'
      ]],
      ['結構化輸出與跨步驟工作階段', '要結構化就加 --output-format json 搭配 --json-schema。', [
        '符合 schema 的物件落在回應的 structured_output 欄位，可以直接 jq 取用',
        '多步驟不必擠進一個指令：claude --resume "$(jq -r .session_id /tmp/plan.json)"'
      ]],
      ['--bare 與 Agent SDK', 'CI 要每次結果一致，就用 --bare 進入確定性模式。', [
        '光譜最末端是 Agent SDK：把 Claude Code 放進你自己的應用',
        '兩種語言都提供 query 函式與跟 CLI 相同的原語',
        '可設定 allowedTools、系統提示與權限模式',
        '再迭代處理串流回來的訊息'
      ]]
    ],
    workflow: [
      '先問這件事是不是「同一段提示加週期性觸發」。',
      '是的話預設選 routine，從網頁或 /schedule 建。',
      '要跑自己的 pipeline 就降一階用 -p。',
      '需要結構化結果就加 --json-schema，再用 jq 取值。',
      'CI 要求每次一致就加 --bare。',
      '工作本身屬於你的產品功能，才升級到 Agent SDK。'
    ],
    example: '課文的抽取範例是 claude -p 加上 --output-format json 與 --json-schema。再用 jq 取 .structured_output.functions，就拿到一個乾淨的函式名稱陣列往下傳。日常面就是每天早上的相依套件稽核，或 PR 一開就啟動的分流 routine。',
    pitfalls: [
      '期待 routine 每幾分鐘跑一次，它最密只有每小時。',
      '忘記 routine 只能推到 claude/ 前綴的分支。',
      '以為 -p 底下 hooks、MCP 與 CLAUDE.md 會照常載入。',
      '一開始就跳到 Agent SDK 或自架 pipeline。'
    ]
  },
  '486936': {
    tldr: '只要 PR 審查就用託管的 Code Review，其他事才寫 Action。',
    overview: 'Pull request 最適合交棒重複性工作。這堂比較託管與自組兩條路。前者零建置但只發表意見，後者要寫 workflow 但什麼都能做。',
    concepts: [
      ['Code Review：託管路線', '透過 Claude GitHub app 審查 PR，沒有東西要你建或託管。', [
        '管理員在 Claude Code admin settings 的 Code review 區塊按 Configure 接上 repo',
        '安裝 GitHub app，選擇監看哪些 repo',
        '執行時機：PR 開啟時跑一次、每次推送都跑、或有人留言 @claude review 才跑'
      ]],
      ['審查是對照整個 codebase', '一組審查代理把 diff 放進整個 codebase 的脈絡分析，不是孤立看改動行。', [
        '啟用後全部跑在 Anthropic 的基礎設施上',
        '問題以 Claude 的留言直接落在該行，附說明與建議修法',
        '發現會去重、排序'
      ]],
      ['託管路線的邊界', '它只張貼發現，不替你做決定。', [
        '永遠不會核准或阻擋 PR',
        '沒有託管的自動修復',
        '目前是研究預覽，提供給 team 與 enterprise 方案，行為還會變動',
        '要套用某個發現，是在本機動手'
      ]],
      ['GitHub Action：自己組', '自己寫 workflow，用 anthropics/claude-code-action@v1。', [
        '設定從 Claude Code 裡開始',
        'anthropic_api_key：選填',
        'github_token：預設 secrets.GITHUB_TOKEN',
        'trigger_phrase：留言中要監聽的字串，預設 @claude',
        'use_bedrock / use_vertex：切換供應商',
        'prompt：這次執行的指示',
        'claude_args：直接傳給 Claude Code 的 CLI 參數字串'
      ]],
      ['用 claude_args 調校', '把執行邊界收緊，例如對 agent 迴圈設硬上限。', [
        '--max-turns 5 設迴圈上限',
        '也可以指定權限模式、限定允許的工具',
        '範例：--max-turns 5 --model claude-sonnet-5'
      ]]
    ],
    workflow: [
      '先判斷需求：只要 PR 審查就走託管路線。',
      '請組織管理員啟用，安裝 GitHub app。',
      '挑 repo，選觸發時機。',
      '需要審查以外的事，才建 GitHub Action。',
      'workflow 放進 .github/workflows/claude.yaml。',
      '設好 trigger_phrase 與 prompt。',
      '用 claude_args 收緊執行邊界。',
      '在 Actions 分頁觀察每一步。'
    ],
    example: '在 .github/workflows/claude.yaml 放上 anthropics/claude-code-action@v1，trigger_phrase 設 @claude。之後有人在 PR 留言 @claude implement the spec in the linked Linear issue，action 就會接手。同一個 action 也能改成排程執行，做每日彙整。',
    pitfalls: [
      '以為託管 Code Review 會擋下 PR 或自動修好。',
      '只要 PR 審查卻先去寫 GitHub Action。',
      '寫 action 沒設 --max-turns，迴圈可能一直跑。'
    ]
  },
  '486938': {
    tldr: '驗證的強度要跟你放手的程度成正比。',
    overview: '任務交出去、沒盯著每一步，它說做完了。出貨前你得驗證一件自己沒看見的事。原則只有一句：放手越多，驗證越重。',
    concepts: [
      ['驗證與放手程度成正比', '短工作階段掃一眼就夠，越是沒看著的執行越要認真檢查。'],
      ['無人值守用 auto，不要用 bypass', 'auto 的分類器仍會逐一審查動作的危險性，這是一張安全網。', [
        '但它從不判斷程式碼是否正確',
        '它只標記危險動作',
        '正確性得靠你的驗證環節'
      ]],
      ['先看 diff，不要先看摘要', '不要從完成報告開始：先用 /code-review 走過變更，再親自看 git diff。', [
        '陷阱是完美的摘要，配上動到預期外檔案的 diff',
        '先讀計畫內的檔案',
        '再找計畫外的東西'
      ]],
      ['把測試變成關卡而不是承諾', '關卡是測試有沒有過，還有它是不是真的跑了。', [
        'Stop hook 跑測試，失敗就不准結束回合',
        'PostToolUse hook 每次編輯後做 lint 與型別檢查',
        '關鍵在退出碼：exit 2 把失敗直接餵回給 Claude，它會自己去修'
      ]],
      ['冷靜的第二意見', '開一個全新工作階段或子代理，在不知道程式碼怎麼寫出來的前提下審查。', [
        '對作法沒有立場，抓得到原作者看不見的東西',
        '開 PR 前那套子代理程式碼審查在這裡一樣管用'
      ]]
    ],
    workflow: [
      '無人值守的執行一律設 auto，不用 bypass。',
      '結束後先跑 /code-review 走過變更。',
      '再親自讀 git diff。',
      '對照計畫，刻意找計畫外被動到的檔案。',
      '掛 Stop hook：測試失敗就 exit 2、不准結束。',
      '掛 PostToolUse hook：編輯後 lint 與型別檢查。',
      '重要變更再開一個乾淨子代理冷審一次。',
      'headless 執行用 JSON 結果與退出碼驗收。'
    ],
    example: '一次整夜的無人值守執行結束，Claude 給你一份漂亮的摘要。正確順序是不看摘要，先 /code-review 再讀 git diff，結果發現它動了計畫外的檔案。同時 Stop hook 已經跑過測試，失敗時以 exit 2 把錯誤餵回去讓它自己修。最後開一個乾淨的子代理再審一次。',
    pitfalls: [
      '從摘要開始驗收，摘要乾淨不代表程式碼乾淨。',
      '把 auto 的分類器當成品質保證。',
      '相信「我跑過測試了」，卻沒寫成 Stop hook。'
    ]
  },
  '486939': {
    tldr: 'Plugin 會用你的權限跑程式碼，安裝前一定先讀。',
    overview: 'Plugin 把 .claude 目錄打包成一個可安裝單位。用別人的，重點是安裝前先讀。打包自己的，重點是按慣例排好目錄。',
    concepts: [
      ['Plugin 是一個可安裝單位', '它把原本要手動分享的東西綁在一起。', [
        'skills、subagents、hooks',
        'MCP server 設定與其他零碎配置',
        'plugin 放在哪，決定你怎麼安裝',
        '工作階段內按名稱裝：/plugin install org-name@plugin-name',
        '裝完 Claude Code 會提示執行 /reload-plugins 套用'
      ]],
      ['團隊用私有 marketplace', '與其一個個裝，團隊更適合加一次私有 marketplace。', [
        '指令：/plugin marketplace add your-org/claude-plugins',
        '之後所有安裝都透過它解析',
        '取得集中式的探索、版本追蹤與更新',
        '可以從 Discover 分頁瀏覽現有 plugin'
      ]],
      ['安裝前先讀，這是最重要的一段', 'Plugin 會用你的權限在你的機器上執行程式碼。', [
        '它的 hooks 會在每個匹配的工具呼叫上觸發',
        '社群 plugin 可能夾帶每次都往外部端點發請求的 Stop hook，你的設定不會提醒你',
        '先看 Claude Code 列出的安裝內容與脈絡成本估計',
        '那裡也明白寫著 Anthropic 不背書',
        '站內提交表單經 Anthropic 自動審查後發布到社群 marketplace',
        '官方 marketplace 是獨立策展的軌道',
        '經過審查不等於可信任'
      ]],
      ['元件是並存不是覆蓋', 'Plugin 不會覆寫你的設定，它的元件跟你的並行執行。', [
        'hooks 會疊加：plugin 的 PreToolUse 和你的各跑一次，互不取代',
        'skills、agents、commands 用 plugin 名稱做命名空間，不會撞名',
        'plugin 可以帶一個範圍很窄的 settings.json',
        'settings.json 的 agent 鍵要特別留意：設了它等於把某個 subagent 連同系統提示、工具限制與模型提升到主執行緒'
      ]],
      ['打包自己的 plugin 靠慣例', '不必重構任何東西，Claude Code 是按慣例探索元件的。', [
        '一個技能一個資料夾',
        'subagents 底下一個 markdown 檔對應一個子代理',
        'hooks/hooks.json 與 .mcp.json 放在 plugin 根目錄',
        'manifest 選填，只有 name 必填，version、description、author 可有可無',
        '要像任何相依套件一樣做版本管理'
      ]]
    ],
    workflow: [
      '團隊層級先加一次私有 marketplace。',
      '安裝前打開 plugin 詳情，逐項確認它帶了什麼。',
      '順便看一眼脈絡成本估計。',
      '來源可信才執行 /plugin install。',
      '再依提示執行 /reload-plugins。',
      '裝完從 plugin 面板檢視它加了什麼。',
      '要打包自己的，就按慣例排好目錄。',
      '加上 manifest，給一個版本號。'
    ],
    example: '課文的 manifest 範例是一個叫 svg-splitter-review 的 plugin。裡面寫 version 0.1.0、description 是 Reviews the SVG Splitter repo、author 名為 Lewis Menelaws。只有 name 必填，其他選填，但版本號值得像相依套件一樣認真維護。',
    pitfalls: [
      '把「通過自動審查」當成可信任，來源仍要自己把關。',
      '沒意識到 plugin 的 hooks 會跟你的疊加執行。',
      '沒察覺 agent 鍵能把子代理提升到主執行緒。',
      '打包時想重構整個專案結構，其實按慣例擺好就夠。'
    ]
  },
  '487234': {
    tldr: '考的是各機制的界線，不是背指令。',
    overview: '課程最後的綜合測驗，檢查前面九堂連不連得起來。考的不是記憶單一指令。是分辨界線：什麼該寫成指引、什麼必須是強制。',
    concepts: [
      ['指引與強制的分界', 'CLAUDE.md 與 skill 都是指示，hook 才是會執行、擋得下動作的程式碼。', [
        '凡是「絕不能被跳過」的規則，答案都是 hook'
      ]],
      ['權限模式對應情境', '照「有沒有人在旁邊」去對應就不會錯。', [
        'manual、accept edits、plan：shift-tab 循環的日常三種',
        'auto：有人在旁邊放手跑',
        'don’t ask：無人值守的 CI 與排程',
        'bypass permissions：只限隔離容器或 VM'
      ]],
      ['退出碼與 hook 事件', '兩個地方最常被考錯：退出碼語意，還有壓縮後補脈絡掛哪裡。', [
        'exit 0 成功',
        'exit 2 阻擋',
        'exit 1 不阻擋',
        '壓縮後重新注入脈絡用帶 compact matcher 的 SessionStart，不是 PostCompact'
      ]],
      ['自動化光譜由上而下', '預設從 routines 起步，真的需要更多控制才往下走。', [
        'Routines：託管、最多每小時、只能推 claude/ 分支',
        'headless -p：跑自己的環境，會略過自動探索',
        '--bare：CI 確定性',
        'Agent SDK：放進自己的產品'
      ]],
      ['驗證的比例原則', '放手越多、驗證越重。', [
        '無人值守留在 auto',
        '先讀 diff 再讀摘要',
        '把測試寫成會擋住回合的 Stop hook',
        '重要變更找一個無記憶的第二意見'
      ]]
    ],
    workflow: [
      '作答前先把每題歸類到某一堂。',
      '「這條規則放哪」先判斷是慣例、流程還是硬線。',
      '再對應到 CLAUDE.md、skill 或 hook。',
      '情境題先問「有沒有人在旁邊」。',
      '然後決定權限模式與自動化層級。',
      'hook 題先確認事件時機與退出碼語意。',
      '答錯就回課堂重讀，不要背答案。'
    ],
    example: '典型題型例如：要確保 Claude 絕不會 push 到 main，該寫在哪裡？答案是 hook，因為 CLAUDE.md 只是指引。另一題：hook 想擋下一個指令該用哪個退出碼？答案是 2，不是看起來像錯誤的 1。',
    pitfalls: [
      '把「通常會照做」當成「一定會照做」。',
      '混淆 auto 與 bypass 這兩種模式。',
      '混淆 PostCompact 與 SessionStart。',
      '混淆 exit 1 與 exit 2 的差別。',
      '只背指令字面，情境改寫過就答不出來。'
    ],
    source: '本堂為課程測驗（Course Quiz），頁面內容僅回傳「Loading...」無法取得題目。以上依本課程前九堂實際教材的重點與常見易混淆處整理，供複習用，非官方題目內容。'
  },
});
