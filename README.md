# Anthropic Academy 學習地圖

把 [Anthropic Academy](https://anthropic.skilljar.com/) 的 20 門課做成一個遊戲化的繁體中文學習系統：世界地圖上有五座島，帶著自己的角色一路走完，讀完一堂拿 XP、升等、解徽章、換裝備。

> 非官方學習站，與 Anthropic 無隸屬關係。本站內容是讀過官方課程後理解重寫的原創繁中整理，不重製、不逐字翻譯官方教材。影片、測驗與結業證書一律以官方 Skilljar 平台為準。

姊妹專案（純閱讀版）：[anthropic-academy-zh-tw](https://github.com/finianex/anthropic-academy-zh-tw)

## 現在做到哪

**Phase 1 完成** —— 不需要登入就完整可玩，進度存在瀏覽器裡。

- 世界地圖：五座島、進度環、島與島之間的建議航線
- 島嶼路徑：多林果式蜿蜒路徑，一門課一段，角色站在你最後造訪的節點上
- 課堂卡片流：一堂課拆成 7–11 張卡片，翻到最後一張才能標記完成
- XP／等級（8 階）、12 枚成就徽章、6 種身形 × 5 色 × 4 個配件槽
- 我的筆記：每堂一篇，自動儲存，可在「我的角色」頁總覽與匯出

**Phase 2（未開始）** Google 登入 + Firestore 同步。目前進度只存在這台裝置。

## 本機執行

沒有建置流程，也不需要 Node 或 Python：

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

然後開 http://localhost:8080 。換 port：`-Port 3000`；不要自動開瀏覽器：`-NoBrowser`。

`serve.ps1` 用 `TcpListener` 起一個約 30 行的靜態伺服器（不是 `HttpListener`，因為那個通常要管理員權限或 `netsh http add urlacl` 保留）。VS Code 的 Live Server 也可以。

**必須用 http(s) 開，不能直接雙擊 `index.html`。** ES modules 在 `file://` 下會被 CORS 擋掉。

## 檔案結構

```
index.html        世界地圖（首頁）
island.html       島嶼蜿蜒路徑   ?island=start|fluency|teach|build|cloud
lesson.html       課堂卡片流     ?course=<slug>&lesson=<id>
chapter.html      純影片課的章節  ?course=<slug>&section=<n>
me.html           角色 / 徽章 / 換裝 / 我的筆記

content/          內容資料（classic script，掛 window 全域）
  courses.js        20 門課的中繼資料
  catalogs.js       官方完整課綱：444 堂課 / 133 章節項目，含繁中 zhTitle
  official.js       官方公開規格、先修條件、純影片課清單
  notes.js          154 堂逐課中文筆記
  route.js          島嶼分組、建議路線、先修關係、徽章定義

app/              應用程式（ES modules）
  dom.js            el()／text()——全站零 innerHTML 的工具
  catalog.js        對 content/* 的唯讀轉接層，把 444 堂摺成 199 個地圖節點
  cards.js          筆記 → 卡片陣列
  gamify.js         XP、等級、徽章（全部從進度推導）
  local.js store.js 狀態與 localStorage
  progress.js       路線位置與節點狀態
  avatar.js         角色 SVG
  map-world.js      世界地圖
  map-island.js     蜿蜒路徑版面計算與渲染
  ui.js             HUD、toast、進度環
  boot-*.js         各頁進入點

styles/           tokens / base / ui / map
serve.ps1         本機靜態伺服器
```

## 內容範圍與一個必須講清楚的限制

官方全部 **20 門課、444 堂課**。其中 **5 門是純影片課，佔 290 堂**（Building with the Claude API、Claude with Amazon Bedrock、Claude on Google Cloud、MCP 入門與進階）——官方課堂頁只有影片，沒有隨附文字教材，也沒有字幕或逐字稿可以整理。

與其產出憑空推測的內容，本站對這 290 堂：

- **不寫筆記**，改為在地圖上收成 45 個章節節點（否則雲端島會有 176 個節點）
- 節點用**虛線路段**與**影片圖示**標示，路段標題寫明「官方影片路線」
- 完成是**自我回報**，用空心勾而不是實心勾，旁邊明寫「本站無法驗證，這是你自己的紀錄」
- 每堂 4 XP，而有筆記的課堂是 10 XP

這三個視覺訊號是承重結構不是裝飾。少了它們，地圖就會開始暗示本站涵蓋全部 444 堂的教學內容。

| 項目 | 數量 |
|---|---|
| 課程 | 20 門 |
| 課堂 | 444 堂 |
| 逐課中文筆記 | 154 堂 |
| 標示為純影片 | 290 堂 |
| 地圖節點 | 199 個（154 課堂 + 45 章節） |
| 學習卡片 | 1,358 張 |

## 設計決定

**為什麼沒有建置流程。** 不帶 `defer` 的 classic `<script src>` 在解析期同步依序執行，而 `<script type="module">` 隱含 defer、在文件解析完才跑。所以模組開始執行時 `window.ACADEMY_*` 早已就緒——590 KB、7,474 行的資料檔一行都不用改，也不必冒著在 401 KB 資料檔裡打錯字的風險去轉成 ESM。部署就是 `git push`。

**XP 是推導值不是累加值。** 每次狀態變動就從「已完成的課堂集合 + 筆記 + 徽章」整份重算。取消完成時 XP 自動退回、不必寫反向邏輯；兩台裝置合併時不會把同一堂課算兩次；調整 XP 規則之後所有人的數字立刻正確，不需要資料遷移。

**為什麼完成偵測是「翻到最後一張 + 按一下」。** 「捲到底」在這份資料上是壞的——290 堂純影片課沒有內容可捲，頁面短到一載入就等於捲到底，會誤判 65% 的課完成。「停留時間」也不行，93 堂的 Vertex 和 15 堂的基礎課無法共用門檻。

**全站零 `innerHTML`。** 本站會渲染兩種完全由使用者控制的字串——他們自己寫的筆記，以及（Phase 2 之後的）Google `displayName`，後者可以是 `<img src=x onerror=...>`。一旦流進 `innerHTML` 就是 `finianex.github.io` 上的儲存型 XSS，而那個來源與 Firebase Auth 的 token 儲存同源。`app/dom.js` 提供 `el()`，讓任何人都沒有理由去碰 `innerHTML`。

**彩色不當文字色。** `#58CC02` 對白底只有約 2.3:1、`#FFC800` 約 1.7:1，都遠低於 AA 的 4.5:1。所以彩色只用於填色、邊框與進度條；文字一律深灰（11:1），彩底上用白色，需要彩色文字時走 `--*-text` 那一組（全部實測 ≥4.9:1）。

**localStorage 一律 `aaq:v1:` 前綴。** GitHub Pages 上所有 repo 共用 `finianex.github.io` 這一個來源，localStorage 是整個網域共享的，沒有前綴就會和其他專案互撞。

## 部署

GitHub Pages：Settings → Pages → Source 選 `Deploy from a branch`、Branch 選 `main` / `/ (root)`。根目錄的 `.nojekyll` 用來跳過 Jekyll 處理。

## 隱私

目前沒有任何伺服器、沒有登入、沒有分析工具、沒有第三方請求。你的進度與筆記只存在你自己瀏覽器的 localStorage 裡，可以在「我的角色」頁匯出成 JSON 或整批清除。

Phase 2 加上 Google 登入之後，會另外說明存了哪些資料、存在哪裡，以及怎麼自行刪除。

## 授權與聲明

課程名稱、商標、影片及官方教材的權利均歸原權利人所有。課程內容可能隨官方更新而變動，請以官方平台為準。
