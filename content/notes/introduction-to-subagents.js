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
    overview: '這一堂解釋 subagent 是什麼、為什麼需要它。每次跟 Claude Code 對話都在往主 context window 疊東西；subagent 的作法是另外開一個獨立的 context window 去做事，做完只把結論帶回來。好處是主對話只留下你的問題和那份摘要，中間翻過的十幾個檔案不會進來。',
    concepts: [
      ['主 context 會被中間過程塞滿', '探索型任務會讀進大量檔案內容，這些中間材料留在主 context 裡沒有價值，卻持續佔位。'],
      ['subagent 的組成', '啟動時它拿到兩樣東西：設定檔裡定義角色與行為的 custom system prompt，以及主 agent 根據你的需求寫出來的任務描述。之後它就自己去做。'],
      ['回傳的是摘要不是過程', 'subagent 做完只把需要的資訊濃縮成摘要交回主對話，中間怎麼找到的不會回灌。'],
      ['內建 subagents', 'General purpose 處理需要探索又需要動手的多步驟任務；Explore 專做快速搜尋與程式庫導覽；Plan 用在 plan mode，先研究分析程式庫再提出計畫。'],
      ['三個核心效益', '把工作切成專注的小塊、讓主 context 保持乾淨、只帶回你真正需要的簡潔結論。']
    ],
    workflow: [
      '判斷這件事的中間過程你需不需要看到；不需要就適合委派。',
      '先看內建的 General purpose、Explore、Plan 夠不夠用。',
      '把任務講清楚交給 subagent，讓它在獨立 context 裡自己跑。',
      '收下它回傳的摘要，主對話只留問題與答案。',
      '若內建的行為不符合需求，再考慮建立有自訂 system prompt 與工具權限的 custom subagent。'
    ],
    example: '課程用的情境：你在一個不熟的程式庫裡，想知道哪個 service 負責處理退款。直接在主對話追，會把沿路讀的十五個檔案全塞進 context；交給 subagent，主 context 只會留下這個問題和答案摘要。',
    pitfalls: [
      '把 subagent 當成「另一個更強的 Claude」，其實它的價值來自 context 隔離，不是能力升級。',
      '委派那些你其實需要全程看到過程的工作，摘要一壓縮反而丟掉你要的細節。',
      '忘了 subagent 完全看不到主對話的脈絡，任務描述寫得太簡略它就做偏。'
    ]
  },
  '450699': {
    overview: '這一堂實作 custom subagent：用 /agents 指令走完建立流程，選 scope、挑工具、選模型與顏色，最後產出 .claude/agents/ 底下的設定檔。同時逐欄說明 frontmatter 各欄位的作用，並說明怎麼讓 Claude 主動去用它。',
    concepts: [
      ['/agents 與 scope', '用 /agents 建立時第一個問題是範圍：project-level 只在目前專案可用，user-level 則在這台機器的所有專案共用。'],
      ['工具權限分組', '建立過程可挑選工具類別：唯讀工具、編輯工具、執行工具、MCP 工具與其他工具。原則是這個 subagent 實際需要什麼才給什麼。'],
      ['模型選擇', 'Haiku 適合快速輕量的任務；Sonnet 是速度與深度的折衷；Opus 適合複雜分析；Inherit 則沿用主對話的模型。'],
      ['設定檔欄位', '檔案通常落在 .claude/agents/<名稱>.md。name 是唯一識別；description 決定 Claude 何時派它上場；tools 列出可用工具；model 為 sonnet / opus / haiku / inherit；color 是 UI 上的識別色。'],
      ['system prompt 就是內文', 'YAML frontmatter 以下的整段 markdown 就是這個 subagent 的 system prompt，寫得好不好直接決定它有沒有用。']
    ],
    workflow: [
      '執行 /agents，選擇 project-level 或 user-level，再選建立方式。',
      '挑選工具範圍，只給這個角色真正需要的類別。',
      '選定模型（Haiku / Sonnet / Opus / Inherit）與顏色。',
      '打開產生的 .claude/agents/<名稱>.md，把 frontmatter 底下的 system prompt 寫紮實。',
      '想要自動委派就在 description 裡放「proactively」，並補上範例對話；接著實際改幾行程式碼、請 Claude review 來測試。'
    ],
    example: '課程建立的是 code-quality-reviewer：frontmatter 為 name: code-quality-reviewer、description 說明「需要針對剛寫或剛改的程式碼做品質、安全與最佳實務審查時使用這個 agent」、tools: Bash, Glob, Grep, Read, WebFetch, WebSearch、model: sonnet、color: purple；內文則把它設定成專精於品保、資安最佳實務與專案規範遵循的資深 code reviewer。',
    pitfalls: [
      'description 寫得含糊，Claude 就不知道何時該派它；沒被觸發時第一個該檢查的就是 description。',
      '想要自動委派卻沒在 description 裡寫「proactively」，結果每次都得自己開口指定。',
      '工具權限給太寬，一個只需要讀程式碼的 reviewer 卻拿到 Edit 和 Write。'
    ]
  },
  '450700': {
    overview: '這一堂講怎麼把 subagent 設計得真的好用。四個關鍵：description 要具體、system prompt 裡要定義輸出格式、要求回報遇到的障礙、以及限制工具權限。其中定義輸出格式是課程明說「單一最重要的改善」，因為它同時給了停止條件和可用的回傳結構。',
    concepts: [
      ['description 有兩個作用', '你發訊息時，所有可用 subagent 的 name 與 description 都會被放進主 agent 的 system prompt。description 不只決定何時啟動，也影響主 agent 寫出來的輸入提示長什麼樣。'],
      ['用 description 塑造輸入提示', '在 description 裡加上像「你必須明確告訴這個 agent 要審查哪些檔案」這樣的句子，主 agent 就會寫出更具體的輸入提示。這招適用於各種類型的 subagent。'],
      ['輸出格式是最重要的改善', '在 system prompt 定義輸出格式，會替 subagent 建立自然的停止點——每個段落填完就知道做完了——同時避免它無限跑下去。'],
      ['障礙回報', 'subagent 過程中發現的變通做法（相依性問題怎麼解、某指令需要特定 flag）必須出現在摘要裡，否則主執行緒得重新踩一次。取得方式就是在輸出格式裡明確要求。'],
      ['依角色決定工具', '研究／唯讀型只需要 Glob、Grep、Read；code reviewer 需要 Bash 才能跑 git diff 看變更，但仍不需要 Edit 或 Write；只有真的要改程式碼的樣式／修改型 agent 才給 Edit 與 Write。']
    ],
    workflow: [
      '先寫具體的 description，同時交代啟動時機與主 agent 該傳什麼給它。',
      '在 system prompt 裡定義編號分明的輸出格式，讓它有明確的檢查清單與收尾點。',
      '在輸出格式裡加一段障礙回報，指名要交代環境問題、變通做法、需要特殊 flag 的指令、有問題的相依套件。',
      '依角色收斂工具權限，只給真正需要的。',
      '實測後回頭檢查：沒被啟動就修 description，回傳內容不好用就修輸出格式。'
    ],
    example: '課程的 code review subagent 輸出格式共六段：1. Summary（審了什麼、整體評估）2. Critical Issues（必須立刻修的資安漏洞、資料完整性風險、邏輯錯誤）3. Major Issues（品質問題、架構偏離、明顯效能疑慮）4. Minor Issues（風格不一致、文件缺漏、小幅最佳化）5. Recommendations 6. Approval Status（明確說可否 merge／deploy）。再加上第 7 段 Obstacles Encountered 收攏過程中遇到的環境與相依問題。',
    pitfalls: [
      '沒定義輸出格式，subagent 就沒有停止點，容易跑太久，回傳的東西主執行緒也不好接。',
      '沒要求回報障礙，subagent 自己解掉的相依性或指令 flag 問題就此消失，主執行緒得重新發現一次。',
      '所有 subagent 都給滿工具權限，尤其是給了唯讀角色 Edit 與 Write。'
    ]
  },
  '450701': {
    overview: '這一堂處理最實際的問題：什麼時候該用 subagent、什麼時候不該。判準只有一句話——中間過程重不重要？不重要就委派。適合的場景是研究探索、code review、需要自訂 system prompt 的任務；不適合的是空有專家人設、每步依賴前一步的串接流程，以及需要完整輸出來除錯的測試執行。',
    concepts: [
      ['適用的共同特徵', '探索與執行可以分開時最有效：你要的是結果而不是逐步過程、探索工作會弄髒主執行緒的 context、或這個任務能受益於全新視角或自訂 system prompt。'],
      ['研究是經典用途', '研究型 subagent 可以讀幾十個檔案、追函式呼叫、走過不同程式路徑，最後只回一句結論。'],
      ['code review 的隔離效果', 'Claude 在把程式碼視為「別人寫的」時 review 得更好，而 reviewer subagent 正好是在獨立 context 裡看到這些變更。'],
      ['自訂 system prompt 才是真差異', 'Claude Code 預設的 system prompt 偏向簡潔、以程式碼為重心。文案型 subagent 可以給它語氣、受眾與風格指示；樣式型 subagent 可以指向你的 design system 檔案——這種時候 subagent 才真的比主執行緒強。'],
      ['不適用的三種情況', '只掛專家頭銜卻沒增加實際能力的 subagent 幫助有限；循序串接的 pipeline 會製造問題；test runner 型 subagent 會藏起你除錯需要的資訊。']
    ],
    workflow: [
      '問自己：中間過程重要嗎？答案是「不重要，我只要結果」就委派。',
      '研究與探索類任務優先交給 subagent。',
      'code review 交給獨立 context 的 reviewer，讓它以旁觀者角度審查。',
      '需要跟預設語氣不同的任務（文案、樣式）就配自訂 system prompt。',
      '要串多個彼此依賴的步驟、或要看完整測試輸出來除錯時，留在主執行緒做。'
    ],
    example: '課程的研究情境：問 JWT 驗證在哪裡做的，subagent 讀完一堆檔案後只回「JWT validation happens in middleware/auth.js line 42, called from the Express router in route/api.js」——重活它做了，主 context 只拿到這行結論。',
    pitfalls: [
      '用「專家」人設包裝一個沒有額外能力的 subagent，只是徒增啟動成本與資訊落差。',
      '把多步驟工作切成循序的 subagent pipeline，每一步都依賴前一步的結果，中間摘要一壓縮就出錯。',
      '用 subagent 跑測試：你除錯需要的完整輸出會被摘要吃掉。'
    ]
  },
});
