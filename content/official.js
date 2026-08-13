/*
 * academy-official.js
 * 官方課程頁（anthropic.skilljar.com）上公開可見的課程規格。
 * 擷取日期：2026-08-10。lectures 為官方標示的「lectures」數（不含測驗）。
 * prereq / who 為依官方英文說明改寫的繁體中文版本，非逐字翻譯。
 * 官方頁面未提供該欄位時一律留空，不做推測。
 */
/*
 * 純影片課程：這幾門課的官方課堂頁只有影片，沒有隨附文字教材，
 * 也沒有字幕軌或逐字稿。本站不為這類課堂撰寫筆記，改為明確標示並提供官方連結。
 * （2026-08-10 逐堂實測確認）
 */
window.ACADEMY_VIDEO_ONLY = [
  'claude-with-the-anthropic-api',
  'claude-in-amazon-bedrock',
  'claude-with-google-vertex',
  'introduction-to-model-context-protocol',
  'model-context-protocol-advanced-topics'
];

window.ACADEMY_OFFICIAL = {
  'claude-101': {
    free: true, certificate: true
  },
  'claude-code-101': {
    free: true, certificate: true, lectures: 12, videoHours: 1.5, quizzes: 1,
    prereq: '需具備程式編輯器與命令列的基本操作經驗，並準備 Claude Pro、Max 或 Enterprise 帳號，或一組 API 金鑰。不預設任何 AI 工具使用經驗。',
    who: '適合剛進入軟體工程、希望一開始就把 AI 納入工作流程的新手開發者，以及對程式代理感興趣但還沒實際嘗試的資深工程師。如果你用過程式助理但覺得成效普通，這門課會說明「與代理協作」和「和代理拉鋸」的差別在哪裡。'
  },
  'claude-platform-101': {
    free: true, certificate: true,
    prereq: '能以至少一種語言讀寫程式碼，並熟悉基本命令列操作。示範使用 TypeScript SDK（@anthropic-ai/sdk）搭配 Node 與 npm——不必精通 TypeScript，但要能跟著把腳本跑起來（平台另有 Python SDK，課程範例為 TypeScript）。另需 Anthropic Console 帳號、platform.claude.com 的 API 金鑰，以及少量預付額度來執行範例。不需要 LLM 開發經驗。',
    who: '適合已經在對話介面用過 Claude、想把它接進自家應用的開發者，無論是替既有產品加上 AI 功能，或從零打造一個代理。如果你送過幾次 API 請求，卻卡在「怎麼讓它自己行動」或「怎麼接上我真正的系統」，這門課就是從單次請求走到正式代理的橋樑。'
  },
  'introduction-to-claude-cowork': {
    free: true, certificate: true, lectures: 14, videoHours: 0.5, quizzes: 1
  },
  'claude-code-in-action': {
    free: true, certificate: true, lectures: 9
  },
  'ai-fluency-framework-foundations': {
    free: true, certificate: true, lectures: 14, videoHours: 1.1, quizzes: 1
  },
  'claude-with-the-anthropic-api': {
    free: true, certificate: true, lectures: 84, videoHours: 8.1, quizzes: 10
  },
  'introduction-to-model-context-protocol': {
    free: true, certificate: true, lectures: 16, videoHours: 1, quizzes: 1
  },
  'ai-fluency-for-educators': {
    free: true, certificate: true, lectures: 4, videoHours: 0.4,
    prereq: '本課只會簡略帶過 AI 素養的基礎概念。若想理解得更完整，建議先修完「AI 素養：框架與基礎」，再開始這門以教育工作者為對象的課程。'
  },
  'ai-fluency-for-students': {
    free: true, certificate: true, lectures: 5, videoHours: 0.5,
    prereq: '本課只會簡略帶過 AI 素養的基礎概念。若想理解得更完整，建議先修完「AI 素養：框架與基礎」，再開始這門以學生為對象的課程。'
  },
  'model-context-protocol-advanced-topics': {
    free: true, certificate: true, lectures: 15, videoHours: 1.1, quizzes: 2
  },
  'claude-in-amazon-bedrock': {
    free: true, certificate: true, lectures: 85, videoHours: 8, quizzes: 10
  },
  'claude-with-google-vertex': {
    free: true, certificate: true
  },
  'teaching-ai-fluency': {
    free: true, certificate: true, lectures: 7, videoHours: 0.6, quizzes: 1,
    prereq: '本課只會簡略帶過 AI 素養的基礎概念。若想理解得更完整，建議先修完「AI 素養：框架與基礎」，再開始這門以教學者為對象的課程。'
  },
  'ai-fluency-for-nonprofits': {
    free: true, certificate: true, lectures: 9, videoHours: 0.9, quizzes: 1,
    prereq: '本課只會簡略帶過 AI 素養的基礎概念。若想理解得更完整，建議先修完「AI 素養：框架與基礎」，再開始這門以非營利組織為對象的課程。'
  },
  'introduction-to-agent-skills': {
    free: true, certificate: true
  },
  'introduction-to-subagents': {
    free: true, certificate: true
  },
  'ai-capabilities-and-limitations': {
    free: true, certificate: true, lectures: 13, videoHours: 0.25, quizzes: 1,
    prereq: '沒有先修條件。本課不預設任何技術背景，也不需要 AI 工具使用經驗。若你已修過「AI 素養：框架與基礎」，會更容易看出每項特性和 4D 之間的對應關係，但那並非必要。',
    who: '適合正在使用、或即將開始使用生成式 AI 的任何人，只要你想理解它為什麼會有這些行為。教育工作者、學生、知識工作者與團隊主管都適用，因為背後的核心模型是同一套。'
  },
  'ai-fluency-for-small-businesses': {
    free: true, certificate: true, lectures: 9, videoHours: 0.9, quizzes: 1,
    prereq: '本課只會簡略帶過 AI 素養的基礎概念。若想理解得更完整，建議先修完「AI 素養：框架與基礎」，再開始這門以中小企業為對象的課程。'
  },
  'ai-fluency-for-builders': {
    free: true, certificate: true, lectures: 10, videoHours: 1, quizzes: 1,
    prereq: '本課只會簡略帶過 AI 素養的基礎概念。若想理解得更完整，建議先修完「AI 素養：框架與基礎」，再開始這門以開發者為對象的課程。'
  }
};
