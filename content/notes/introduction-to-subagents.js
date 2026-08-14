/*
 * content/notes/introduction-to-subagents.js
 * 這門課的逐課中文筆記（4 堂）。
 *
 * 一門課一個檔案：改某一門課時不會碰到其他課，多個人（或多個代理）
 * 可以同時改不同課程而不會互相覆蓋。原本全部擠在一個 393 KB 的
 * content/notes.js 裡，那個檔案已經拆掉。
 */
window.ACADEMY_LESSON_NOTES = window.ACADEMY_LESSON_NOTES || {};
Object.assign(window.ACADEMY_LESSON_NOTES, {
  '450698': {
    tldr: 'subagent 另開一個 context 做事，只把結論帶回來。',
    overview: '每次對話都在往主 context 疊東西。subagent 另外開一個獨立 context 去做，做完只帶結論回來。中間翻過的十幾個檔案不會進主對話。',
    concepts: [
      ['主 context 會被中間過程塞滿', '探索型任務會讀進大量檔案，這些中間材料沒價值卻一直佔著主 context。'],
      ['subagent 的組成', '啟動時它拿到兩樣東西，之後就自己去做。', [
        'custom system prompt：設定檔裡定義它的角色和行為',
        '任務描述：主 agent 根據你的需求寫出來的'
      ]],
      ['回傳的是摘要不是過程', '它只把需要的資訊濃縮成摘要交回主對話，中間怎麼找到的不會回灌。'],
      ['內建 subagents', '內建三個，各管一種活。', [
        'General purpose：需要探索又要動手的多步驟任務',
        'Explore：快速搜尋和程式庫導覽',
        'Plan：在 plan mode 先研究分析程式庫，再提計畫'
      ]],
      ['三個核心效益', '委派換來三件事。', [
        '把工作切成專注的小塊',
        '讓主 context 保持乾淨',
        '只帶回你真正需要的簡潔結論'
      ]]
    ],
    workflow: [
      '先問中間過程你要不要看，不用看就適合委派。',
      '看內建的 General purpose、Explore、Plan 夠不夠用。',
      '把任務講清楚，讓它在獨立 context 裡自己跑。',
      '收下摘要，主對話只留問題和答案。',
      '內建的不夠用，再建 custom subagent。'
    ],
    example: '情境是你在一個不熟的程式庫裡，想知道哪個 service 在處理退款。直接在主對話追，沿路十五個檔案全進 context。交給 subagent，主 context 只留這個問題和一段答案。',
    pitfalls: [
      '把它當成「另一個更強的 Claude」，它的價值是隔離不是升級。',
      '委派那些你其實要全程看過程的工作，摘要一壓就丟掉細節。',
      '忘了它看不到主對話，任務描述太簡略它就做偏。'
    ]
  },
  '450699': {
    tldr: '/agents 走完流程，真正決定成效的是內文那段 prompt。',
    overview: '這堂用 /agents 建一個 custom subagent。過程要選 scope、工具、模型和顏色。設定檔會落在 .claude/agents/ 底下。',
    concepts: [
      ['/agents 與 scope', '用 /agents 建立時，第一個問題是範圍。', [
        'project-level：只在目前這個專案可用',
        'user-level：這台機器上所有專案共用'
      ]],
      ['工具權限分組', '建立過程可以挑工具類別，原則是需要什麼才給什麼。', [
        '唯讀工具',
        '編輯工具',
        '執行工具',
        'MCP 工具與其他工具'
      ]],
      ['模型選擇', '四個選項，照任務深度挑。', [
        'Haiku：快速輕量的任務',
        'Sonnet：速度與深度的折衷',
        'Opus：複雜分析',
        'Inherit：沿用主對話的模型'
      ]],
      ['設定檔欄位', '檔案落在 .claude/agents/<名稱>.md，欄位各有分工。', [
        'name：唯一識別',
        'description：決定 Claude 何時派它上場',
        'tools：列出可用工具',
        'model：sonnet / opus / haiku / inherit',
        'color：UI 上的識別色'
      ]],
      ['system prompt 就是內文', 'YAML frontmatter 以下整段就是它的 system prompt，寫好寫壞差很多。']
    ],
    workflow: [
      '執行 /agents，選 project-level 或 user-level。',
      '挑工具範圍，只給這個角色真的需要的。',
      '選模型（Haiku / Sonnet / Opus / Inherit）和顏色。',
      '打開產生的 md 檔，把 system prompt 寫紮實。',
      '想自動委派就在 description 裡放 proactively。',
      '補上範例對話，再改幾行程式碼請 Claude review 測一次。'
    ],
    example: '課程建立的是 code-quality-reviewer。description 說的是：剛寫或剛改的程式碼要做品質、安全、最佳實務審查時就派它。tools 給 Bash, Glob, Grep, Read, WebFetch, WebSearch。model 用 sonnet、color 用 purple。內文把它設成專精品保、資安、專案規範的資深 code reviewer。',
    pitfalls: [
      'description 寫得含糊，Claude 就不知道何時派它。',
      '想自動委派卻沒寫 proactively，每次都得自己開口。',
      '工具給太寬，唯讀的 reviewer 也拿到 Edit 和 Write。'
    ]
  },
  '450700': {
    tldr: '定義輸出格式是最重要的一招，它給了 subagent 停止點。',
    overview: '這堂講怎麼把 subagent 設計得真的好用。四個關鍵：description、輸出格式、障礙回報、工具權限。課程明說輸出格式是最重要的改善。',
    concepts: [
      ['description 有兩個作用', '它不只決定何時啟動，也影響主 agent 寫出來的輸入提示。', [
        '作用一：決定主 agent 什麼時候啟動它',
        '作用二：影響主 agent 傳給它的輸入提示長什麼樣',
        '機制：所有可用 subagent 的 name 和 description 都進主 agent 的 system prompt'
      ]],
      ['用 description 塑造輸入提示', '在 description 裡直接要求主 agent 該給什麼，輸入提示就更具體。', [
        '例如加一句「你必須明確告訴這個 agent 要審查哪些檔案」',
        '這招對各種類型的 subagent 都適用'
      ]],
      ['輸出格式是最重要的改善', '在 system prompt 定義輸出格式，等於給它一個自然的停止點。', [
        '每段填完就知道做完了',
        '避免它無限跑下去'
      ]],
      ['障礙回報', '它過程中發現的變通做法必須寫進摘要，不然主執行緒得再踩一次。', [
        '相依性問題怎麼解',
        '某個指令需要特定 flag',
        '取得方式：在輸出格式裡明確要求'
      ]],
      ['依角色決定工具', '給多少工具，看它的角色。', [
        '研究／唯讀型：Glob、Grep、Read',
        'code reviewer：多給 Bash 才能跑 git diff，但不用 Edit、Write',
        '樣式／修改型：真的要改程式碼才給 Edit 和 Write'
      ]]
    ],
    workflow: [
      '先寫具體的 description，交代啟動時機和該傳什麼。',
      '在 system prompt 定義編號分明的輸出格式。',
      '在輸出格式裡加一段障礙回報。',
      '指名要交代環境問題、變通做法、有問題的相依套件。',
      '依角色收斂工具權限，只給真正需要的。',
      '沒被啟動就修 description，回傳不好用就修輸出格式。'
    ],
    example: '課程的 code review subagent 輸出格式共六段。Summary：審了什麼、整體評估。Critical Issues：必須立刻修的資安漏洞、資料完整性風險、邏輯錯誤。Major Issues：品質問題、架構偏離、明顯效能疑慮。Minor Issues：風格不一致、文件缺漏、小幅最佳化。第五段是 Recommendations。Approval Status 要明確說可否 merge／deploy。再加第 7 段 Obstacles Encountered，收攏環境和相依問題。',
    pitfalls: [
      '沒定義輸出格式，它就沒有停止點，容易跑太久。',
      '沒要求回報障礙，它自己解掉的問題就這樣消失了。',
      '所有 subagent 都給滿工具，唯讀角色也拿到 Edit 和 Write。'
    ]
  },
  '450701': {
    tldr: '中間過程不重要就委派，重要就留在主執行緒。',
    overview: '這堂處理什麼時候該用、什麼時候不該。判準一句話：中間過程重不重要。不重要就委派，重要就自己做。',
    concepts: [
      ['適用的共同特徵', '探索與執行可以分開時最有效。', [
        '你要的是結果，不是逐步過程',
        '探索工作會弄髒主執行緒的 context',
        '這個任務能受益於全新視角或自訂 system prompt'
      ]],
      ['研究是經典用途', '研究型 subagent 讀幾十個檔案、追函式呼叫、走過不同程式路徑，最後只回一句結論。'],
      ['code review 的隔離效果', 'Claude 把程式碼當成別人寫的時候 review 得更好，獨立 context 剛好如此。'],
      ['自訂 system prompt 才是真差異', '預設 prompt 偏簡潔、重心放在程式碼，換掉它才拉開差距。', [
        '文案型：給它語氣、受眾與風格指示',
        '樣式型：指向你的 design system 檔案'
      ]],
      ['不適用的三種情況', '這三種不要交給 subagent。', [
        '只掛專家頭銜、沒增加實際能力的',
        '循序串接的 pipeline，每步都靠上一步',
        'test runner 型：會藏起你除錯要的資訊'
      ]]
    ],
    workflow: [
      '先問中間過程重不重要，只要結果就委派。',
      '研究與探索類優先交給 subagent。',
      'code review 交給獨立 context 的 reviewer。',
      '語氣或樣式不同的任務，配自訂 system prompt。',
      '步驟互相依賴的，留在主執行緒做。',
      '要看完整測試輸出除錯的，也留在主執行緒。'
    ],
    example: '課程的研究情境：問 JWT 驗證在哪裡做的。subagent 讀完一堆檔案，只回一句話。JWT validation happens in middleware/auth.js line 42。外加呼叫來源：route/api.js 裡的 Express router。重活它做了，主 context 只拿到這幾個字。',
    pitfalls: [
      '用「專家」人設包裝一個沒有額外能力的 subagent。',
      '把多步驟工作切成循序 pipeline，摘要一壓就出錯。',
      '用 subagent 跑測試，除錯要的完整輸出會被摘要吃掉。'
    ]
  },
});
