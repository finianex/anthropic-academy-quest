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
    overview: '這堂談的是長時間工作階段（long session）該怎麼駕馭：跨十幾個檔案的重構、從零蓋一個功能，跟「叫 Claude 順手做件小事」完全是兩回事。整堂課歸納成兩個習慣——動工前先界定範圍，執行中持續修正方向——再介紹 compact、rewind、goal、loop、worktree 這幾樣具體工具。',
    concepts: [
      ['先用 plan mode 界定範圍', 'Plan 模式下 Claude 只讀不寫，先把程式碼看過、判斷哪裡要改，然後把計畫交給你。計畫拿到手要真的讀完、不要只掃過；計畫愈周全，執行時的意外愈少，有缺漏當場叫它補。'],
      ['/compact 要帶指示', 'Compact 會把對話濃縮成摘要、拿摘要當新脈絡、再刪掉舊訊息。命令後面接的文字決定摘要保留什麼，例如 `/compact Focus on the --version flag implementation`。單獨打 /compact 等於放棄這個方向盤。'],
      ['Rewind 是回到檢查點', '每一次使用者提示都會建立一個檢查點。Rewind 選單提供五種操作：還原程式碼與對話、只還原對話、只還原程式碼、summarize from here（壓縮檢查點之後）、summarize up to here（壓縮檢查點之前、保留實作段落）。'],
      ['Goal 與 Loop 讓它更自主', 'Goal 設定的是完成條件，例如 `/goal all tests in src/billing pass, and the type checker reports zero errors`，由一個快速評估器判定是否達標，未達標就繼續做；取消用 `/goal clear`。Loop 則是在回合之間依固定或自訂節奏重跑同一段提示，適合輪詢 CI 或部署狀態，按 escape 停止。'],
      ['Worktree 讓多個 agent 不互相踩踏', '同一個 repo 跑多個 agent，等於一台車兩個方向盤。Worktree 讓每個工作階段擁有獨立的檔案樹，彼此不會覆蓋對方的修改；工作階段結束時乾淨的 worktree 會自動移除。repo 根目錄的 `.worktreeinclude` 可以列出要複製進每個 worktree 的 git-ignored 檔案，例如環境變數檔。']
    ],
    workflow: [
      '進 plan mode，讓 Claude 只讀程式碼並產出計畫。',
      '逐行讀計畫，有缺漏或方向錯就當場要求修改，確認後才放行執行。',
      '執行中脈絡快滿時，用帶指示的 /compact 指定摘要要留下哪一塊。',
      '發現走偏就開 rewind 選單，依情況選擇還原程式碼、對話或兩者。',
      '若「完成」比「步驟」更好描述，就下 /goal；要平行推進多條線時改用 worktree。'
    ],
    example: '課程舉的例子是實作 --version 旗標：對話拉長後不要裸打 /compact，而是 `/compact Focus on the --version flag implementation`，讓摘要留住這條線索。目標型的工作則寫成 `/goal all tests in src/billing pass, and the type checker reports zero errors`，讓 Claude 一直做到評估器確認通過。',
    pitfalls: [
      '拿到計畫只掃一眼就放行——計畫沒讀透，後面的意外全都會回來找你。',
      '單獨執行 /compact，沒有在後面補上要保留的重點，導致關鍵細節被摘要掉。',
      '走偏時繼續用提示「講回來」，而不是直接 rewind 到檢查點；也常忘記可以只還原程式碼或只還原對話。'
    ]
  },
  '486929': {
    overview: '幾乎每個人都會踩到同一個陷阱：CLAUDE.md 愈長愈肥。這堂的核心是 CLAUDE.md 是「指引」不是「強制設定」，每一行都在跟其他行搶注意力，所以先判斷規則該不該寫在這裡，再談四個存放位置、import 拆檔，以及怎麼下筆才讓規則真的被遵守。',
    concepts: [
      ['指引 vs. 強制', '「絕不 push 到 main」寫進 CLAUDE.md，只是期待 Claude 讀到並照做——大多數時候會，但「大多數時候」不算保證。硬規則要放進 hook，因為 hook 是在動作前執行的程式碼，可以真的擋下來。'],
      ['四個存放位置', 'CLAUDE.md 有四層，啟動時全部一起載入：managed policy（平台團隊控管的組織層）、user（跟著你這台機器、跨所有專案的個人偏好）、project（進版控、與團隊共用）、local（不進 git，只屬於你在這個 repo 的私人筆記）。local 最常被忽略但很好用。'],
      ['用 import 拆檔，但不會省脈絡', '專案檔太長時用路徑匯入語法拆開，例如 @.claude/conventions/code-style.md、@.claude/conventions/testing.md、@.claude/conventions/workflow.md。要記得這只是整理結構，並不會減少載入的脈絡量。'],
      ['規則要具體、可檢查', '「遵循最佳實務」這種句子連你自己都說不清標準。反例：「Follow best practices for API routes.」；正例：「Put new API routes in src/api/handlers, one per file.」——後者明確到可以驗證。'],
      ['禁止時要指名替代方案，強調是有預算的', '「Don\'t use default exports.」留了空白；「Use named exports, not default exports.」把替代方案講死。另外 IMPORTANT、YOU MUST 這類字確實會拉高優先度，但那是一種預算——全篇都強調等於沒有強調，只留給最關鍵的幾條。']
    ],
    workflow: [
      '寫規則前先問：這是指引還是不可跨越的硬線？硬線改寫成 hook。',
      '依適用範圍挑層級：組織用 managed policy、個人用 user、團隊共用用 project、只有自己要的用 local。',
      '專案檔變長就用 @ 匯入拆成 conventions 系列檔，但別誤以為脈絡因此變小。',
      '把每條規則改寫成具體可檢查的句子，並指名替代作法而非只禁止。',
      'Claude 做錯時回頭修 CLAUDE.md，把它當持續維護的產品程式碼。'
    ],
    example: '課程用 API 路由當對照：把「Follow best practices for API routes.」改寫成「Put new API routes in src/api/handlers, one per file.」；把「Don\'t use default exports.」改寫成「Use named exports, not default exports.」——同一件事，後者才有辦法照著做也照著查。',
    pitfalls: [
      '把「絕不 push 到 main」這種硬規則寫在 CLAUDE.md 就以為安全了，實際上沒有任何東西會擋下這個動作。',
      '以為用 import 拆檔就等於減少脈絡消耗；拆檔只改善組織，載入量不變。',
      '每條規則都加 IMPORTANT / YOU MUST，把強調預算花光，結果真正重要的那幾條反而不突出。'
    ]
  },
  '486930': {
    overview: '專案一長大就會出現重複性工作，而這堂主張「第一個該做的技能是驗證技能（verification skill）」。重點不在技能怎麼寫，而在為什麼驗證這件事最值得自動化：因為它現在完全依賴你記得去檢查。順帶釐清 CLAUDE.md、skill、hook 三種指令介面各自該負責什麼。',
    concepts: [
      ['驗證不該依賴你的記性', '平常的流程是：叫 Claude 重構、它說完成了，然後你得記得回頭複查、記得叫它跑測試。驗證技能把這個依賴拿掉——技能的 description 一被匹配就自動觸發，每次都走同一套步驟。'],
      ['驗證技能的四個步驟', '跑測試套件、讀 diff、確認沒有為了讓測試通過而偷偷放寬測試、回報通過或失敗並附上證據。第三步是關鍵：測試變綠燈不等於正確，測試本身可能被鬆綁。'],
      ['技能資料夾不只有 skill.md', '旁邊可以放 reference.md 收詳細材料，由 skill.md 連過去，Claude 只在真的需要深度時才讀；也可以放腳本（例如 check.sh），Claude 是執行它而不是把內容載進脈絡，等於技能自帶工具。'],
      ['skill.md 要瘦', '主檔負責描述「要做什麼」，長篇解說與可執行腳本推到側檔。技能本身是一個資料夾加一個 skill.md：名稱、觸發用的 description、以及流程本身；平常只有 description 進脈絡。'],
      ['三個介面的分工', '隨時適用的慣例（命名規則、檔案放哪）屬於 CLAUDE.md；綁定特定任務類型的流程與參考資料屬於 skill；「Claude 絕不能跳過」的規則屬於 hook，因為前兩者是 Claude 去遵守的指示，hook 才是會執行的程式碼。']
    ],
    workflow: [
      '先建驗證技能：一個資料夾、一個 skill.md，description 寫成能被重構／修改類任務觸發的樣子。',
      '在流程裡依序寫下跑測試、讀 diff、檢查測試有無被放寬、輸出結論與證據。',
      '把冗長說明搬到 reference.md，把可執行檢查搬到腳本（如 check.sh），讓 skill.md 保持精簡。',
      '把同樣形狀套用到其他重複流程：發版檢查清單、遷移作業、開 PR 前檢查。',
      '遇到「不能被跳過」的規則時，改放到 hook，不要塞回技能或 CLAUDE.md。'
    ],
    example: '你請 Claude 重構一段程式碼。它完成後，這次變更符合驗證技能的 description，技能自動觸發：跑測試、讀 diff、確認沒有為了通過而把某個測試鬆綁，最後把通過或失敗連同證據回報給你——整串流程你一句話都沒說。',
    pitfalls: [
      '把測試全綠當作驗證完成，忽略測試可能被悄悄放寬到怎樣都會過。',
      '把所有細節塞進 skill.md，讓主檔臃腫；該進 reference.md 或腳本的東西沒有搬出去。',
      '把「絕不能跳過」的規則寫成技能流程，以為就有強制力；那種規則必須是 hook。'
    ]
  },
  '486932': {
    overview: '權限模式（permission mode）讓你一次決定 Claude 可以在不問你的情況下執行哪些事，而不是一個提示一個提示地批准。這堂把六種模式攤開講清楚各自的界線，重點放在 auto 模式的分類器（classifier）能擋什麼、不能擋什麼，以及不同情境該選哪一種。',
    concepts: [
      ['六種模式', 'Manual：只讀，其餘一律先問。Accept edits：讀取、檔案編輯與常見檔案系統 bash 指令直接跑，適合先做後審。Plan：只讀，只研究與提案、不動檔案。Auto：全部接受，但每個動作執行前由另一個分類器模型審查。Don\'t ask：只允許事先核可的工具，其餘無提示直接拒絕。Bypass permissions：略過所有檢查。'],
      ['shift-tab 循環', '日常那幾種不用記指令，按 shift-tab 就會在 manual、accept edits、plan 之間循環，剩下的模式再另外指定。'],
      ['Auto 擋的是什麼', '設計上要擋的是：正式環境部署與資料庫遷移、強制推送或把下載內容直接管進 shell、把敏感資料送到外部端點、刪掉工作階段才有的檔案。放行的是日常工作：專案內的本機編輯、依 lock 檔安裝相依套件、唯讀請求、推到自己的分支。'],
      ['分類器只看意圖，不看正確性', '分類器判斷的是動作危不危險，不是程式碼對不對。所以 auto 模式要搭配 stop hook 跑測試：auto 在執行前守住意圖，stop hook 在結束後守住正確性，一前一後。'],
      ['Don\'t ask 給無人值守的場景', '沒有人在旁邊按核可的時候就用 don\'t ask：CI pipeline、排程任務、整夜批次。Bypass permissions 則只適合隔離的容器或虛擬機，它等同 dangerously-skip-permissions。']
    ],
    workflow: [
      '日常互動用 shift-tab 在 manual / accept edits / plan 之間切換。',
      '需要放手讓它連續跑時切到 auto，讓分類器逐一審查動作。',
      '同時掛上 stop hook 執行測試，補上分類器不管的正確性那一半。',
      'CI、排程、整夜批次等無人值守情境改用 don\'t ask，只開放事先核可的工具。',
      '只有在隔離容器或 VM 裡才考慮 bypass permissions。'
    ],
    example: '整夜跑一批重構：模式選 auto，分類器會攔下強制推送、正式環境遷移這類動作，同時放行本機編輯與推到自己分支；再加一個 stop hook 跑測試，Claude 想結束回合時測試沒過就不准結束。若這批工作是排在 CI 裡沒人看著，就改成 don\'t ask。',
    pitfalls: [
      '以為 auto 模式的分類器會幫你抓錯誤程式碼——它只看動作是否危險，正確性得靠 hook 與測試。',
      '在無人值守的 CI 或排程裡用 bypass permissions，而不是 don\'t ask；bypass 只該出現在隔離容器或 VM。',
      '只在本機開發機上習慣性按 shift-tab，卻沒替不同任務挑對模式，結果不是一直被打斷、就是放行過頭。'
    ]
  },
  '486933': {
    overview: 'CLAUDE.md 裡的指示是請求不是保證，Hooks 就是把「通常會照做」變成「一定會照做」的機制。這堂介紹 Claude Code 在一個工作階段中會觸發的約 30 個 hook 事件裡最該熟的那幾個、PreToolUse 回傳 JSON 決策的寫法、退出碼的語意，以及比「直接擋下」更聰明的做法：改寫（redact）。',
    concepts: [
      ['值得記住的事件', 'PreToolUse 在工具呼叫前觸發，是強制力的核心，可以在事情發生前擋下來。PostToolUse 在工具呼叫成功後觸發，通常拿來自動格式化或 lint。Stop 在 Claude 想結束回合時觸發，條件沒滿足就可以拒絕（子代理對應 SubagentStop）。PreCompact / PostCompact 在壓縮前後觸發。InstructionsLoaded 在 CLAUDE.md 或規則檔載入時觸發。SessionStart 在開場時觸發、負責預備環境，只想在全新啟動時跑就用 startup 來源。'],
      ['壓縮後要重新注入脈絡別用 PostCompact', '這是常見的誤區。要在壓縮後把脈絡塞回去，該用帶 compact matcher 的 SessionStart，那個才會讓輸出真的進到脈絡裡。'],
      ['PreToolUse 的 JSON 決策', '印出 JSON 並以 0 退出來回話，關鍵欄位是 permissionDecision：allow 放行、deny 擋下、ask 交回使用者決定。還有第四個值 defer，只適用於非互動的 -p 執行，由呼叫端暫停工具再恢復，很少用到。'],
      ['退出碼的語意', '0 代表成功（標準輸出若是 JSON 會被解析；純文字多數事件會被忽略，但在 SessionStart、UserPromptSubmit、UserPromptExpansion 會被加入脈絡）。2 是阻擋型錯誤，標準錯誤會被餵回給 Claude 當脈絡。最容易搞錯的是 1——看起來像錯誤，但不會阻擋，指令照跑。要擋就用 2。'],
      ['與其擋下，不如改寫', 'PreToolUse 的 JSON 有 updatedInput，可以改寫呼叫而不是拒絕它，例如把 bash 指令裡的密鑰洗掉再放行。注意 updatedInput 是整體取代，不是局部合併。']
    ],
    workflow: [
      '先確認這條規則屬於「必須被強制」的類型，才寫成 hook。',
      '挑事件：事前攔截用 PreToolUse、事後格式化用 PostToolUse、把關收尾用 Stop。',
      'PreToolUse 用 matcher 指定要監看的工具（例如 Bash），必要時再用 if 條件縮小範圍。',
      '決定回應方式：需要細緻決策就印 JSON 設定 permissionDecision，簡單情境用退出碼（擋下一律用 2，不要用 1）。',
      '危險但不必全擋的情況，改用 updatedInput 重寫指令（例如洗掉密鑰）後放行。'
    ],
    example: '對 Bash 工具掛一個 PreToolUse 守門員：matcher 選中 Bash，if 條件再縮小到特定情境。直覺作法是回傳 deny 直接擋掉危險呼叫；更實用的作法是回傳 updatedInput，把指令裡的密鑰洗掉後讓它照跑——指令仍然執行，只是變乾淨了。',
    pitfalls: [
      '想擋卻用了退出碼 1；1 不阻擋，指令照樣執行，該用 2。',
      '想在壓縮後補回脈絡卻掛在 PostCompact，正確作法是 SessionStart 搭配 compact matcher。',
      '想靠 PostToolUse 阻擋危險動作——它在工具已經執行完才觸發，來不及。'
    ]
  },
  '486935': {
    overview: '信任 Claude 能做某件事之後，下一步就是不再手動做它。這堂把自動化排成一條光譜：一端是跑在 Anthropic 託管基礎設施上的 routines，另一端是跑在你自己環境的 headless 模式與 Agent SDK，中間還有給 CI 用的確定性模式。重點是知道每一段適合什麼工作。',
    concepts: [
      ['Routines：一個會自己跑的儲存提示', 'Routine 綁定三樣東西：提示、它作用的 repo、需要的 connector，再加上排程。沒有腳本、沒有伺服器、沒有 workflow 檔要維護，機器是 Anthropic 的。觸發方式有 cron 排程（例如每天早上 9 點）、對它的 API 端點發 HTTP POST、或 GitHub 事件（例如新 PR 進來）。'],
      ['Routines 的三個限制', '目前是研究預覽（research preview）；週期性排程最密只能每小時一次；每次執行都從預設分支的全新 clone 開始，而且只能推到 claude/ 前綴的分支，除非你對該 repo 放寬。'],
      ['Headless 模式與 -p', '需要跑在自己的環境時用 headless，核心是 -p（--print）旗標，例如 `claude -p "summarize the changes in this diff"`。要注意 -p 會略過 hooks、skills、plugins、MCP servers 與 CLAUDE.md 的自動探索。'],
      ['結構化輸出與跨步驟工作階段', '用 --output-format json 搭配 --json-schema，符合 schema 的物件會落在回應的 structured_output 欄位，可以直接 jq 取用。多步驟工作不必擠進一個指令，可以用 `claude --resume "$(jq -r .session_id /tmp/plan.json)"` 接續同一個工作階段。'],
      ['--bare 與 Agent SDK', 'CI 需要每次結果都一致時，用 --bare 進入確定性模式。光譜最末端是 Agent SDK：把 Claude Code 放進你自己的應用，兩種語言都提供 query 函式與跟 CLI 相同的原語，你可以設定 allowedTools、系統提示與權限模式，然後迭代處理串流回來的訊息。']
    ],
    workflow: [
      '先問這件事是不是「同一段提示 + 週期性觸發」；是的話預設選 routine。',
      '建立 routine：從 claude.ai/code/routines 網頁建，或在終端機裡用 /schedule（例如 `/schedule daily dependency audit at 9am`）。',
      '需要跑在自己的 pipeline、要把資料管進腳本時，降一階用 headless 的 -p。',
      '需要結構化結果就加 --output-format json 與 --json-schema，再用 jq 取 structured_output。',
      'CI 要求每次結果一致就加 --bare；工作本身屬於你的產品功能時才升級到 Agent SDK。'
    ],
    example: '課文的抽取範例：`claude -p "Extract the exported function names from src/core/style.js" --output-format json --json-schema \'{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}\' | jq \'.structured_output.functions\'`，直接拿到一個乾淨的函式名稱陣列往下傳。日常面則是每天早上的相依套件稽核，或 PR 一開就啟動的分流 routine。',
    pitfalls: [
      '期待 routine 每幾分鐘跑一次——週期性排程最密只有每小時；也常忘記它只能推到 claude/ 前綴的分支。',
      '在 -p 底下以為 hooks、skills、plugins、MCP 與 CLAUDE.md 會照常載入，實際上 -p 會跳過自動探索。',
      '一開始就跳到 Agent SDK 或自架 pipeline；應該從 routine 起步，真的需要更多控制時才往光譜下游走。'
    ]
  },
  '486936': {
    overview: 'Pull request 是最適合交棒重複性工作的地方。這堂比較兩條路：Anthropic 託管的 Code Review 服務，以及自己組裝的 GitHub Action（anthropics/claude-code-action@v1）。前者零建置但只發表意見，後者要寫 workflow 但什麼都能做。',
    concepts: [
      ['Code Review：託管路線', '透過 Claude GitHub app 審查 PR，沒有東西要你建或託管。組織管理員在 Claude Code admin settings 的 Code review 區塊按 Configure 接上 repo，安裝 GitHub app、選擇監看哪些 repo、決定何時執行：PR 開啟時跑一次、每次推送都跑、或只有人留言 @claude review 時才跑。'],
      ['審查是對照整個 codebase', '啟用後全部跑在 Anthropic 的基礎設施上，一組審查代理會把 diff 放進整個 codebase 的脈絡分析，而不是孤立地看改動行。發現的問題會以 Claude 的留言直接落在該行，附上說明與建議修法，而且會去重並排序。'],
      ['託管路線的邊界', '它永遠不會核准或阻擋 PR；沒有託管的自動修復，服務只張貼發現；目前是研究預覽，提供給 team 與 enterprise 方案，行為還會變動。要套用某個發現，是在本機動手。'],
      ['GitHub Action：自己組', '設定從 Claude Code 裡開始。Action 本身是 anthropics/claude-code-action@v1，常用輸入有：anthropic_api_key（選填）、github_token（預設 secrets.GITHUB_TOKEN）、trigger_phrase（留言中要監聽的字串，預設 @claude）、use_bedrock / use_vertex（切換供應商）、prompt（這次執行的指示）、claude_args（直接傳給 Claude Code 的 CLI 參數字串）。'],
      ['用 claude_args 調校', '例如 `--max-turns 5` 對 agent 迴圈設硬上限、指定權限模式、限定允許的工具。範例的 claude_args 是 "--max-turns 5 --model claude-sonnet-5"。']
    ],
    workflow: [
      '先判斷需求：只要 PR 審查就走託管的 Code Review。',
      '請組織管理員在 admin settings 啟用、安裝 GitHub app、挑 repo、選擇觸發時機（開 PR、每次推送、或 @claude review）。',
      '需要「審查以外」的事（實作、排程彙整）才建 GitHub Action。',
      '把 workflow 放進 .github/workflows/claude.yaml，設定 anthropic_api_key、github_token、trigger_phrase、prompt。',
      '用 claude_args 收緊執行邊界（如 --max-turns 5、模型、權限模式、允許工具），並在 Actions 分頁觀察每一步。'
    ],
    example: '在 .github/workflows/claude.yaml 放上 anthropics/claude-code-action@v1，trigger_phrase 設 "@claude"、claude_args 設 "--max-turns 5 --model claude-sonnet-5"。之後有人在 PR 留言「@claude implement the spec in the linked Linear issue」，action 就會接手。同一個 action 也能改成排程執行，做每日彙整。',
    pitfalls: [
      '以為託管 Code Review 會幫你把 PR 擋下來或自動修好——它不核准、不阻擋，也沒有託管的 autofix，只張貼發現。',
      '需求只是 PR 審查卻先跑去寫 GitHub Action，白花力氣維護 workflow。',
      '寫 action 時沒設 --max-turns 之類的上限，讓 agent 迴圈有機會一直跑下去。'
    ]
  },
  '486938': {
    overview: '任務交出去、沒有盯著每一步，Claude 說做完了——出貨前你得驗證一件自己沒看見的事。這堂的原則只有一句：驗證的強度要跟你放手的程度成正比。做法上依序是：把無人值守的執行留在 auto 模式、從 diff 而不是摘要看起、把測試變成 hook 關卡、再找一個沒有立場的第二意見。',
    concepts: [
      ['驗證與放手程度成正比', '短工作階段裡你看著訊息滾過去，掃一眼就夠；越是沒看著的執行，越要認真檢查。'],
      ['無人值守用 auto，不要用 bypass', '在工作環境跑無人值守時保持 auto 模式，分類器仍會逐一審查動作的危險性，這是一張安全網。但要清楚它的界線：分類器從不判斷程式碼是否正確，只標記危險動作，正確性得靠你的驗證環節。'],
      ['先看 diff，不要先看摘要', '不要從 Claude 的完成報告開始。先用 /code-review 走過變更並標出問題，再親自看 git diff。陷阱正是那種讀起來完美的摘要，配上一份動到你根本沒預期檔案的 diff。先讀計畫內的檔案，再找計畫外的東西。'],
      ['把測試變成關卡而不是承諾', '真正的關卡是測試有沒有通過、以及 Claude 是不是真的跑了而不只是聲稱跑了。用兩個 hook：Stop hook 跑測試，失敗就不准結束回合；PostToolUse hook 每次編輯後做 lint 與型別檢查。關鍵在退出碼——exit 2 會把失敗直接餵回給 Claude，它會自己去修。'],
      ['冷靜的第二意見', '開 PR 前那套子代理程式碼審查在這裡一樣管用：開一個全新工作階段或子代理，讓它在完全不知道這些程式碼怎麼寫出來的前提下審查變更。因為對作法沒有立場，它抓得到原作者看不見的東西。']
    ],
    workflow: [
      '無人值守的執行一律設定在 auto 模式，不用 bypass permissions。',
      '執行結束後先跑 /code-review 走過變更，再親自讀 git diff。',
      '對照計畫：先看預期內的檔案，再刻意找計畫之外被動到的地方。',
      '掛上 Stop hook（測試失敗就 exit 2、不准結束）與 PostToolUse hook（每次編輯後 lint 與型別檢查）。',
      '重要的變更再開一個全新工作階段或子代理，做一次無記憶的冷審查；headless 執行則用 JSON 結果與退出碼驗收。'
    ],
    example: '一次整夜的無人值守執行結束，Claude 給你一份漂亮的摘要。正確的順序是：不看摘要，先 /code-review、再讀 git diff，發現它動了計畫外的檔案；同時 Stop hook 已經跑過測試，失敗時以 exit 2 把錯誤餵回去讓它自己修；最後開一個乾淨的子代理再審一次。',
    pitfalls: [
      '從 Claude 的摘要開始驗收——摘要寫得再乾淨也不是程式碼乾淨的證據。',
      '把 auto 模式的分類器當成品質保證；它只看動作危不危險，不看程式碼對不對。',
      '相信「我跑過測試了」這句話，而沒有把測試寫成會擋住回合結束的 Stop hook。'
    ]
  },
  '486939': {
    overview: '一套你信得過的設定，讓整個團隊都跑起來才有真正的價值，難的是怎麼搬。Plugin 就是把 .claude 目錄打包成一個可安裝單位。這堂分兩面講：一是使用別人發布的 plugin（重點是安裝前先讀），二是把自己的東西打包出去（重點是目錄結構本身就完成大半工作）。',
    concepts: [
      ['Plugin 是一個可安裝單位', '它把原本要手動分享的東西綁在一起：skills、subagents、hooks、MCP server 設定，以及其他零碎配置。Plugin 放在哪決定你怎麼安裝，工作階段內可以直接按名稱安裝：`/plugin install org-name@plugin-name`，安裝完 Claude Code 會提示你執行 /reload-plugins 套用。'],
      ['團隊用私有 marketplace', '與其一個個裝，團隊更適合加一次私有 marketplace：`/plugin marketplace add your-org/claude-plugins`。之後所有安裝都透過它解析，取得集中式的探索、版本追蹤與更新；可以從 Discover 分頁瀏覽現有 plugin。'],
      ['安裝前先讀——這是最重要的一段', 'Plugin 會用你的權限在你的機器上執行程式碼，它的 hooks 會在每個匹配的工具呼叫上觸發。一個社群 plugin 可能夾帶一個每次都往外部端點發請求的 Stop hook，而你的設定裡不會有任何東西提醒你。安裝前先看 Claude Code 列出的安裝內容與脈絡成本估計，那裡也明白寫著 Anthropic 不背書。而且「經過審查」不等於「可信任」：站內提交表單會在 Anthropic 的自動審查後發布到社群 marketplace，官方 marketplace 則是獨立策展的軌道。'],
      ['元件是並存不是覆蓋', 'Plugin 不會覆寫你的設定，它的元件跟你的並行執行。Hooks 會疊加——plugin 的 PreToolUse 和你自己的 PreToolUse 在每次工具呼叫都會各跑一次，互不取代。Skills、agents、commands 會用 plugin 名稱做命名空間，所以不會撞名。Plugin 也可以帶一個範圍很窄的 settings.json，其中 agent 這個鍵要特別留意：設了它等於把 plugin 的某個 subagent（連同系統提示、工具限制與模型）提升到主執行緒。'],
      ['打包自己的 plugin 靠慣例', '不必重構任何東西，Claude Code 是按慣例探索元件的：一個技能一個資料夾、subagents 底下一個 markdown 檔對應一個子代理、hooks/hooks.json 與 .mcp.json 放在 plugin 根目錄。另外有一個選填的 manifest，只有 name 是必填，其餘如 version、description、author 可有可無，並且要像任何相依套件一樣做版本管理。']
    ],
    workflow: [
      '團隊層級先加一次私有 marketplace（/plugin marketplace add your-org/claude-plugins），之後統一從這裡解析。',
      '安裝前打開 plugin 詳情，逐項確認它帶了哪些 hooks、skills、agents 與 MCP 設定，以及脈絡成本估計。',
      '確認來源可信後執行 /plugin install，再依提示 /reload-plugins。',
      '裝完從 plugin 面板檢視它加了什麼，必要時管理或移除。',
      '要打包自己的：確認 .claude 能用之後，按慣例排好目錄（skills 各一資料夾、agents 各一 md、hooks/hooks.json、.mcp.json），加上 manifest 並給版本號。'
    ],
    example: '課文的 manifest 範例是一個叫 svg-splitter-review 的 plugin：name「svg-splitter-review」、version「0.1.0」、description「Reviews the SVG Splitter repo」、author 名為 Lewis Menelaws。只有 name 是必填，其他都是選填，但版本號值得像相依套件一樣認真維護。',
    pitfalls: [
      '把「通過自動審查」當成可信任；審查抓得到一部分問題，不是全部，來源仍要自己把關。',
      '沒意識到 plugin 的 hooks 會與你自己的 hooks 疊加執行，也沒察覺 settings.json 的 agent 鍵可以把它的子代理提升到主執行緒。',
      '打包時想著要重構整個專案結構；其實按既有慣例擺好目錄就夠，manifest 也只有 name 必填。'
    ]
  },
  '487234': {
    overview: '課程最後的綜合測驗，用來檢查前面九堂的觀念是否連得起來。考的不是記憶單一指令，而是分辨各機制的界線：什麼該寫成指引、什麼必須是強制，以及放手多少就要驗證多少。',
    concepts: [
      ['指引與強制的分界', 'CLAUDE.md 與 skill 都是 Claude 去遵守的指示，hook 才是會實際執行並能阻擋動作的程式碼。凡是「絕不能被跳過」的規則，答案都是 hook。'],
      ['權限模式對應情境', 'Manual、accept edits、plan 是 shift-tab 循環的日常三種；auto 適合有人在旁邊放手跑；don\'t ask 給無人值守的 CI 與排程；bypass permissions 只限隔離容器或 VM。'],
      ['退出碼與 hook 事件', 'exit 0 成功、exit 2 阻擋、exit 1 不阻擋（最常被考錯的一題）；壓縮後要重新注入脈絡是用帶 compact matcher 的 SessionStart，不是 PostCompact。'],
      ['自動化光譜由上而下', 'Routines（託管、最多每小時、只能推 claude/ 分支）→ headless -p（跑自己的環境，會略過自動探索）→ --bare（CI 確定性）→ Agent SDK（放進自己的產品）。預設從 routines 起步。'],
      ['驗證的比例原則', '放手越多、驗證越重：無人值守留在 auto、先讀 diff 再讀摘要、把測試寫成會擋住回合的 Stop hook、重要變更找一個無記憶的第二意見。']
    ],
    workflow: [
      '作答前先在腦中把每題歸類到某一堂：長工作階段、CLAUDE.md、skills、權限、hooks、自動化、GitHub、驗證、plugins。',
      '遇到「哪裡放這條規則」的題目，先判斷它是慣例、流程還是硬線，分別對應 CLAUDE.md、skill、hook。',
      '遇到情境題先問「有沒有人在旁邊」，再決定權限模式與自動化層級。',
      '遇到 hook 題先確認事件時機（事前 / 事後 / 收尾）與退出碼語意。',
      '答錯的題目回到對應課堂重讀該段，把觀念差異補起來，而不是背答案。'
    ],
    example: '典型的題型例如：「你要確保 Claude 絕不會 push 到 main，該寫在哪裡？」——答案是 hook，不是 CLAUDE.md，因為 CLAUDE.md 只是指引；或者「hook 想擋下一個指令該用哪個退出碼？」——答案是 2，不是看起來像錯誤的 1。',
    pitfalls: [
      '把「Claude 通常會照做」當成「Claude 一定會照做」，在強制力相關的題目上選錯介面。',
      '混淆看起來相似的機制：auto 與 bypass、PostCompact 與 SessionStart、exit 1 與 exit 2。',
      '只背指令字面而不理解適用情境，遇到情境敘述改寫過的題目就答不出來。'
    ],
    source: '本堂為課程測驗（Course Quiz），頁面內容僅回傳「Loading...」無法取得題目。以上依本課程前九堂實際教材的重點與常見易混淆處整理，供複習用，非官方題目內容。'
  },
});
