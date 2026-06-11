# Changelog

All notable changes to KKTerm are documented here.

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.76/kkterm-0.1.76-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.76/kkterm-0.1.76-windows-arm64-setup.exe)

## Highlights
- Refined Connection Tree behavior so visible connections stay in the expected order.
- Added a source-correctness contract and refreshed related tests (because terminals deserve receipts too).

## New
- **Connection Tree**: Enhanced functionality to preserve order in visible connections.

## Improved
- **Contracting for AI inputs**: Added a source-correctness contract and updated related tests.  
  (PR not specified)

## Fixed
- No user-facing fixes were listed in this release context.

## Internal
- Updated AI prompt contracts and tests (`src-tauri/src/ai.rs`, `src-tauri/src/ai/prompt_contracts.rs`, `src-tauri/src/ai/tests.rs`).
- Improved Connection Tree filtering/context-menu coverage in tests (`tests/connection-tree-connected-filter.test.ts`, `tests/connection-tree-context-menu.test.mjs`).

**Full Changelog**: https://github.com/ryantsai/KKTerm/compare/v0.1.75...v0.1.76

---

## Highlights（繁體中文 - 台灣）
- 精進 **連線樹（Connection Tree）** 的行為，讓在畫面上可見的連線維持預期順序。
- 新增「來源正確性（source-correctness）」合約並更新相關測試——畢竟終端機也要有憑有據。

## New（新增）
- **連線樹（Connection Tree）**：強化功能，讓「可見連線」在排序上保持正確順序。

## Improved（改善）
- **AI 輸入的合約約束**：新增「來源正確性」合約並更新相關測試。  
 （本次釋出內容未提供 PR 編號）

## Fixed（修正）
- 本次版本釋出內容中未列出使用者可見的修正項目。

## Internal（內部）
- 更新 AI 提示合約與測試（`src-tauri/src/ai.rs`、`src-tauri/src/ai/prompt_contracts.rs`、`src-tauri/src/ai/tests.rs`）。
- 強化連線樹篩選/內容選單相關測試（`tests/connection-tree-connected-filter.test.ts`、`tests/connection-tree-context-menu.test.mjs`）。

**完整變更紀錄（Full Changelog）**: https://github.com/ryantsai/KKTerm/compare/v0.1.75...v0.1.76

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.75/kkterm-0.1.75-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.75/kkterm-0.1.75-windows-arm64-setup.exe)

## Highlights
- Added a **“Show Connected”** filter to the Connection Tree so you can focus on connections with an active Session.
- When deleting a connection, KKTerm will now **close any open Tab(s) and Pane(s)** tied to it—less “stale terminal” energy, more clean state.

## New
- **Connection Tree:** Added **“Show Connected”** filter (session-only, not persisted) in the control row next to the tree view actions.  
  - PR #303 — by @ryantsai (codex) · https://github.com/ryantsai/KKTerm/pull/303 (includes fix: Hide Folders duplication)

## Improved
- **Connection Tree rendering clarity:** “Show All” was renamed to **“Hide Folders”** for clarity, and the related localization keys were updated (including **connections.hideFolders** and **connections.showConnected**).  
  - PR #303 — @ryantsai · https://github.com/ryantsai/KKTerm/pull/303

## Fixed
- **Connection Tree duplicate roots in flat view:** Fixed a bug where root-level connections could be rendered twice when using the tree/flat combinations.  
  - PR #303 — @ryantsai · https://github.com/ryantsai/KKTerm/pull/303
- **Deleting a connection:** Fixed lingering UI by **closing open Tabs and Panes** associated with the deleted Connection.  
  - (sha: e938cb5)

## Internal
- Adjusted z-index and added related tests for the **Quick Command** subdialog backdrop. (sha: 26b64a0)
- Localization updates/todo entries across locales. (sha: aa4676f)

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.74/kkterm-0.1.74-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.74/kkterm-0.1.74-windows-arm64-setup.exe)

## v0.1.74 Release Notes (KKTerm)

### Highlights
- **Fix SSH + tmux label visibility**: PTY echo no longer hides the **Pane** tmux session label when tmux is actually running.
- **Quick Connect now persists**: Quick Connect always creates/updates a saved **Connection** and opens it, instead of leaving the **Tab** backed by ephemeral state.
- **PowerShell 7 (pwsh) support**: Added as a Windows local shell option with an installer recipe and launch gating.

### New
- **Settings**: Renamed **Settings > General** section to **Window** and tidied the card layout. ([#298](https://github.com/ryantsai/KKTerm/pull/298))
- **macOS**: Added **Don’t Sleep** monitoring.
- **PowerShell 7 (pwsh)** support:
  - Shell option in Terminal settings
  - Installer recipe
  - Install-or-fallback gate for launching `pwsh`  
  ([#301](https://github.com/ryantsai/KKTerm/pull/301), by @ryantsai)
- **VNC**: Added Apple Remote Desktop authentication (RFB security type 30). ([#302](https://github.com/ryantsai/KKTerm/pull/302), by @ryantsai)

### Improved
- **Quick Connect**: Always saves (reuse-or-create) and opens the persisted **Connection**. ([#300](https://github.com/ryantsai/KKTerm/pull/300))
- **Terminal/PowerShell**: `pwsh` launch is gated behind install-or-fallback pre-flight.
- **SSH / tmux UX**: Prevented a false-positive scenario that could hide the tmux session label on reconnect.

### Fixed
- **SSH**: Stop PTY echo from hiding the tmux session label. ([#297](https://github.com/ryantsai/KKTerm/pull/297), by @ryantsai)

### Internal
- Implemented a **rollback mechanism for failed releases** and validated source before mutations.  
- Build tooling update: release script + installer smoke coverage updates.

---

## v0.1.74 更新日誌（KKTerm）

### 重點
- **修正 SSH + tmux 標籤可見性**：PTY 回顯不再在 **Pane** 的 tmux session 標籤被「遮住」——前提是 tmux 的確有在跑。
- **Quick Connect 會永久保存**：Quick Connect 會固定建立/更新已保存的 **Connection**，並打開它；不再讓 **Tab** 落在臨時狀態上。
- **支援 PowerShell 7（pwsh）**：新增為 Windows 本機殼層選項，並提供安裝規格與啟動門檻。

### 新增
- **設定**：將 **Settings > General** 改名為 **Window**，並整理卡片版面。([#298](https://github.com/ryantsai/KKTerm/pull/298))
- **macOS**：新增 **防止螢幕/系統休眠（Don’t Sleep）監控**。
- **PowerShell 7（pwsh）支援**：
  - Terminal 設定中的殼層選項
  - 安裝配方
  - 啟動前的 install-or-fallback 門檻  
  ([#301](https://github.com/ryantsai/KKTerm/pull/301)，作者 @ryantsai)
- **VNC**：加入 Apple Remote Desktop 驗證（RFB security type 30）。([#302](https://github.com/ryantsai/KKTerm/pull/302)，作者 @ryantsai)

### 改善
- **Quick Connect**：固定儲存（reuse-or-create），並打開已持久化的 **Connection**。([#300](https://github.com/ryantsai/KKTerm/pull/300))
- **Terminal/PowerShell**：`pwsh` 啟動會先經過 install-or-fallback 的預檢。
- **SSH / tmux UX**：避免在重新連線時出現會「誤判」並隱藏 tmux 標籤的情境。

### 修正
- **SSH**：停止 PTY 回顯造成 tmux session 標籤消失的問題。([#297](https://github.com/ryantsai/KKTerm/pull/297)，作者 @ryantsai)

### Internal
- 新增 **釋出失敗回滾機制**，並在變更前先驗證來源。
- 建置/發布工具更新：更新釋出腳本與安裝煙霧測試覆蓋。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.73/kkterm-0.1.73-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.73/kkterm-0.1.73-windows-arm64-setup.exe)

## Highlights
- **Stable SSH Session keepalives**: Idle native SSH connections behind NAT/stateful firewalls are less likely to freeze—closing and reconnecting is no longer the only escape hatch.
- **macOS arm64 support**: macOS builds are updated with platform-specific behavior and native overlay title bar handling.

## New
- **(macOS) Platform-specific features** to support macOS arm64 builds, including macOS keychain integration and conditional settings rendering.

## Improved
- **“The Big Refactor” landing across the codebase** (docs + architecture + command grouping), keeping the **Connection / Session / Tab / Pane**-related surfaces organized and easier to navigate.
- **Dashboard security validation coverage** expanded with behavioral frontend tests for script widget permissions/CSP and schema validation.
- **Test auto-discovery & ESLint gate**: `npm run check` now auto-discovers tests and uses an ESLint config wired into the check pipeline.

## Fixed
- **SSH keepalives for idle Sessions** (#294, by @ryantsai) — prevents idle native SSH sessions from freezing; credited from the PR’s co-author **Claude Opus 4.8**.

## Internal
- Major internal refactors and test infrastructure work (e.g., storage/ai/module decomposition and test runners) under **The Big Refactor**.
- CI/test/tooling tweaks (Rust test gating and markdown sanitization before `dangerouslySetInnerHTML`).
- Docs/architecture updates to reflect the new backend/frontend organization.

---

## 亮點
- **穩定的 SSH Session Keepalives**：在 NAT / 有狀態防火牆之後的閒置原生 SSH 連線比較不容易凍結——不用再只靠「關掉 Tab 然後重連」才能救回來。
- **macOS arm64 支援**：更新 macOS 版的平台特定行為與原生 overlay 標題列處理。

## 新增
- **（macOS）平台特定功能**：支援 macOS arm64 建置，包括 macOS 鑰匙圈整合，以及依平台進行設定選項的條件渲染。

## 改善
- **「The Big Refactor」在整個程式碼庫落地**（含文件與架構、指令分組等），讓與 **Connection / Session / Tab / Pane** 相關的介面更好維護與理解。
- **Dashboard 安全性驗證覆蓋率擴充**：加入行為式前端測試，涵蓋 script widget 權限/CSP 與 schema 驗證。
- **測試自動發現與 ESLint gate**：`npm run check` 現在會自動發現測試，並把 ESLint 設定接到檢查流程。

## 修復
- **修正閒置 Session 的 SSH keepalives** (#294，作者 @ryantsai) — 避免閒置的原生 SSH Session 凍結；並依 PR 訊息同時致謝 **Claude Opus 4.8**（共同作者）。

## Internal
- 內部大量重構與測試/基礎設施調整（例如 storage/ai/module 拆分與測試執行器）屬於 **The Big Refactor** 的範圍。
- CI/測試/工具鏈調整（例如 Rust 測試的 CI 門檻、在 `dangerouslySetInnerHTML` 前先做 markdown sanitization）。
- 更新文件/架構以反映新的後端/前端組織方式。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.72/kkterm-0.1.72-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.72/kkterm-0.1.72-windows-arm64-setup.exe)

## Highlights
- Fixed a WebView URL overlay that could fail to show on a retry (no more “it worked… after I made a dialog do it” vibes).

## Fixed
- **Webview URL overlay visibility retry:** Added a bounded retry so the overlay show request waits until the underlying HWND is ready, preventing intermittent “underlying handle not available” failures. *(by @ryantsai in https://github.com/ryantsai/KKTerm/pull/292; SHA: 176cd97)*
- **Webview URL overlay anchoring:** Anchored the overlay to the correct client origin using Win32 `ClientToScreen({0,0})`, avoiding pixel gaps beside the Pane on certain resizable/borderless Windows frames.

## Internal
- Added `.gitattributes` to enforce LF for text files, reducing CRLF-vs-LF churn that could affect tests.
- Logging: Added `KKTERM_WEBVIEW_DEBUG` output for the computed overlay rect.

---

## 亮點
- 修正 WebView 的「URL 覆蓋層」在重試時可能不會正常顯示的問題（不再需要像是「我先叫一個對話框逼它重來」那樣）。  

## 修正
- **Webview URL 覆蓋層顯示重試：** 在 HWND 就緒之前加入有界重試，讓「顯示覆蓋層」的要求不會因偶發的底層手把尚未可用而失敗。*(由 @ryantsai 於 https://github.com/ryantsai/KKTerm/pull/292；SHA：176cd97)*
- **Webview URL 覆蓋層定位：** 透過 Win32 `ClientToScreen({0,0})` 來錨定到正確的 client origin，避免特定無邊框/可調整大小的 Windows 視窗框架下，在 Pane 旁出現幾個像素的縫隙。  

## 內部
- 新增 `.gitattributes` 以強制文字檔使用 LF，降低 CRLF-vs-LF 抖動影響測試的風險。
- 記錄輸出：加入 `KKTERM_WEBVIEW_DEBUG`，顯示計算後的覆蓋層矩形資訊。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.71/kkterm-0.1.71-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.71/kkterm-0.1.71-windows-arm64-setup.exe)

## Highlights
- Fix a crash when using terminal search decorations—no more “black screen and pray” vibes.
- Improve URL webview behavior by removing an unstable Tauri webview dependency and updating how `target=_blank` opens in new Tabs.
- Fix follow-up terminal focus documentation for the URL connection flow.

## New
- Webview: opening URLs with `target=_blank` now opens in a new Tab.

## Improved
- Webview: updated lifecycle/overlay positioning logic tied to native window move/resize events.

## Fixed
- Terminal: fix crash related to terminal search decorations (#289 by @ryantsai).
- Webview: remove unstable Tauri webview dependency (#290 by @ryantsai).
- Docs: fix followup terminal focus fix URL connection docs (#291 by @ryantsai).

## Internal
- Webview/overlay handling updates included in the release (including related tests).

---

## 重點摘要
- 修正終端機搜尋的裝飾（decorations）導致的當機問題——不再有「螢幕一黑就祈禱」的尷尬感。
- 改善 URL 的 Webview 行為：移除不穩定的 Tauri Webview 相依，並更新 `target=_blank` 的開新分頁（Tab）方式。
- 修正「後續的終端機焦點」相關文件，涵蓋 URL 連線流程。

## 新增
- Webview：當連結使用 `target=_blank` 時，現在會在新的 Tab 中開啟。

## 改進
- Webview：更新了與原生視窗移動/縮放事件相關的生命週期與遮罩（overlay）定位邏輯。

## 修正
- 終端機：修正與終端機搜尋裝飾相關的當機問題（#289，@ryantsai）。
- Webview：移除不穩定的 Tauri Webview 相依（#290，@ryantsai）。
- 文件：修正「後續的終端機焦點」的 URL 連線文件（#291，@ryantsai）。

## Internal
- 本次釋出包含 Webview/遮罩處理的內部更新（並附帶相關測試）。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.70/kkterm-0.1.70-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.70/kkterm-0.1.70-windows-arm64-setup.exe)

## Highlights
- Terminal keyboard focus should no longer get “stolen” when using the drag/resize frame—your Session should keep responding like a good terminal should. (Small sysadmin joke: the window finally stops grabbing the keyboard like a rogue `sudo`.)

## Fixed
- Prevented the `TAURI_DRAG_RESIZE_WINDOW` helper from stealing terminal keyboard focus, so Tabs/Session interaction won’t break on re-activation. PR #287 by @ryantsai (https://github.com/ryantsai/KKTerm/pull/287, c59be44 / 384b091).  

## Internal
- Updated window effect behavior to keep focus handling from interfering with terminal input (WS_EX_NOACTIVATE applied to the helper window).

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.69/kkterm-0.1.69-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.69/kkterm-0.1.69-windows-arm64-setup.exe)

## Highlights
- More reliable keyboard focus for terminal input after app switching (your Alt+Tab should stop feeling like a tiny gremlin).  
- Settings UI cleanup: URL WebView toolbar tidy-up and Workspace moved above Dashboard in the Settings nav.

## New
- Implement save registration and unsaved changes handling for the Settings page (including a confirmation dialog when closing with unsaved changes).

## Improved
- Tidy URL WebView toolbar and adjust Settings navigation order (Workspace above Dashboard).

## Fixed
- Restore terminal focus after app switch (e.g., Alt+Tab) via improved focus restore timing and window/visibility reactivation by @ryantsai in https://github.com/ryantsai/KKTerm/pull/280.
- Hide tmux toolbar when SSH tmux negotiation falls back to normal shell by @ryantsai in https://github.com/ryantsai/KKTerm/pull/282.
- Fix duplicated local terminal buffer after tab switch by @ryantsai in https://github.com/ryantsai/KKTerm/pull/283.
- Fix terminal focus restore by using WebView2 MoveFocus (MoveFocus / focusCurrentWebview) instead of raising the frame by @ryantsai in https://github.com/ryantsai/KKTerm/pull/286.

## Internal
- N/A

---

## 精選重點
- 讓終端機（Terminal）輸入的鍵盤焦點更可靠：切換到其他程式再回來後，鍵盤輸入不再那麼容易失聯（Alt+Tab 不該變成小小的惡作劇）。  
- 設定頁面小整理：URL WebView 工具列排版更乾淨，且在設定導覽中把「Workspace」移到「Dashboard」上方。

## 新增
- 為設定頁面加入「儲存狀態登錄（save registration）」與「未儲存變更處理」：在關閉設定頁且仍有未儲存變更時會出現提示對話框。

## 改進
- 整理 URL WebView 工具列，並調整設定導覽順序（Workspace 位於 Dashboard 之上）。

## 修正
- 修復切換應用程式後終端機焦點無法正常回復（例如 Alt+Tab），透過更可靠的焦點回復時機與視窗/可見性重新啟用處理，由 @ryantsai 在 https://github.com/ryantsai/KKTerm/pull/280 提交。
- 當 SSH 的 tmux 協商失敗改為一般 shell 時，隱藏 tmux 工具列，由 @ryantsai 在 https://github.com/ryantsai/KKTerm/pull/282 提交。
- 修復切換分頁（Tab）後本機終端機緩衝（buffer）重複的問題，由 @ryantsai 在 https://github.com/ryantsai/KKTerm/pull/283 提交。
- 修復終端機焦點回復方式：改用 WebView2 的 MoveFocus（MoveFocus / focusCurrentWebview）而不是先把視窗框架提到最上層，由 @ryantsai 在 https://github.com/ryantsai/KKTerm/pull/286 提交。

## 內部
- N/A

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.68/kkterm-0.1.68-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.68/kkterm-0.1.68-windows-arm64-setup.exe)

## Highlights
- Fixed saving **Connection** properties when the same name appears more than once (duplicate-name rows).  
- Refined the **Notes** widget into a skeuomorphic sticky note—because dashboards deserve a little desk clutter.  
- Improved the **Settings** popup “App Update” section layout/padding for more consistent placement.

## New
- Enhanced **Connection** and Connection folder management (create/rename/delete/move, plus update tools).

## Improved
- Refined **Settings** popup “App Update” controls and placement.

## Fixed
- **Connection** properties save now works for duplicate-name rows. (via [#276](https://github.com/ryantsai/KKTerm/pull/276) by @ryantsai — reported/credited alongside the fix)

## Internal
- Refined note styling and settings popup layout via test coverage updates.
- Added tests for AI CLI status persistence.  

---

## 精選重點
- 修正當同名的 **Connection** 設定列出現重複時，**Connection** 內容無法正確儲存的問題（重複名稱的列）。  
- 將 **Notes** 小工具改造成擬真便利貼風格——讓儀表板也來點辦公桌的雜物感。  
- 改善 **Settings** 彈出視窗中的「App Update」區塊版面/內距，讓顯示位置更一致。

## 新增
- 強化 **Connection** 與 Connection 資料夾管理：新增/更新（工具）、重新命名、刪除、移動等操作。

## 改善
- 精修 **Settings** 彈出視窗「App Update」控制項與顯示位置。

## 修正
- **Connection** 內容儲存：修正重複名稱列的儲存問題。([#276](https://github.com/ryantsai/KKTerm/pull/276) by @ryantsai — 依修正內容進行通報/署名)

## Internal
- 透過測試與樣式微調精修筆記樣式與設定彈出視窗版面。
- 新增 AI CLI 狀態持久化的測試。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.67/kkterm-0.1.67-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.67/kkterm-0.1.67-windows-arm64-setup.exe)

## Highlights
- Terminal paste is now routed through xterm handling, reducing surprise behavior when pasting into a **Pane** (PR #274, by @ryantsai).
- Improved **RDP Connection** debug logging sizing by tracking RDP connection state (PR #275, by @ryantsai). Your logs should fit a little better—like a well-sized TTY window. 😄

## New
- None

## Improved
- **Terminal** paste now goes through **xterm** paste handling (PR #274, @ryantsai).
- **RDP Connection** state is now included to resize debug logs (PR #275, @ryantsai).

## Fixed
- Fixed terminal paste handling for line breaks by routing paste through xterm (PR #274, @ryantsai).

## Internal
- None

---

## 重點摘要
- 現在會將「終端機貼上」導入 **xterm** 的處理流程，讓你在 **Pane** 裡貼上時較不會遇到令人意外的行為（PR #274，@ryantsai）。
- 改善 **RDP 連線（Connection）** 的除錯日誌大小：透過追蹤 RDP 連線狀態來調整（PR #275，@ryantsai）。日誌應該更好塞進去一點——就像剛好合適的 TTY 視窗。😄

## 新增
- 無

## 改善
- **終端機（Terminal）** 貼上現在透過 **xterm** 的貼上處理（PR #274，@ryantsai）。
- 在 **RDP 連線（RDP Connection）** 中加入狀態資訊，以調整除錯日誌大小（PR #275，@ryantsai）。

## 修正
- 修正終端機貼上時的換行問題：改為走 xterm 貼上處理（PR #274，@ryantsai）。

## Internal
- 無

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.66/kkterm-0.1.66-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.66/kkterm-0.1.66-windows-arm64-setup.exe)

## Highlights
- Improved Terminal paste handling by routing pastes through xterm handling (so your text doesn’t randomly decide to take the scenic route).

## Improved
- Route Terminal paste through xterm paste handling, fixing paste formatting/line breaks in Terminal sessions. (PR #274, @ryantsai; short SHA: `5b88126`)

## Internal
- Updated app slogan translations across multiple languages. (short SHA: `5b7c5c7`)  

---

## 精選亮點
- 改進 Terminal 貼上處理：將貼上內容導回 xterm 處理流程（避免你的文字在 Terminal 裡突然改走「風景路線」）。

## 改進
- 透過 xterm paste handling 轉送 Terminal 貼上內容，修正 Terminal 會出現的貼上格式/換行問題。 (PR #274，@ryantsai；短 SHA：`5b88126`)

## Internal（內部）
- 更新多語系的應用程式標語翻譯。 (short SHA：`5b7c5c7`)

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.65/kkterm-0.1.65-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.65/kkterm-0.1.65-windows-arm64-setup.exe)

## Highlights
- Added a **“Don’t Sleep”** feature to help prevent your system from sleeping while KKTerm is running.
- Improved **child connection Tab** behavior to better preserve the currently focused **Pane** state and restore layouts.

## New
- **“Don’t Sleep”** settings section (including a foreground-only mode) and updated UI labels/tooltips for its state.

## Improved
- Enhanced child **Connection** Tab behavior to preserve the focused **Pane** state and improve layout restoration.

## Fixed

## Internal
- Removed obsolete localization TODO docs and updated translations related to **“Don’t Sleep”** across multiple languages.

---

## v0.1.65 亮點
- 新增 **「不要睡眠（Don’t Sleep）」**功能：在 KKTerm 運行時，協助避免系統進入睡眠。
- 改善「子連線（child Connection）」的 **Tab** 行為：更能保留目前聚焦的 **Pane** 狀態，並讓版面還原更穩定。

## 新增
- **「不要睡眠」**設定頁面（含「僅前景（foreground-only）」模式），並同步更新介面標籤與狀態提示（tooltips）。

## 改善
- 強化子連線的 **Connection Tab** 行為：保留聚焦 **Pane** 狀態、改善版面還原效果。

## 修正

## Internal
- 移除過期的在地化 TODO 文件，並更新多語言中的「不要睡眠（Don’t Sleep）」相關翻譯。

**（小小網管笑話）**：系統要睡前，KKTerm 先把網路線按住——不然它老愛自己「晚安」。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.64/kkterm-0.1.64-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.64/kkterm-0.1.64-windows-arm64-setup.exe)

## Highlights
- Terminal Session focus restoration improvements for when you switch back to KKTerm—no more “I swear I clicked” moments. 🖥️😅

## New
- Add an “Open log folder” command in Settings (with translations updated).

## Improved
- Preserve focused Pane when the Tab refreshes within a child Connection layout.
- Color scheme updates and localization updates, including adding the **blue-green-white** color scheme.

## Fixed
- Connection Tree: Parent Child Connection Tab panoramas no longer select a child row when opened.
- Terminal: Prevent a reactivation-focused button from blocking focus restore (fix by @ryantsai in https://github.com/ryantsai/KKTerm/pull/268, small terminal gremlin avoided).
- Terminal: Restore keyboard input by calling `SetFocus` on the WebView2 content HWND (fix by @ryantsai in https://github.com/ryantsai/KKTerm/pull/269).
- Win32 WebView2 focus restore: Correct the `SetFocus` import path (fix by @ryantsai in https://github.com/ryantsai/KKTerm/pull/270).
- Revert Win32 WebView2 focus-restore changes from #269 and #270 (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/271).

## Internal
- Terminal: Refactor focus handling and improve terminal focus restore tests.
- Dashboard/library/code cleanup and other refactors.
- Move GitHub download badge into the README badge row.

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.63/kkterm-0.1.63-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.63/kkterm-0.1.63-windows-arm64-setup.exe)

## Highlights
- Fixed a keyboard focus issue for **Terminal** Sessions after app/window activation: keystrokes now reach the right **Pane** without an extra click.
- Improved **RDP** debug logging so sensitive fields are redacted while keeping useful diagnostics, and surfaced **RDP** errors in the **Status Bar** regardless of debug settings.

## New
- Added **ui.debug.log** support for Terminal focus tracing (records focus restore stages and related document state when enabled).  
  PR #9481b70

## Improved
- Enhanced **RDP** debug logging details while keeping sensitive values out of logs.  
  PR #1994e86
- Updated documentation/manifests for the above debug logging and related settings language entries.  
  PR #8c90114, #1994e86

## Fixed
- **Terminal** keyboard focus restoration:
  - Stopped the focus-restore loop and ensured native OS-level focus is routed into the WebView content when the Terminal **Session** becomes active.  
    PR #265 (commit(s): `9769472`, `9e37a0a`)
  - Re-established input focus after app switch by restoring focus at the OS webview level (and re-acquiring the textarea focus path).  
    PR #266 (commit(s): `a2bb052`)
  - Added a window-level focus command and wired it into Terminal focus restore and Session start (scoped so URL-pane child webviews are unaffected).  
    PR #267 (commit(s): `060719c`, `98ecdd7`)  
  - Renamed `focus_main_window` to `restore_main_window` for clarity.  
    PR #? (`3857b77`)
- **RDP** error visibility:
  - **Status Bar** now shows `remoteDesktop.rdpErrorStatus` for RDP errors regardless of debug settings.  
    PR #1994e86
- Sensitive field redaction in **RDP** debug logs.  
  PR #1994e86

## Internal
- Refreshed architecture/release docs and manual pages for the improved debug logging and settings behavior.  
  PR #8c90114, #1994e86
- Continued locale/i18n updates for the new/changed strings and debug UI support.  
  PR #1994e86

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.62/kkterm-0.1.62-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.62/kkterm-0.1.62-windows-arm64-setup.exe)

## Highlights
- URL layout controls moved to the **Connection** context menu, and terminal focus restore is improved (PR [#261](https://github.com/ryantsai/KKTerm/pull/261) by @ryantsai).
- Script-widget iframe startup is deferred/staggered so Dashboard UI stalls are reduced (PR [#262](https://github.com/ryantsai/KKTerm/pull/262) by @ryantsai). Your Dashboard gets to breathe—like a terminal waiting for the prompt.

## New
- None.

## Improved
- URL layout controls are now in the **Connection** context menu (PR [#261](https://github.com/ryantsai/KKTerm/pull/261)).
- Better terminal focus restore using WebView focus (PR [#261](https://github.com/ryantsai/KKTerm/pull/261)).

## Fixed
- None.

## Internal
- Reduced Dashboard **Dashboard Widget Instance** stalls by deferring and staggering script-widget iframe startup (PR [#262](https://github.com/ryantsai/KKTerm/pull/262)).
- Script widgets are gated by viewport intersection so off-screen script-widget iframes run less JavaScript until scrolled into view (PR [#262](https://github.com/ryantsai/KKTerm/pull/262)).
- Monitoring widgets are exempt from viewport gating so periodic/realtime widgets keep updating while off-screen (PR [#262](https://github.com/ryantsai/KKTerm/pull/262)).

---

## 亮點
- 已將 **URL 佈局**控制項移到 **Connection（連線）**的內容選單，同時也強化了終端機（terminal）回復焦點的體驗（PR [#261](https://github.com/ryantsai/KKTerm/pull/261) 由 @ryantsai 貢獻）。
- Script-widget 的 iframe 啟動改為延後/分批，降低 Dashboard UI 卡頓（PR [#262](https://github.com/ryantsai/KKTerm/pull/262) 由 @ryantsai 貢獻）。Dashboard 終於能喘口氣——就像終端機在等提示字元。

## 新增
- 無。

## 改善
- **URL 佈局**控制項改放到 **Connection** 的內容選單（PR [#261](https://github.com/ryantsai/KKTerm/pull/261)）。
- 終端機焦點回復改用 WebView focus，體驗更穩定（PR [#261](https://github.com/ryantsai/KKTerm/pull/261)）。

## 修正
- 無。

## Internal
- 透過延後與分批啟動 script-widget iframe，降低 Dashboard 的 **Dashboard Widget Instance** 卡頓（PR [#262](https://github.com/ryantsai/KKTerm/pull/262)）。
- 依視窗交會（viewport intersection）對 script-widget iframe 進行上屏/延後處理：離屏時先不必啟動過多 JavaScript，直到使用者捲入（PR [#262](https://github.com/ryantsai/KKTerm/pull/262)）。
- 偵測用（monitoring）widgets 不套用離屏閘門：定期（periodic）/即時（realtime）widgets 即使離屏也能持續更新（PR [#262](https://github.com/ryantsai/KKTerm/pull/262)）。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.61/kkterm-0.1.61-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.61/kkterm-0.1.61-windows-arm64-setup.exe)

## Highlights
- Refined URL Connection controls and moved layout options into the actions menu—no more fighting the toolbar like it’s a flaky terminal prompt.
- Improved the Notes Dashboard Widget instance to better match paper-like corners and realism.

## New
- Added **Send to AI** for **URL Connections**. ([#259](https://github.com/ryantsai/KKTerm/pull/259) by @ryantsai)

## Improved
- Refined URL toolbar actions by moving URL layout controls into the **actions menu**. ([#259](https://github.com/ryantsai/KKTerm/pull/259) by @ryantsai)
- Updated the Notes widget styling: squarer corners and a more realistic folded-corner curl. ([#260](https://github.com/ryantsai/KKTerm/pull/260) by @ryantsai)

## Internal
- Updated dashboard CSS for notes/table appearance and paper-corner realism. (`e5eb42d`, `6dd1545`, `700954f`)

---

## Highlights（繁體中文／台灣）
- 強化 **URL Connection** 的控制方式：把「版面配置」選項移到 **actions menu** 裡，讓你不用再跟工具列互相猜謎（就像終端機提示符偶爾會抽風一樣）。
- 改進「筆記」Dashboard Widget Instance 的外觀，讓紙感角落更逼真。

## New（新增）
- 為 **URL Connections** 新增 **Send to AI** 功能。([#259](https://github.com/ryantsai/KKTerm/pull/259) by @ryantsai)

## Improved（改進）
- 改良 URL 工具列操作：將 URL 版面配置控制項移到 **actions menu**。([#259](https://github.com/ryantsai/KKTerm/pull/259) by @ryantsai)
- 更新「筆記」Widget 樣式：角落更方、更像折角紙的自然捲曲感。([#260](https://github.com/ryantsai/KKTerm/pull/260) by @ryantsai)

## Internal（內部）
- 更新 Dashboard CSS，用於筆記/表格呈現與更逼真的紙角效果。(`e5eb42d`, `6dd1545`, `700954f`)

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.60/kkterm-0.1.60-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.60/kkterm-0.1.60-windows-arm64-setup.exe)

## Highlights
- **Notes Dashboard Widget:** Add fold-corner placement and **Markdown rendering** options for note text.
- **Remote Desktop (RDP/VNC) View Mode:** New toolbar controls plus **per-Connection persistence** and settings.
- **AI Providers:** Updated model recommendation catalog for several providers.

## New
- **Notes widget options:**  
  - **Fold corner** position selection  
  - **Markdown enabled** toggle for note text rendering

- **RDP/VNC:** View Mode toolbar controls, with saved behavior on a per-**Connection** basis.

## Improved
- **AI model recommendations:** Updated catalog entries for **Claude Opus 4.8**, **GPT-5.5**, **Gemini 3.5**, **Gemma 4**, and **NVIDIA Nemotron 3**.

## Fixed
- Remote Desktop view mode localization updates to match current UI labels/descriptions (light “don’t leave dangling i18n strings on the floor” energy).

## Internal
- Terminal focus behavior improvements to restore input after switching apps, including a main window focus change listener in `TerminalWorkspace`.

---

## 重要更新（繁體中文 / 台灣）
## 重點
- **Notes（筆記）Dashboard Widget：** 新增摺紙角落位置與 **Markdown 文字渲染**選項。
- **遠端桌面（RDP/VNC）檢視模式：** 新增工具列控制，並提供 **以每個 Connection（連線）為單位的保存**與設定。
- **AI 供應商：** 更新多家供應商的模型推薦清單。

## 新增
- **Notes 小工具選項：**
  - **摺紙角落（fold corner）**位置選擇
  - **Markdown 啟用**切換，用於筆記文字渲染

- **RDP/VNC：** 檢視模式工具列控制，並依每個 **Connection** 保存。

## 改進
- **AI 模型推薦：** 更新 **Claude Opus 4.8**、**GPT-5.5**、**Gemini 3.5**、**Gemma 4**、**NVIDIA Nemotron 3** 的推薦清單。

## 修正
- 遠端桌面檢視模式的在地化（i18n）內容更新，對齊目前的 UI 標籤與描述（小小提醒：別把多餘的 i18n 字串丟在地板上）。

## Internal
- 改進 Terminal 的焦點行為：在切換到其他應用後可恢復輸入；並在 `TerminalWorkspace` 加入主視窗焦點變更的事件監聽。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.59/kkterm-0.1.59-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.59/kkterm-0.1.59-windows-arm64-setup.exe)

## Highlights
- Status Bar now reflects managed X server settings, and stops polling for X server status—less “network weather forecasting”, more signal.  

## Improved
- Updated the Status Bar to align with managed X server configuration changes.  

## Internal
- Refreshed related context/docs and implementation to support the new Status Bar behavior.  

---

## 重點摘要
- 狀態列現在會反映「已管理的 X Server」設定，並停止輪詢 X Server 狀態—少一點「網路天氣預報」，多一點確定的訊號。  

## 改善
- 更新狀態列，讓它能對應已管理的 X Server 設定變更。  

## 內部
- 同步更新相關的說明文件與實作，以支援新的狀態列行為。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.58/kkterm-0.1.58-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.58/kkterm-0.1.58-windows-arm64-setup.exe)

## Highlights
- Smoother SFTP path controls in your Connection: autocomplete, recent paths, and improved inline-toolbar behavior (PR #252).
- Clearer `winget` error output by decoding exit codes and adding verbose logs for installer-related actions (PR #253).
- Better handling of rejected SSH X11 forwarding status in SSH panes, so the Session doesn’t silently “faceplant” (PR #255).

## New
- Direct AI attachment submit flow to send context with fewer steps from the Assistant Panel (PR #256).
- Localized support for direct attachment prompts and improved related translations (PR #256, commit `9f13659`).

## Improved
- Improve SFTP path controls: autocomplete, recent paths, and inline-toolbar behavior (PR #252).
- Decode `winget` exit codes and enable verbose logging for install/managed-Ollama/uninstall flows to surface more actionable details (PR #253).
- Handle rejected SSH X11 forwarding status in SSH panes using server reply status (PR #255).
- X Server: improved management/wording in localization strings and UI network tool descriptions (commit `294054d`, plus PRs contributing to X Server work).

## Fixed
- Handle rejected SSH X11 forwarding status in SSH panes (PR #255).
- Decode `winget` exit codes so installer failures show readable meaning instead of raw HRESULT integers (PR #253).

## Internal
- Normalize locale JSON key order with a new script to match source locale order (commit `36a6839`).
- Localization and translation updates for new/updated UI strings (including direct attachment prompt strings and X Server-related strings; commits `9f13659`, `294054d`).
- Workspace/assistant wiring, and various related refactors and merges (commits including `4dfc31b`, `4068e08`, `b60bafb`, `c547f34`).
- Desktop wallpaper functionality was removed along with related UI/options/tests (commit `3da255b`).

---

## 亮點
- 在你的 **Connection** 裡，SFTP 路徑控制更順手：支援自動完成（autocomplete）、最近路徑（recent paths），並改善 inline-toolbar 行為（PR #252）。
- `winget` 錯誤訊息更清楚：解碼 exit code，並在安裝相關流程加入 verbose logs（PR #253）。
- 當 SSH 的 X11 forwarding 被伺服器拒絕時，SSH **pane** 會更正確處理，避免 **Session** 直接「靜靜地壞掉」(PR #255)。

## 新功能
- 新增直接提交 AI 附件（Direct AI attachment submit）流程：從 Assistant Panel 更少步驟就能帶上上下文（PR #256）。
- 新增直接附件提示（direct attachment prompt）的多語系支援，並改善相關翻譯（PR #256，commit `9f13659`）。

## 改進
- 改進 SFTP 路徑控制：autocomplete、recent paths、inline-toolbar 行為（PR #252）。
- 解碼 `winget` exit codes，並在安裝/managed-Ollama/卸載流程啟用 verbose logs，讓失敗時更容易追到原因（PR #253）。
- 依據伺服器回覆狀態處理被拒絕的 SSH X11 forwarding，在 SSH pane 中呈現更合理的行為（PR #255）。
- X Server：在多語系字串與 UI 說明（網路管理工具描述等）上做了文字/體驗面向的改進（commit `294054d`，以及參與 X Server 的相關 PR）。

## 修正
- 修正/改善被拒絕的 SSH X11 forwarding 狀態在 SSH pane 的處理（PR #255）。
- 修正 `winget` 安裝失敗時顯示原始 HRESULT 整數不易理解的問題；現在會顯示可讀的錯誤意義（PR #253）。

## Internal
- 新增腳本用來把 locale JSON 的 key 順序規範成與來源 locale 相同（commit `36a6839`）。
- 多語系/翻譯更新（包含 direct attachment prompt 與 X Server 相關字串；commits `9f13659`, `294054d`）。
- 相關工作區/助理串接、以及各種重構與合併（commits 包含 `4dfc31b`, `4068e08`, `b60bafb`, `c547f34`）。
- 移除桌面壁紙（desktop wallpaper）功能與相關 UI/選項/測試（commit `3da255b`）。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.57/kkterm-0.1.57-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.57/kkterm-0.1.57-windows-arm64-setup.exe)

## Highlights
- Improve SSH “changed host key” handling with a clear warning and an explicit opt-in replacement flow.
- Better SFTP path input and restore terminal focus after popup interactions.

## New
- Dashboard design, visualization, and accessibility Assistant Skills.
- Custom assistant skills folder toggle, including optional custom skills folder + settings UI.
- Enable AI assistant network tools by default.
- Add fallback flow to replace a changed SSH host key (with explicit confirmation).

## Improved
- Reduce workspace connection frame padding (for all connection types).
- Open Windows Task Manager from status metrics.
- Reduce/troubleshoot popup dialog dismissal control inconsistencies across dialogs.
- SFTP: make the path input editable (and restore terminal focus after popup).
- Documentation updates for terminal backgrounds and UI behavior.
- CI release workflow alignment for both-arch installer publishing.
- Localization documentation: align i18n namespace docs and add Watchdog vocabulary; plus guidelines for context-specific keys and placeholder safety.

## Fixed
- Align “changed SSH host key” replacement/rotation expectations in host-key replace tests by @ryantsai in https://github.com/ryantsai/KKTerm/pull/251 (short SHA: 66ce06e).

## Internal
- Derive `Debug` for `SshHostKeyPreview` so host-key tests compile by @ryantsai in https://github.com/ryantsai/KKTerm/pull/249 (short SHA: 62c93b7).
- Derive `Debug` for SSH host key preview (test compilation unblock) by @ryantsai in https://github.com/ryantsai/KKTerm/pull/249 (short SHA: 71fbcfc).
- Docs / architecture / i18n alignment work items (including Watchdog terminology and source map documentation) by @ryantsai in https://github.com/ryantsai/KKTerm/pull/237 (short SHA: c61a740), https://github.com/ryantsai/KKTerm/pull/240 (short SHA: 539cf03), and https://github.com/ryantsai/KKTerm/pull/235 (short SHA: d04aed7).  

---

## 精選重點
- 修正來自工作列/托盤的桌布彈出視窗託管問題，並調整桌布相關的 Connection 行為（不再讓 popup 行為像網路問題一樣「玄學」）。
- 強化 SSH「主機金鑰已變更」處理：提供清楚警告，並且需要使用者明確確認後才會替換。
- 改善 SFTP 路徑輸入，並在彈出視窗互動後恢復終端機焦點。

## 新功能
- Dashboard 設計、視覺化與無障礙 Assistant Skills。
- 自訂 assistant skills 資料夾切換：包含選用自訂 skills 資料夾與設定 UI。
- 預設啟用 AI assistant 網路工具（network tools）。
- 新增「變更後 SSH 主機金鑰替換」的備援流程（需要明確確認）。

## 改善
- 減少所有連線類型（workspace connection）的框架內距。
- 在 Windows 狀態指標中直接開啟工作管理員（Task Manager）。
- 統一/對齊多個彈出對話框的關閉控制行為。
- SFTP：讓路徑輸入可編輯（並在彈出視窗後恢復終端機焦點）。
- 補充並整理終端機背景與 UI 行為的文件。
- CI 發佈流程對齊雙架構（both-arch）安裝程式的發佈。
- 本地化文件更新：對齊 i18n namespace 文件並加入 Watchdog 詞彙；同時補上情境式 key 與 placeholder 安全性的規範。

## 修正
- 修正托盤桌布彈出視窗託管問題：@ryantsai，https://github.com/ryantsai/KKTerm/pull/233（短 SHA: a9b9521）。
- 建立桌布 WebView 時避免使用 no-activate parent：@ryantsai，https://github.com/ryantsai/KKTerm/pull/234（短 SHA: 3d5335b）。
- 調整 SSH 主機金鑰替換/輪替後的測試預期（host-key replace 測試）：@ryantsai，https://github.com/ryantsai/KKTerm/pull/251（短 SHA: 66ce06e）。

## Internal
- 為 `SshHostKeyPreview` 衍生 `Debug`，以讓 host-key 測試能編譯通過：@ryantsai，https://github.com/ryantsai/KKTerm/pull/249（短 SHA: 62c93b7）。
- 衍生 SSH 主機金鑰預覽的 `Debug`（用於測試編譯修正）：@ryantsai，https://github.com/ryantsai/KKTerm/pull/249（短 SHA: 71fbcfc）。
- 文件 / 架構 / i18n 的對齊工作項目（包含 Watchdog 用語與 source map 文件）：@ryantsai，https://github.com/ryantsai/KKTerm/pull/237（短 SHA: c61a740）、https://github.com/ryantsai/KKTerm/pull/240（短 SHA: 539cf03）、以及 https://github.com/ryantsai/KKTerm/pull/235（短 SHA: d04aed7）。

## Direct Downloads
* 💻 [Download for Windows (64-bit)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.56/kkterm-0.1.56-windows-x64-setup.exe)
* 💻 [Download for Windows (ARM64)](https://github.com/ryantsai/KKTerm/releases/download/v0.1.56/kkterm-0.1.56-windows-arm64-setup.exe)

## Highlights
- **Dashboard Notes widget**: random rotation per **Dashboard Widget Instance**, configurable rotation, and multi-page notes with tear animation.  
- **Terminal appearance**: per-**Connection** terminal background + transparency improvements, including separate split-pane background support. (If your terminals could talk, they’d probably ask for a color palette.)
- **UI load smoothing**: lazy-mount dashboard views so you don’t pay the “mount everything now” tax.

## New
- **Notes widget**: per-instance random rotation, configurable rotation, and multi-page notes with tear animation. by @ryantsai in https://github.com/ryantsai/KKTerm/pull/227  
- **Separate split terminal backgrounds** setting. by @ryantsai in https://github.com/ryantsai/KKTerm/pull/??? (included in v0.1.56 changes via background-related commits)

## Improved
- **Avoid blocking UI during MCP bridge startup**. by @ryantsai in https://github.com/ryantsai/KKTerm/pull/226  
- **Lazy-mount dashboard views** to avoid mounting all views at once. by @ryantsai in https://github.com/ryantsai/KKTerm/pull/228  
- **Per-connection terminal opacity & background picker** (UI + persistence + storage/command plumbing). by @ryantsai in https://github.com/ryantsai/KKTerm/pull/229  
- **Folder drag-and-drop**: improved behavior and added a visible root drop target. by @ryantsai in https://github.com/ryantsai/KKTerm/pull/230  

## Fixed
- **Installer (winget bootstrap)**: fixed installer helper winget bootstrap and preserved failure logs in the stepper. by @ryantsai in https://github.com/ryantsai/KKTerm/pull/225  
- **Terminal appearance rendering**: improved background transparency handling for terminal renderer. (Included in v0.1.56 changes via terminal background/transparency commits)  

## Internal
- Release note generation docs/tooling updates for direct download links in README files. edc2419  
- App navigation persistence and workspace layout management improvements. 10b794d  
- MCP bridge startup behavior docs/implementation updates. 582eacc  
- Dashboard background popover style/structure updates. 9c84cb7  
- Connection pane folder handling and related tests. 2625e8a / 60df1fc / 2625e8a  
- Title bar icon + panel toggle behavior updates and related tests. 87b43f0  
- Background transparency/appearance default setting work (settings + rendering + tests). e328dc7  

---

## 亮點
- **儀表板 Notes 小工具**：每個 **Dashboard Widget Instance** 都有隨機旋轉、可設定旋轉角度，並支援多頁筆記與「撕裂」動畫效果。
- **終端機外觀**：讓每個 **Connection** 的終端背景與透明度（transparency）更完善，包含分割終端（split pane）可分開套用背景設定。（如果終端機會說話，大概會先問你要什麼配色。）
- **介面載入更順**：延遲掛載儀表板視圖，避免一次把所有東西都掛上去。

## 新增
- **Notes 小工具**：每個實例隨機旋轉、可設定旋轉角度、支援多頁筆記與撕裂動畫。by @ryantsai in https://github.com/ryantsai/KKTerm/pull/227  
- **分割終端可分開背景**設定。by @ryantsai in https://github.com/ryantsai/KKTerm/pull/???（v0.1.56 內的背景相關改動一併涵蓋）

## 改進
- **避免在 MCP bridge 啟動時阻塞 UI**。by @ryantsai in https://github.com/ryantsai/KKTerm/pull/226  
- **延遲掛載儀表板視圖**：避免一次掛載所有視圖。by @ryantsai in https://github.com/ryantsai/KKTerm/pull/228  
- **每個連線（Connection）的終端透明度與背景選擇器**（UI + 持久化 + 儲存/指令串接）。by @ryantsai in https://github.com/ryantsai/KKTerm/pull/229  
- **資料夾拖曳**：改進拖放行為並加入清楚可見的根目錄（root）放置目標。by @ryantsai in https://github.com/ryantsai/KKTerm/pull/230  

## 修正
- **安裝程式（winget bootstrap）**：修正安裝程式助手 winget bootstrap，並在 stepper 中保留失敗時的日誌。by @ryantsai in https://github.com/ryantsai/KKTerm/pull/225  
- **終端機外觀渲染**：改進終端渲染器的背景透明度處理。（v0.1.56 內的終端背景/透明度相關改動已涵蓋）

## Internal
- 發版說明（release note）生成與文件更新：在 README 加入 Windows 安裝程式直接下載連結相關。edc2419  
- App 導覽（navigation）持久化與工作區（workspace）版面管理改進。10b794d  
- MCP bridge 啟動相關文件/實作更新。582eacc  
- 儀表板背景彈出視窗（background popover）樣式與結構更新。9c84cb7  
- 偵錯用桌布 tray 原型實作。f3e5d2c / 29fb80a  
- 連線（Connection）窗格資料夾處理與相關測試。2625e8a / 60df1fc / 2625e8a  
- 標題列（title bar）圖示與面板切換行為更新及測試。87b43f0  
- 背景透明度/外觀預設設定工作（設定 + 渲染 + 測試）。e328dc7

## Highlights
- **More reliable tutorials navigation**: fixed tutorial match iterator handling so Tab/Pane navigation during the tutorial behaves predictably (PR #218 by @ryantsai).
- **Safer MCP bridge descriptor access**: hardened MCP bridge descriptor ACLs so other local users can’t read the descriptor on Windows (PR #220 by @ryantsai).

## New
- **Double-click header toggles** for **Connections** and **AI Assistant** panels—double-click the panel header to hide/show the panel (PR #223 by @ryantsai).

## Improved
- **Installer Helper utilities** now include **Coreutils (Microsoft.Coreutils)** for winget + download provider (PR #224 by @ryantsai).
- **WebView screenshot region layering** improvements for URL WebView so the screenshot region isn’t layered incorrectly (PR #222 by @ryantsai).

## Fixed
- **Tutorial navigation test match iterator handling** (PR #218 by @ryantsai).
- **URL WebView screenshot region layering** (PR #222 by @ryantsai).
- **Harden MCP bridge descriptor ACLs** (PR #220 by @ryantsai).

## Internal
- **Docs sync** release and roadmap status (PR #219 by @ryantsai).

---

## Highlights（重點）
- **教學導覽更可靠**：修正教學比對的 iterator 處理，讓教學過程中的 Tab/Pane 導覽行為更一致（PR #218，@ryantsai）。
- **MCP 連線橋接更安全**：強化 MCP bridge descriptor 的 ACL，避免 Windows 上其他本機使用者讀取 descriptor（PR #220，@ryantsai）。

## New（新增）
- **Connections 與 AI Assistant 面板**支援「標題列雙擊切換」：雙擊面板標題即可隱藏/顯示面板（PR #223，@ryantsai）。

## Improved（改進）
- **Installer Helper 工具**加入 **Coreutils（Microsoft.Coreutils）**：使用 winget + download provider（PR #224，@ryantsai）。
- **URL WebView 截圖區塊**的層級（layering）更正確，避免區塊被錯誤疊到（PR #222，@ryantsai）。

## Fixed（修正）
- **教學導覽測試比對 iterator 處理**（PR #218，@ryantsai）。
- **URL WebView 截圖區塊層級**（PR #222，@ryantsai）。
- **強化 MCP bridge descriptor ACLs**（PR #220，@ryantsai）。

## Internal（內部）
- **文件同步**：更新 release 與 roadmap 狀態（PR #219，@ryantsai）。

## v0.1.54

## Highlights
- App update download & installation is now supported in KKTerm (with user-facing update status prompts). Like a good terminal session, it tells you what’s happening—before it happens.

## New
- **App update download & installation functionality**  
  - Adds UI prompts and the underlying update flow, including localized update-related strings.

- **Release script improvements**  
  - Added support for a “both-arch” GitHub release script and local env file import.

## Internal
- Updated/added localization tasks and translation strings related to app update status and prompts.
- Updated release documentation and Tauri-side update implementation files.
- Added tests for app updates model and release GitHub script behavior.

---

## 亮點
- KKTerm 現已支援**下載並安裝程式更新**（搭配使用者可見的更新狀態提示）。就像一個可靠的終端機工作階段：在事情發生前就先告訴你。

## 新增
- **程式更新下載與安裝功能**
  - 提供更新提示 UI 與底層更新流程，並包含更新相關的在地化字串。

- **發佈腳本改進**
  - 新增「支援雙架構（both-arch）」的 GitHub 發佈腳本，並支援匯入本機環境檔。

## Internal（內部）
- 更新/新增與程式更新狀態與提示相關的在地化任務與翻譯字串。
- 更新發佈文件以及 Tauri 端的更新實作檔案。
- 新增 app updates model 與 release GitHub 腳本行為的測試。

## v0.1.53

## Highlights

* feat(arm64): release pipeline + arch-aware installer paths for Windows on Arm by @ryantsai in https://github.com/ryantsai/KKTerm/pull/214
* Fix duplicate Activity Rail tooltips by @ryantsai in https://github.com/ryantsai/KKTerm/pull/215
* Fix assistant screenshot region overlay by @ryantsai in https://github.com/ryantsai/KKTerm/pull/216


**Full Changelog**: https://github.com/ryantsai/KKTerm/compare/v0.1.52...v0.1.53

## Changes

- Implement DialogPortal for consistent dialog rendering and update related components (c1d1b64)
- Add Quick Commands functionality to the MCP server and Assistant Panel (83281b1)
- Add FFmpeg to Utilities section and corresponding test case (d6833a3)
- Update ROADMAP.md to mark MCP server support as implemented (005c9d8)
- Refactor documentation and localization for Installer Helper (5c54f96)
- Merge pull request #216 from ryantsai/codex/fix-screenshot-function-limitation (fbf9858)
- Fix assistant screenshot region overlay (84cb15e)
- Merge pull request #215 from ryantsai/codex/fix-double-tooltip-for-activity-rail-icons (5880e83)
- Fix duplicate rail tooltips (75bbaaa)
- Merge pull request #214 from ryantsai/claude/windows-arm64-builds-QgRfk (a3dd848)
- feat(arm64): release pipeline + arch-aware installer paths for Windows on Arm (9722227)

Compare: https://github.com/ryantsai/KKTerm/compare/v0.1.52...v0.1.53

## v0.1.52

## Highlights

* feat(packaging): add Windows on Arm (ARM64) installer build by @ryantsai in https://github.com/ryantsai/KKTerm/pull/198
* Optimize workspace pane collapse animation by @ryantsai in https://github.com/ryantsai/KKTerm/pull/199
* Add FFmpeg catalog entry with GitHub-release download provider and support for nested PATH in downloads by @ryantsai in https://github.com/ryantsai/KKTerm/pull/200
* fix(dashboard): theme AI widget bodies with a fixed self-contained palette by @ryantsai in https://github.com/ryantsai/KKTerm/pull/202
* Instrument RDP-reconnect hang to localize renderer vs UI-thread freeze by @ryantsai in https://github.com/ryantsai/KKTerm/pull/204
* Increase pane resize hit target and add subtle hinge depth by @ryantsai in https://github.com/ryantsai/KKTerm/pull/205
* Installer: support GitHub-release download providers, handle appx installers, and stabilize script-widget theming by @ryantsai in https://github.com/ryantsai/KKTerm/pull/203
* Add assistant selection Copy context menu by @ryantsai in https://github.com/ryantsai/KKTerm/pull/206
* Fix Windows build errors in heartbeat and installer by @ryantsai in https://github.com/ryantsai/KKTerm/pull/207
* Use native rail tooltips over child windows by @ryantsai in https://github.com/ryantsai/KKTerm/pull/208
* Installer Helper: interval-gated auto update check by @ryantsai in https://github.com/ryantsai/KKTerm/pull/209
* feat(release-notes): credit linked issue reporters in release notes by @ryantsai in https://github.com/ryantsai/KKTerm/pull/211
* Fix SFTP drive and symlink navigation by @ryantsai in https://github.com/ryantsai/KKTerm/pull/212
* Fix native tooltip PWSTR type mismatch by @ryantsai in https://github.com/ryantsai/KKTerm/pull/213


**Full Changelog**: https://github.com/ryantsai/KKTerm/compare/v0.1.51...v0.1.52

## Changes

- Merge pull request #213 from ryantsai/codex/fix-compile-error-in-github-actions (1d49c5c)
- Fix native tooltip PWSTR type (60d18db)
- Merge pull request #212 from ryantsai/codex/fix-sftp-connection-issues-on-windows-and-linux (b342149)
- Fix SFTP drive and symlink navigation (5f8d471)
- Merge pull request #211 from ryantsai/claude/release-notes-issue-credit-Ox7Bq (476919f)
- feat(release-notes): credit linked issue reporters in release notes (40cc1d1)
- Merge pull request #209 from ryantsai/claude/installer-helper-check-caching-a4lJm (fbc4d44)
- Installer Helper: interval-gated auto update check (d66bb63)
- Merge pull request #208 from ryantsai/codex/add-native-tooltip-support-for-rdp-activex (a8dc16f)
- Use native rail tooltips over child windows (cd4a902)
- Merge pull request #207 from ryantsai/claude/rust-build-errors-DigNU (f203a21)
- Fix Windows build errors in heartbeat and installer (3ad6472)
- Merge pull request #206 from ryantsai/codex/add-copy-menu-item-to-context-menu (f9181fb)
- Add assistant selection copy menu (65e4dab)
- Merge pull request #203 from ryantsai/codex/fix-winget-dependency-handling-in-installer-helper-7nugns (3bf9360)
- Merge remote-tracking branch 'origin/main' into codex/fix-winget-dependency-handling-in-installer-helper-7nugns (9cae0e5)
- Merge pull request #205 from ryantsai/codex/increase-hinge-drag-target-size-and-add-shadows (07edcee)
- Improve pane resize handles (8deb396)
- Merge pull request #204 from ryantsai/claude/kkterm-rdp-app-hangs-uq6Bm (d06fcd7)
- Merge remote-tracking branch 'origin/main' into work (5c88a5a)
- Instrument RDP-reconnect hang to localize renderer vs UI-thread freeze (b93fa3c)
- Merge pull request #202 from ryantsai/claude/ai-widget-styling-fixes-os8ZN (380b5fc)
- fix(dashboard): theme AI widget bodies with a fixed self-contained palette (6047f39)
- Merge pull request #200 from ryantsai/codex/add-ffmpeg-to-installer-helpers-catalog (4b7a385)
- Add FFmpeg installer download provider (7dcf70e)
- Merge pull request #199 from ryantsai/codex/optimize-pane-slide-animation-performance (d3b1b8a)
- Optimize workspace pane collapse animation (eae78a5)
- Merge pull request #198 from ryantsai/claude/windows-arm-compatibility-V9eR8 (3bd02a7)
- feat(packaging): add Windows on Arm (ARM64) installer build (1b72603)
- feat: add Installer Helper Module to README and documentation (7f56675)

Compare: https://github.com/ryantsai/KKTerm/compare/v0.1.51...v0.1.52

## v0.1.51

## Highlights

* Fix URL WebView blanking when RDP session stability (WebView2) is enabled by @ryantsai in https://github.com/ryantsai/KKTerm/pull/193
* Installer Helper: add optional download-provider choice for winget recipes by @ryantsai in https://github.com/ryantsai/KKTerm/pull/194
* Complete pending localizations by @ryantsai in https://github.com/ryantsai/KKTerm/pull/195
* Fix URL webview new-window link navigation by @ryantsai in https://github.com/ryantsai/KKTerm/pull/196
* Add widget health check tool and layout enforcement settings by @ryantsai in https://github.com/ryantsai/KKTerm/pull/197


**Full Changelog**: https://github.com/ryantsai/KKTerm/compare/v0.1.50...v0.1.51

## Changes

- feat(localization): update translations for 'rainyWindow' in multiple languages (10a9bf7)
- feat(dashboard): add 'rainy window' dynamic background and update localization (e900f9b)
- feat(localization): remove obsolete dynamic backgrounds and layout enforcement documentation; update translations for new settings (ae0dd55)
- feat(sftp): update color scheme handling and improve popup dialog positioning (5d28cc2)
- feat(appearance): add 'semiconductor' color scheme and update related settings (05c5615)
- feat(installer): add FFmpeg to catalog and update related documentation (5af93ab)
- Merge branch 'main' of https://github.com/ryantsai/KKTerm (429a068)
- feat(i18n): add "particleCursor" to dynamic backgrounds in multiple locales (33988e6)
- Merge pull request #197 from ryantsai/claude/widget-creation-robustness-a8990 (7e2e791)
- Dashboard: same-turn widget runtime-health check + self-fix loop (3e37a0e)
- feat(dashboard): add particle cursor dynamic background and related assets (b847a22)
- Fix pre-existing non-Windows Rust build breaks blocking cargo test (85ac43d)
- feat(installer): add winget as a prerequisite for various tools and implement detection (be41b27)
- Refactor installer events and remove unused delete function from state management (76aeaed)
- Dashboard: add render-time widget layout enforcement (strict/moderate/low) (4a0230a)
- Enhance installer functionality with version comparison and update checks (620c250)
- Merge pull request #196 from ryantsai/codex/analyze-and-fix-inline-link-issue (0a8b7b1)
- Fix URL webview new-window link navigation (c22ebf8)
- Merge pull request #195 from ryantsai/codex/complete-localization-todos-and-fix-missing-keys (483e19f)
- Complete pending localizations (f0e0bc0)
- Merge pull request #194 from ryantsai/codex/add-option-to-change-installer-provider (1406b9b)
- Add download installer provider choices (5af5383)
- Merge pull request #193 from ryantsai/codex/fix-blank-url-connections-with-rdp-enabled (be131bc)
- Fix URL WebView stability args (89b97bd)

Compare: https://github.com/ryantsai/KKTerm/compare/v0.1.50...v0.1.51

## v0.1.50

## Highlights

* Add inline title rename for panel and hero widget presets by @ryantsai in https://github.com/ryantsai/KKTerm/pull/188
* Fix watchdog lifecycle wonkiness and wire real tool-using interventions by @ryantsai in https://github.com/ryantsai/KKTerm/pull/189
* Apply RDP/WebView2 stability flags reliably via additional_browser_args by @ryantsai in https://github.com/ryantsai/KKTerm/pull/190
* Let AI assistant actually switch Tabs and stop tutorial hallucination by @ryantsai in https://github.com/ryantsai/KKTerm/pull/191
* Expand connection folders while searching by @ryantsai in https://github.com/ryantsai/KKTerm/pull/192


**Full Changelog**: https://github.com/ryantsai/KKTerm/compare/v0.1.49...v0.1.50

## Changes

- Merge pull request #192 from ryantsai/codex/expand-folder-by-default-on-search (be91af1)
- Expand connection folders during search (8659694)
- Merge pull request #191 from ryantsai/claude/ai-tutorial-ui-navigation-iD3BN (9bf3fc4)
- Let AI assistant actually switch Tabs and stop tutorial hallucination (c98e699)
- Merge pull request #190 from ryantsai/claude/kkterm-rdp-webview-stability-flags (1572aba)
- Apply RDP/WebView2 stability flags reliably via additional_browser_args (506b43d)
- Merge pull request #189 from ryantsai/claude/watchdog-functionality-review-QuHPA (1b3d193)
- Fix watchdog lifecycle wonkiness and wire real tool-using interventions (a134487)
- Merge pull request #188 from ryantsai/claude/translatable-widget-titles-8vDzj (5fa8698)
- Add inline title rename for panel and hero widget presets (9412ffa)

Compare: https://github.com/ryantsai/KKTerm/compare/v0.1.49...v0.1.50

## v0.1.49

## Highlights

* Fix AI assistant text clipping by wrapping long inline tokens by @ryantsai in https://github.com/ryantsai/KKTerm/pull/186
* Harden WebView2 against RDP session disconnect hangs by @ryantsai in https://github.com/ryantsai/KKTerm/pull/187


**Full Changelog**: https://github.com/ryantsai/KKTerm/compare/v0.1.48...v0.1.49

## Changes

- Merge pull request #187 from ryantsai/claude/kkterm-rdp-unresponsive-pAhXJ (ff72c34)
- Harden WebView2 against RDP session disconnect hangs (d7bbf16)
- Merge pull request #186 from ryantsai/claude/ai-pane-text-truncation-nMil4 (d3c0c76)
- Fix AI assistant text clipping by wrapping long inline tokens (1fad4a2)

Compare: https://github.com/ryantsai/KKTerm/compare/v0.1.48...v0.1.49

## Highlights
- Hermes Agent 與 OpenClaw 在 Installer Helper（已安裝狀態）新增 **Run** 與 **Add to workspace**：用起來像把「開終端機」與「把 Session 存成預設」一起打包了——系統也比較不會睡過頭。
- 安裝流程的 i18n：將 Installer 相關的 **9 個待翻譯 key** 完整翻到 **13 個非英文 locale**。

## New
- Installer Helper：Hermes Agent、OpenClaw（已安裝狀態）新增兩個動作按鈕  
  - **Run**：開啟新 PowerShell console（Hermes venv 啟用 / OpenClaw 設定本地 npm exec alias），並在互動提示先填好指令名稱  
  - **Add to workspace**：在 Connections 側邊欄新增一筆本機的 Connection（「Hermes Agent」或「OpenClaw」），每次開啟時自動啟用 venv / alias 與顯示提示

## Improved
- OpenClaw：改為 **app-local 安裝**（由 KKTerm 管理到 `%LOCALAPPDATA%\KKTerm\installer\apps\openclaw`），讓 KKTerm 對安裝、偵測與解除安裝有更直接的控制。

## Fixed
- 修正 Installer Helper 的 agent 啟動流程與 web-UI launcher 問題。
- 修正與「npm + 新安裝 nvm-windows」的情境相關的偵測/啟動問題：讓受管的 managed apps 的 npm 探測與啟動使用更新後的 PATH。
- 偵測流程：在需要時改用「已更新/持久化 Windows PATH」進行 node/npm 探測，並加入回歸測試。

## Internal
- Installer i18n：翻譯 9 個 Installer 相關 key 至所有 13 個非英文 locale（含刪除 localization_todo backlog 檔），並確認 `npm run i18n:check` 通過。
- Installer Helper：把安裝/偵測等工作移出 UI thread（避免像在同一個 Pane 裡又跑編譯又跑渲染那樣卡頓）。
- 多項 Installer Helper 與安裝器相關的偵測/文件/測試調整（含架構與手冊更新）。
- 版本變更（整理順序/分類等）與相關測試更新。
- 偵測與版本解析修正（含回歸測試），並更新 `18-installer.md`/`ARCHITECTURE.md` 文檔。  
- PR / 來源：#184、#185（by @ryantsai）。GitHub notes: https://github.com/ryantsai/KKTerm/compare/v0.1.47...v0.1.48 （SHAs 見提交：`73f1008`, `380b0a0`, `585af86`, `59041f1`）


---

## 精選重點
- Hermes Agent 與 OpenClaw 在 Installer Helper（已安裝狀態）新增 **Run** 與 **Add to workspace**：把「開終端機」和「把 Session 存成預設」一起打包，讓網路與終端工作流程更不容易卡住——就像系統比較不會半夜裝睡。
- 安裝相關 i18n：將 Installer 相關 **9 個待翻譯 key** 完整翻到 **13 個非英文 locale**。

## 新增
- Installer Helper：Hermes Agent、OpenClaw（已安裝狀態）新增兩個動作按鈕  
  - **Run**：開啟新的 PowerShell console（Hermes venv 啟用 / OpenClaw 設定本地 npm exec alias），並在互動提示先填好指令名稱  
  - **Add to workspace**：在 Connections 側邊欄新增一筆本機 Connection（「Hermes Agent」或「OpenClaw」），每次開啟時自動啟用 venv / alias 與顯示提示

## 改進
- OpenClaw：改為 **app-local 安裝**（由 KKTerm 管理到 `%LOCALAPPDATA%\KKTerm\installer\apps\openclaw`），讓 KKTerm 對安裝、偵測與解除安裝有更直接的控制。

## 修正
- 修正 Installer Helper 的 agent 啟動流程與 web-UI launcher 問題。
- 修正與「npm + 新安裝 nvm-windows」情境相關的偵測/啟動問題：讓受管的 managed apps 的 npm 探測與啟動使用更新後的 PATH。
- 偵測流程：在需要時改用「已更新/持久化 Windows PATH」進行 node/npm 探測，並加入回歸測試。

## Internal
- Installer i18n：翻譯 9 個 Installer 相關 key 至所有 13 個非英文 locale（含刪除 localization_todo backlog 檔），並確認 `npm run i18n:check` 通過。
- Installer Helper：把安裝/偵測等工作移出 UI thread（避免像在同一個 Pane 裡又跑編譯又跑渲染那樣卡住）。
- 多項 Installer Helper 與安裝器相關的偵測/文件/測試調整（含架構與手冊更新）。
- 版本變更（整理順序/分類等）與相關測試更新。
- 偵測與版本解析修正（含回歸測試），並更新 `18-installer.md`/`ARCHITECTURE.md` 文檔。  
- PR / 來源：#184、#185（by @ryantsai）。GitHub notes: https://github.com/ryantsai/KKTerm/compare/v0.1.47...v0.1.48 （SHAs 見提交：`73f1008`, `380b0a0`, `585af86`, `59041f1`）

## Highlights
- **Dashboard Tab Reorder**: Reorder tabs in Dashboard view (so your Session can follow your brain, not the other way around).  
- **Installer improvements for managed apps**: Enhanced support around installer managed app behavior and related documentation.

## New
- **Dashboard view tab reorder** (PR #183 by @ryantsai): Lets you change the order of tabs on the Dashboard view.

## Improved
- **Installer managed app support** (commit: 3cb61ad): Expanded/updated support for installer managed apps and their related catalogs/docs.
- **Installer UI log behavior** (commit: 1489027): Installer progress now shows a single in-app command log instead of duplicate legacy rendering.
- **Installer latest-version checks** (commit: 5b45dec, 1489027): Updated winget latest-version checks to pass `--accept-source-agreements`, helping fresh Windows machines return latest versions instead of “unknown” on first winget use.

## Fixed
- **Regression coverage added**: Added regression tests around installer behaviors (including dashboard/view reorder and installer log/latest-version behaviors).

## Internal
- **Installer helper catalog apps** (commit: 8903fe1): Added installer helper catalog apps and updated related architecture/docs and installer code paths.
- Wired new/updated tests into `npm run check` (commits: 5b45dec, 1489027, 3cb61ad).


---

## 亮點
- **Dashboard 分頁重排序**：在 Dashboard 視圖中重排分頁（讓你的 Session 跟著你的思路走，不必反過來）。  
- **受管理應用程式安裝器更新**：強化安裝器受管理應用程式相關支援與文件。

## 新增
- **Dashboard 視圖分頁重排序**（PR #183 由 @ryantsai 提供）：可調整 Dashboard 視圖分頁的順序。

## 改善
- **受管理應用程式安裝器支援**（commit：3cb61ad）：擴充/更新受管理應用程式的支援，並同步更新相關 catalogs/文件。
- **安裝器介面日誌顯示行為**（commit：1489027）：安裝進度現在只顯示一份內建的指令日誌，不再重複顯示舊版的重繪結果。
- **安裝器最新版本檢查**（commit：5b45dec、1489027）：更新 winget 最新版本檢查，改為傳入 `--accept-source-agreements`，協助全新 Windows 裝置在第一次使用 winget 時能回傳最新版本而非顯示「unknown」。

## 修正
- **加入迴歸測試覆蓋**：新增針對安裝器行為的迴歸測試（包含 Dashboard/視圖重排、安裝器日誌與最新版本檢查等）。

## Internal
- **安裝器 Helper Catalog Apps**（commit：8903fe1）：新增安裝器 helper catalog apps，並更新相關架構/文件與安裝器程式流程。
- 將新增/更新的測試接入 `npm run check`（commits：5b45dec、1489027、3cb61ad）。

## Highlights
- The Windows installer now correctly uses the right npm entrypoint (goodbye “program not found” when Node is actually there). ✅

## Fixed
- Fixed npm detection/installation in the Installer on Windows by using `npm.cmd` instead of spawning `npm` directly (while keeping `npm` elsewhere). (da2ada1)

## Internal
- Updated installer logic to wire the refreshed PATH runner through npm install/detection/uninstall flows, including npm package installs immediately after Node in the same Installer Helper flow. (da2ada1)
- Documentation and installer command/detection/uninstall/install internals updated. (da2ada1)

---

## 亮點
- Windows 安裝程式現在會正確使用對的 npm 入口點（告別明明有 Node 卻還報「program not found」的狀況）。✅  
（很像網管發現錯的設定檔，終於把連線救回來。）

## 修正
- 修正 Installer 在 Windows 上的 npm 偵測/安裝行為：改用 `npm.cmd` 取代直接執行 `npm`（其他平台維持使用 `npm`）。(da2ada1)

## Internal（內部）
- 更新安裝程式的流程：將更新後的 PATH runner 一併串到 npm 安裝/偵測/解除安裝等流程；並支援在同一個 Installer Helper 流程中，Node 剛安裝完立刻安裝 npm 套件而不需要重開機。 (da2ada1)
- 同步更新文件與安裝程式內部的命令/偵測/解除安裝/安裝實作。 (da2ada1)

## Highlights
- Improved RDP Connection Session resizing so **remote desktop no longer starts too small** and **doesn’t require a manual Tab/Pane nudge** to settle.
- Fixed a regression where **the RDP desktop could never appear** after connect (even while the toolbar still showed **“Connected”**).  

## New
- (Docs) Documented the **RDP native-window lifecycle invariant** in `ARCHITECTURE.md` so the off-screen staging vs on-screen re-apply behavior doesn’t get re-broken. (Think of it as putting a “do not touch” label on the terminal’s network cable.)

## Improved
- RDP automatic resolution (`remoteResolution=automatic`) now performs additional settle passes after the Session becomes displayable, applying the correct size without waiting for a Pane resize.

## Fixed
- Fixed RDP automatic resolution rendering at the wrong (small) size until a pane resize nudges the Tab.
- Hotfix: Fixed RDP desktop potentially never showing after the prior change (#180), caused by an off-screen settle path leaving the native window parked.
  - PR #180: https://github.com/ryantsai/KKTerm/pull/180
  - PR #181: https://github.com/ryantsai/KKTerm/pull/181

## Internal
- Split/organized connection dialog fields by type (including RDP) under `src/modules/workspace/connections/connection-dialog`.

---

## 重點摘要
- 改善 RDP Connection Session 的縮放行為：**遠端桌面不再一開始就太小**，也**不再需要手動去推一下 Tab/Pane** 才會「正常 settle」。
- 修正一個回歸問題：RDP 在連線後**可能永遠不會顯示桌面**（雖然工具列仍顯示 **「Connected」**）。  

## 新增
- （文件）在 `ARCHITECTURE.md` 補上 **RDP native-window lifecycle invariant** 的說明，避免再次把「離屏 staging」和「畫面上重套用」的流程搞混。（就像在終端機網路線上貼了「不要亂拔」標籤。）

## 改善
- RDP 自動解析度（`remoteResolution=automatic`）在 Session 變得可顯示後，會額外進行 settle passes，讓 Tab/Pane 不必先被調整也能套用正確大小。

## 修正
- 修正 RDP 自動解析度剛開始會以錯誤（偏小）的大小呈現，直到面板大小被調整才會變正確。
- Hotfix：修正先前改動（#180）後，RDP 桌面可能**不會顯示**的問題；原因是某段 settle 路徑把原生視窗停放在離屏狀態。
  - PR #180: https://github.com/ryantsai/KKTerm/pull/180
  - PR #181: https://github.com/ryantsai/KKTerm/pull/181

## Internal
- 整理/拆分連線對話框的欄位，依連線類型放到 `src/modules/workspace/connections/connection-dialog`（包含 RDP）。

## Highlights
- **Status Bar visibility option**: You can now show or hide the Status Bar.
- **Dashboard updates for watchdogs**: Watchdogs now appear in the bottom-right Status Bar as soon as they emit events, with richer detail when you click.

## New
- **Show/Hide Status Bar setting** (moved Connection-rail toggle to **Workspace** settings). By @ryantsai in https://github.com/ryantsai/KKTerm/pull/177
- **Watchdog Status Bar experience**: New/updated UI behavior and detail panel content for watchdogs (elapsed time, watch summary, next check, exit condition, notification method, action mode). Includes docs/manual update for the Status Bar indicator. (See commits around `WatchdogStatusBar` / `WatchdogDetail`.)

## Improved
- **AI widget-design contracts**: Strengthened contracts for dashboard widget layout, contrast, and copy, and wired them into widget creation/system instructions. By @ryantsai in https://github.com/ryantsai/KKTerm/pull/178

## Fixed
- **Installer Helper detection UI tiles**: Fixed an event payload shape mismatch so detected Installer Helper progress results apply to the correct Dashboard Widget Instance keys (instead of leaving tiles stuck at “Not installed / Checked: Never”). Added regression tests. (Fix in `events.rs`.)

## Internal
- **Installer Helper catalog & detection cache update**: Updated Installer Helper catalog and detection cache. By @ryantsai in https://github.com/ryantsai/KKTerm/pull/179
- **Installer Helper detection change**: Installer Helper now detects winget-provider tools from a local Add/Remove Programs registry snapshot (via catalog aliases) for existing installs, while still using winget for install/update/latest-version work. (Commit `4839200`.)
- **Progress event payload tests & normalization**: Regression coverage for the corrected progress event field mapping (commit `39e5f09`).

---

## 亮點
- **狀態列顯示/隱藏選項**：你現在可以選擇顯示或隱藏 Status Bar。
- **Watchdog 相關體驗更新**：Watchdog 會在右下角狀態列中於送出事件後立刻出現；點擊後可看到更完整的細節。

## 新增
- **狀態列顯示/隱藏設定**（並將 Connection-rail 切換移到 **Workspace** 設定）。由 @ryantsai 於 https://github.com/ryantsai/KKTerm/pull/177
- **Watchdog Status Bar 體驗**：新的/更新的狀態列行為與明細面板內容（包含經過時間、watch summary、下一次檢查、結束條件、通知方式、action mode）。並更新文件/手冊說明狀態列指示器。（請參考 `WatchdogStatusBar` / `WatchdogDetail` 相關提交。）

## 改善
- **AI widget 設計合約強化**：加強 Dashboard Widget Instance 的版面、對比與文案（copy）合約，並串接到 dashboard_create_widget 的工具描述與系統指示中。由 @ryantsai 於 https://github.com/ryantsai/KKTerm/pull/178

## 修正
- **Installer Helper 偵測顯示瓷磚**：修正事件 payload 結構不一致，讓 Installer Helper 的偵測進度能套用到正確的 Dashboard Widget Instance 欄位；不再讓瓷磚卡在「Not installed / Checked: Never」。並加入回歸測試。（`events.rs` 修正。）

## Internal
- **更新 Installer Helper 目錄與偵測快取**：更新 Installer Helper 目錄與偵測快取。由 @ryantsai 於 https://github.com/ryantsai/KKTerm/pull/179
- **Installer Helper 偵測方式調整**：Installer Helper 現在會從本機「新增/移除程式」的登錄快照辨識 winget-provider 工具（透過目錄 aliases），以更正確捕捉既有安裝；安裝/更新/最新版本仍使用 winget。（提交 `4839200`。）
- **進度事件欄位映射修正測試**：加入回歸測試以涵蓋已修正的 progress event 欄位對應（提交 `39e5f09`）。

*（小吐槽一下：這次修的是 payload 的「形狀」，不是你電腦的網路。Network 先別急著重開機。）*

## Highlights
- Redesigned **Installer Helper** with a popup dialog and streaming step events (less tile chaos, more terminal-friendly clarity).
- DB write latency improvements via **WAL** + **busy_timeout** to keep your UI from waiting on the network gremlins.
- Improved handling for ongoing UI flows: session teardown unblocks, and AI stream rendering is coalesced for smoother updates.

## New
- Installer Helper now uses a popup-driven dialog and stepper flow, including streaming progress and per-step expandable logs. (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/173)
- Render installer/update release notes as Markdown. (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/175)
- Completed pending locale translations. (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/176)

## Improved
- Storage/DB: enabled **WAL** + **busy_timeout** to shorten DB write latency. (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/174)
- AI UI responsiveness: coalesced streamed AI renders, improved connection-tree filtering behavior, and avoided no-op CWD updates in panes. (unblocked smoother tab/pane interactions; from https://github.com/ryantsai/KKTerm/pull/174)
- Session handling improvements to avoid cross-session FTP/VNC shutdown blocking and to harden WebView start reservations. (from https://github.com/ryantsai/KKTerm/pull/174)

## Fixed
- Storage IDs: made generated IDs collision-proof using a process-wide monotonic counter (prevents UNIQUE constraint failures when IDs are generated within the same millisecond). (from https://github.com/ryantsai/KKTerm/pull/174)
- Installer Helper console-flash storm: detection/version-check spawns now use `CREATE_NO_WINDOW`, and update checks stream incrementally so the UI doesn’t freeze on large update sets. (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/173)
- Storage locking: recover uniformly from a poisoned mutex for better stability (instead of “lock is poisoned” until restart). (from https://github.com/ryantsai/KKTerm/pull/174)

## Internal
- perf/storage: recover poisoned lock uniformly; offload async-command DB work (WAL-safe import path and related storage updates). (from https://github.com/ryantsai/KKTerm/pull/174)
- perf/ui: coalesce AI stream renders; defer connection search filtering updates; skip no-op cwd updates. (from https://github.com/ryantsai/KKTerm/pull/174)
- perf(sessions): unblock cross-session FTP/VNC close; harden WebView start. (from https://github.com/ryantsai/KKTerm/pull/174)

---

## 重點摘要
- **安裝器助手（Installer Helper）**改版：使用彈出式對話框與串流步驟事件（少一點磁磚地獄，多一點終端機式清楚）。
- 透過 **WAL** + **busy_timeout** 改善資料庫寫入延遲，避免介面因等待而卡住（不再讓 UI 跟網路惡作劇硬碰硬）。
- 強化持續進行中的流程：包含 session 關閉不卡住彼此、以及 AI 串流渲染更順暢。

## 新增
- 安裝器助手改為「彈出式對話框 + 分步步驟器（stepper）」流程，包含串流進度與每一步可展開的日誌。 (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/173)
- 將更新/安裝相關的 release notes 以 Markdown 方式渲染。 (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/175)
- 完成所有未完成的語系翻譯。 (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/176)

## 改善
- Storage/DB：啟用 **WAL** + **busy_timeout** 以縮短 DB 寫入延遲。 (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/174)
- AI 介面回應：合併 AI 串流渲染、改善連線樹（connection-tree）篩選行為、並在 Pane 中避免不必要的 CWD 無效更新（讓分頁/Pane 互動更順）。 (自 https://github.com/ryantsai/KKTerm/pull/174)
- Session 處理強化：避免 FTP/VNC 的跨 session 關閉互相阻塞，並強化 WebView 啟動保留（reservation）。 (自 https://github.com/ryantsai/KKTerm/pull/174)

## 修正
- Storage ID：使用「程序級單調遞增計數器」使生成的 ID 不會碰撞（避免同一毫秒內生成造成 UNIQUE constraint 失敗）。 (自 https://github.com/ryantsai/KKTerm/pull/174)
- 安裝器助手：修正 console-flash 騷擾（偵測/版本檢查啟動改用 `CREATE_NO_WINDOW`），並讓更新檢查能逐步串流，避免一次性大型更新資料導致介面凍結。 (by @ryantsai in https://github.com/ryantsai/KKTerm/pull/173)
- Storage locking：一致地從 poisoned mutex 恢復（不再出現直到重啟前都報「lock is poisoned」的狀況）。 (自 https://github.com/ryantsai/KKTerm/pull/174)

## Internal
- perf/storage：一致地從 poisoned lock 恢復；將 async 指令的 DB 工作卸載（包含 WAL 安全的匯入路徑與相關 storage 更新）。 (自 https://github.com/ryantsai/KKTerm/pull/174)
- perf/ui：合併 AI 串流渲染；延後連線樹搜尋篩選更新；略過無效 cwd 更新。 (自 https://github.com/ryantsai/KKTerm/pull/174)
- perf(sessions)：解除跨 session FTP/VNC 關閉互相卡住；強化 WebView 啟動。 (自 https://github.com/ryantsai/KKTerm/pull/174)

## Highlights
- **Installer Helper (Windows):** New Settings control to hide the Installer Helper **icon on the Activity Rail**.
- **Dashboard widgets:** Enable **widget file drag-and-drop** from Windows Explorer into AI Created Dashboard Widgets (and improved file bridge documentation).
- **Dashboard AI Created Widgets:** Updated script editor flow for **Dashboard Widget Instance** script customization (view source now supports **Edit / Save / Cancel**).

## New
- **Installer Helper module (Windows):** Adds an Installer Helper **Activity Rail Module** to install, update, and uninstall a curated Windows developer tools catalog. (PR [#167](https://github.com/ryantsai/KKTerm/pull/167), [#168](https://github.com/ryantsai/KKTerm/pull/168), [#170](https://github.com/ryantsai/KKTerm/pull/170), [#171](https://github.com/ryantsai/KKTerm/pull/171), [#172](https://github.com/ryantsai/KKTerm/pull/172) by @ryantsai)

- **Settings → Installer Helper:** Add a rail visibility toggle to control whether the Installer Helper icon appears on the Activity Rail. (PR [#172](https://github.com/ryantsai/KKTerm/pull/172) by @ryantsai)

- **Dashboard AI script editing:** Advanced script editor for **Dashboard AI Created Widgets** with **Edit / Save / Cancel** in `View source`. (PR [#171](https://github.com/ryantsai/KKTerm/pull/171)? no—see commit below: sha `1c7cfde`)

## Improved
- **Installer Helper UI:** Installer Helper icons now use a **grid view** with square tiles, status dots, and expanded details while keeping the existing install/uninstall/options/log layout. (PR [#171](https://github.com/ryantsai/KKTerm/pull/171) by @ryantsai; sha `bf1ad69`)
- **Installer Helper installs “stall” clarity:** Installer Helper now provides heartbeat-style progress behavior (helps distinguish “actually working” vs “hung while reading”). (PR [#171](https://github.com/ryantsai/KKTerm/pull/171) by @ryantsai; sha `bf1ad69`)
- **Installer Helper catalog trust model:** Switch Installer Helper catalog from **remote signed** to **compile-time bundled** (shipped with the KKTerm release). (PR [#170](https://github.com/ryantsai/KKTerm/pull/170) by @ryantsai; sha `7e55a5c`)
- **Default rail visibility:** Installer Helper rail icon defaults to **hidden** until users opt in from **Settings → Installer Helper**. (sha `171c53c`; Settings update in PR [#172](https://github.com/ryantsai/KKTerm/pull/172))
- **Widget file drag-and-drop (Windows):** Enable **drag-and-drop** for widget files from **Windows Explorer** into AI-created dashboard widgets. (PR [#168](https://github.com/ryantsai/KKTerm/pull/168) by @ryantsai; sha `847b9a7`)

## Fixed
- **Installer Helper review issues:** Address review feedback across installer helper logic/UI. (sha `d76404d`)
- **Dashboard data safety across schema bumps:** Stop wiping Dashboard tables on every `SCHEMA_USER_VERSION` bump; dashboard data now drops only for `< 16`. (sha `3509d48`)

## Internal
- **Connection/session credentials:** Add reusable connection password credentials work (docs + storage/secrets related). (sha `afeabda`)
- **Custom title bar mandatory:** Make custom title bar mandatory. (sha `8de0362`)
- Version/build bump: `vsrsion bump` (sha `44a3eac`)
- Merge housekeeping: `Merge branch 'main'...` (sha `c78d005`), `Merge main into Installer Helper branch` (sha `2299dca`), `Merge pull request...` (shas `838e4c5`, `3509d48`, `c78d005` etc.)

---

## 亮點
- **Installer Helper（Windows）：** 新增 Settings 選項，可隱藏 **活動軌道（Activity Rail）** 上的 Installer Helper 圖示。
- **儀表板小工具：** 讓你可以把 **小工具檔案** 從 **Windows 檔案總管（Explorer）** 拖曳到 AI 建立的儀表板小工具中（也補強了檔案橋接文件）。
- **Dashboard AI 建立小工具：** 已更新腳本編輯器流程；在 `View source` 現在支援 **編輯 / 儲存 / 取消**。

## 新功能
- **Installer Helper 模組（Windows）：** 新增 Installer Helper **活動軌道模組**，可安裝、更新與解除安裝精選的 Windows 開發工具目錄。（PR [#167](https://github.com/ryantsai/KKTerm/pull/167)、[#168](https://github.com/ryantsai/KKTerm/pull/168)、[#170](https://github.com/ryantsai/KKTerm/pull/170)、[#171](https://github.com/ryantsai/KKTerm/pull/171)、[#172](https://github.com/ryantsai/KKTerm/pull/172) 由 @ryantsai 提供）

- **Settings → Installer Helper：** 新增活動軌道圖示顯示/隱藏切換。 （PR [#172](https://github.com/ryantsai/KKTerm/pull/172) 由 @ryantsai 提供）

- **Dashboard AI 腳本編輯：** Dashboard AI 建立小工具的進階腳本編輯器，在 `View source` 支援 **編輯 / 儲存 / 取消**。（提交 `1c7cfde`）

## 改進
- **Installer Helper 介面：** 圖示改為 **格狀網格（grid view）**，方形磁貼搭配狀態圓點；點擊磁貼會展開詳細內容，同時保留既有的安裝/解除安裝/選項/記錄區塊。（PR [#171](https://github.com/ryantsai/KKTerm/pull/171) 由 @ryantsai；sha `bf1ad69`）
- **Installer Helper 安裝更清楚：** 增加「心跳式」進度行為，幫助分辨到底是仍在運作，還是卡在讀取過程。（PR [#171](https://github.com/ryantsai/KKTerm/pull/171) 由 @ryantsai；sha `bf1ad69`）
- **Installer Helper 目錄（catalog）信任模型：** 將目錄由 **遠端簽章（remote signed）** 改為 **編譯時打包（compile-time bundled）**（隨 KKTerm 發行版本一起提供）。（PR [#170](https://github.com/ryantsai/KKTerm/pull/170) 由 @ryantsai；sha `7e55a5c`）
- **預設活動軌道顯示：** Installer Helper 圖示預設為 **隱藏**，直到你在 **Settings → Installer Helper** 自行選擇啟用。（sha `171c53c`；Settings 更新在 PR [#172](https://github.com/ryantsai/KKTerm/pull/172)）
- **Windows 小工具拖曳檔案：** 啟用從 **Windows 檔案總管（Explorer）** 拖曳小工具檔案到 AI 建立的儀表板小工具。（PR [#168](https://github.com/ryantsai/KKTerm/pull/168) 由 @ryantsai；sha `847b9a7`）

## 修正
- **Installer Helper 審查問題修正：** 修正 Installer Helper 相關流程/介面中的審查回饋。（sha `d76404d`）
- **儀表板資料在 schema 更新時的保護：** 不再因為任何 `SCHEMA_USER_VERSION` 提升就清空 Dashboard 表；Dashboard 只會在 `< 16` 時才會被移除。（sha `3509d48`）

## Internal
- **連線/Session 密碼憑證：** 新增可重複使用的連線密碼憑證相關工作（含文件與 storage/secrets）。（sha `afeabda`）
- **自訂標題列強制：** 使自訂標題列成為必填。（sha `8de0362`）
- 版本/建置更新：`vsrsion bump`（sha `44a3eac`）
- 合併/維護：`Merge branch 'main'...`（sha `c78d005`）、`Merge main into Installer Helper branch`（sha `2299dca`）、各種 PR 合併（shas `838e4c5`、`3509d48`、`c78d005` 等）

## Highlights
- Easier-to-use SFTP toolbar browser via a popup (because rummaging around tabs is a chore).
- Improved Connection visibility and native URL handling for RDP and webview-based Sessions.

## New
- **SFTP toolbar browser opens as a popup**. *(c5c903b)*

## Improved
- **Fix native URL handling** for webview-based functionality. *(55aacd0)*
- **Improve RDP Session visibility** behavior. *(55aacd0)*

## Fixed
- **RDP session visibility** and **native URL** issues addressed. *(55aacd0)*  
- **SFTP toolbar browser presentation** corrected to use a popup. *(c5c903b)*

## Internal
- Updated documentation and tests for SFTP toolbar popup. *(c5c903b)*
- Added/updated RDP and webview visibility lifecycle tests. *(55aacd0)*

## Highlights
- Fixed App Launcher behavior so toggling **Show file extensions** no longer wipes pinned shortcuts.
- Improved Dashboard so dynamic content (including video backgrounds) continues playing when KKTerm loses OS window focus.
- Added **child connection workspace mode** for Connection tabs/Panes within a Session workspace.

## New
- **Child connection workspace mode** for Connection tabs and Pane layouts by @ryantsai in https://github.com/ryantsai/KKTerm/pull/166

## Improved
- Kept Dashboard dynamic and video backgrounds playing when other OS windows take focus (animations don’t “freeze” just because you alt-tabbed) by @ryantsai in https://github.com/ryantsai/KKTerm/pull/161
- Fix App Launcher icon-mode grid trailing empty slot by @ryantsai in https://github.com/ryantsai/KKTerm/pull/162
- Improved connections sidebar: fixed **folder drag reorder** and added **Show All** flat connections view by @ryantsai in https://github.com/ryantsai/KKTerm/pull/163
- Localized UI text for **appLauncher.showFileExtensions** and **connections.showAll** across all 13 locales by @ryantsai in https://github.com/ryantsai/KKTerm/pull/164
- Added an **AI Agent contribution section** to CONTRIBUTING.md by @ryantsai in https://github.com/ryantsai/KKTerm/pull/165

## Fixed
- App Launcher pinned shortcuts were wiped when toggling **Show file extensions** by @ryantsai in https://github.com/ryantsai/KKTerm/pull/160
- (Docs/under-the-hood) Dashboard URL WebView background popover overlap fix by @ryantsai in commits around 92993fd and 8392a4a

## Internal
- Updated docs (architecture / dashboard manual) in commits around 1d78fe9
- Added/updated regression coverage for WebView visibility lifecycle in tests/webview-visibility-lifecycle.test.mjs and wired into `npm run check` (as part of the Dashboard WebView fixes around 8392a4a)

## Highlights
- Dashboard: right-click menus should behave again when widgets overlap the canvas, and idle background animations now pause when the Dashboard isn’t actively visible (so your RTX workload can also take a nap).
- App Launcher: you can show file extensions via a new widget setting.
- RDP: Session display sync/disconnect handling was adjusted to avoid spurious “Remote desktop disconnected” states during resize/display sync.

## New
- App Launcher: added a **“Show file extensions”** setting, including the display logic (**@ryantsai** in **#159** — https://github.com/ryantsai/KKTerm/pull/159).

## Improved
- Dashboard: fixed widget right-click behavior so embedded Connection panes don’t eat right-click, and the widget frame menu actions remain reachable (**@ryantsai** in **#158** — https://github.com/ryantsai/KKTerm/pull/158).
- Dashboard: idle background animations now pause when the Dashboard is hidden, the window is minimized, or another app is in front, and resume without visual jumps.
- RDP Session: updated the resolution dropdown behavior to show **Automatic + fixed resolutions** (removed “Smart Sizing” and “DPI Zoom” from the dropdown), and normalized saved values so dead options don’t appear (**28c7b91**).

## Fixed
- Dashboard: fixed right-click and pause behavior for Dashboard background animations (**@ryantsai** in **#158** — https://github.com/ryantsai/KKTerm/pull/158).
- RDP: removed an “ActiveX reconnect fallback” during display sync failures that could turn a normal “resize not ready yet” into a disconnect state (**7752ccf**).
- RDP Tabs: tab auto-close behavior was moved toward event-driven Session disconnect handling (instead of the earlier polling/removed auto-close path) to prevent incorrect Tab closure timing (**8f932c2**, **ff17388**).

## Internal
- Docs & i18n alignment with the current Dashboard codebase (removed stale legacy widget/preset references; updated manuals and locale keys) (**@ryantsai** in **#157** — https://github.com/ryantsai/KKTerm/pull/157).
- RDP resolution options regression test added (**28c7b91**) and updated tests to validate event-driven Tab auto-close behavior (**8f932c2**).
- Terminal context menu rendering: routed through a portal so it escapes Dashboard widget transforms/overflow constraints (**be72504**).

## Highlights
- Quick Connect: embedded **elevated local terminals** are now available (because Windows UAC occasionally needs to be reminded who’s boss).
- Quick Command Bar: introduces a **Quick Command Library** with **tmux scroll handling** for faster command workflows.
- Dashboard: fixes the **tab color picker**.
- Localization: translates multiple UI areas (watchdog, settings, dashboard, and Quick Command UI) across **all 13 locales**.

## New
- Embed elevated **Quick Connect local terminals** for convenience when you need admin-level sessions. (codex, by @ryantsai in [#152](https://github.com/ryantsai/KKTerm/pull/152), [c0ccc9b])
- Quick Command Bar library + tmux scroll handling. (codex, by @ryantsai in [#155](https://github.com/ryantsai/KKTerm/pull/155), [8b7b48f])

## Improved
- Dashboard **tab color picker** fix for the right shade on the right Tab. (codex, by @ryantsai in [#154](https://github.com/ryantsai/KKTerm/pull/154), [0ad9f3f])
- Localization updates: translate watchdog, ai.watchdogApproval, settings, dashboard, and quickCommands UI strings across **all 13 locales**. (by @ryantsai in [#156](https://github.com/ryantsai/KKTerm/pull/156), [9ac23df])
- Remove wiki module and update settings export. (codex, by @ryantsai in [#153](https://github.com/ryantsai/KKTerm/pull/153), [86610f7])

## Fixed
- Fixed dashboard tab color picker. (by @ryantsai in [#154](https://github.com/ryantsai/KKTerm/pull/154), [0ad9f3f])

## Internal
- Quick Command Bar library implementation and documentation updates. (by @ryantsai in [#155](https://github.com/ryantsai/KKTerm/pull/155), [72b8f94], [tests/quick-command-library-taxonomy.test.mjs])
- Localization work includes translated Quick Command Library strings and completed localization_todo closures. (by @ryantsai, [01b64a3], [8af5ec1], [9ac23df])

## Highlights
- Workspace Tabs: double-click a Tab title for inline rename (Enter/blur saves, Escape cancels) and middle-click a Tab to close it. (If your fingers are fast, your Tabs will be, too.)

## New
- Implemented the Workspace Tab feature, including per-Tab `displayTitle` state so renaming a Tab doesn’t rename the underlying **Connection**.

## Improved
- Double-clicking a Tab title now opens inline rename; Enter/blur commits changes and Escape cancels.

## Fixed
- Renaming a Tab no longer affects the underlying **Connection** title.

## Internal
- Updated workspace manual and styling/i18n for Workspace Tabs (`workspace.css`, `04-workspace-tabs-panes.md`, and all locale files).

## Highlights
- Smarter Codex usage fallback for AI coding guidance: when the preferred refresh path doesn’t work, KKTerm can pull `/wham/usage` data from your local Codex auth (where available).
- Prevents “missing window” surprises on Windows: if the main window is restored off-screen, KKTerm relocates it so you can get back to your Tabs and Panes without the hunt.

## New
- Added a Codex `/wham/usage` fallback path for AI coding usage normalization (uses `~/.codex/auth.json` or `CODEX_HOME/auth.json`, with HTTPS/local-only filtering where applicable).  
  - Preserves the full `/wham/usage` payload as raw provider JSON when this fallback path is used (so quota/limit details remain available for future explicit UI expansion).

## Improved
- Improved Windows window restore behavior: KKTerm now detects when the main window rect doesn’t overlap the Windows virtual desktop and moves/resizes the window to `0,0` at `1440x940`.  
  - Runs during startup restore, tray restore, and second-instance focus.

## Fixed
- Removed the SSH/local Terminal Codex/Claude Code detection path entirely (and its UI/badge wiring), including:  
  - Deleted `agentDetection.ts` and its associated detection test wiring  
  - Removed terminal agent badge CSS/locale key and updated the terminal manual to stop documenting the badge  
  - Added a guard test (`no-terminal-agent-detection.test.mjs`) to prevent the detection file/wiring from creeping back in

- Installer smoke test cleanup: during normal cleanup it now removes `HKCU\Software\Ryan Tsai\KKTerm` in `scripts/smoke-installer.ps1`, while skipping this deletion when `-KeepInstall` is used—matching the existing “keep cleanup artifacts” behavior. (Yes, your registry should be clean—unless you asked it not to be.)

## Internal
- None

## Highlights
- **AI watchdog:** Structured monitors with intervention and a status-bar UI—no more silent “prompt prefix that fell through to chat.” (rebased from #120) ([#140](https://github.com/ryantsai/KKTerm/pull/140), @ryantsai) *(ab10c8b / 1935910)*
- **Dashboard widget scaffolds:** New **widget archetype** scaffolding to help set up Dashboard Widget Instance foundations for **[codex]** workflows. ([#147](https://github.com/ryantsai/KKTerm/pull/147), @ryantsai) *(5b0b6e8 / 5eaad64)*

## New
- **[codex] Widget archetype scaffolds** for Dashboard Widgets (templates/scaffolds). ([#147](https://github.com/ryantsai/KKTerm/pull/147), @ryantsai) *(5b0b6e8 / 5eaad64)*
- **AI watchdog monitors with intervention** (structured monitor/actor runtime + status-bar UI). ([#140](https://github.com/ryantsai/KKTerm/pull/140), @ryantsai) *(1935910)*

## Improved
- **Terminal external links:** Shift-click an `http/https` link in **any terminal Pane** and it opens in your OS default browser. This applies across local, SSH, Telnet, and Serial terminal Sessions (shared xterm renderer). *(af9767c)*
- **Script-widget timing hardening:** Script-widget `rAF` now honors `body.lifecycle.minTickMs`, clamped with a safe lower bound; widgets without a declared cadence keep the existing default. *(ab10c8b)*

## Fixed
- **Watchdog trigger refiring** issues addressed so interventions don’t keep waking up like a misconfigured alert daemon. *(16de505)*
- **(Support change) Widget callable-library surface guidance:** Mermaid is no longer advertised/auto-inferred in the AI “Created Widget” callable library surface; related validator/schema + prompt guidance + tests updated accordingly. *(55b526a)*

## Internal
- **Removed public promotion log** from `docs/PROMOTION.md`. *(d99a366)*
- **Promotion-related docs updates** (OpenSourceAlternative, outreach email, Tauri, landing pages, feedback kit, etc.). *(2113b98, 6e9835e, 02228f8, bd61780, c6d0404, 5ca106a, e363c13, 75d8323, 5036e49, a128ba2, a6df7a7)*  
- **Version bump / lockfile updates**. *(7949922)*

## Highlights

- No user-facing highlights were provided for this release. (Your terminal is still waiting for something exciting.)

## Internal

- Updated Cargo lockfiles (`.env.example`, `src-tauri/Cargo.lock`) as part of the v0.1.34 release.  
  - Commit: `e2f856e` — “updated cargo lock”

## Highlights
- Dashboard Connection widget Session/Tab/Pane creation now resolves tmux IDs in an effect (reducing render-time churn and avoiding brief ID reuse when switching Connections).  
- System tray/assistant “external-open” events now switch the app shell to the Workspace Module before opening/focusing the target Connection.

## New
- Added comments to `.env.example` (because even terminals like a little guidance).

## Improved
- Dashboard Connection widget: resolve tmux id in an effect using the reuse-first helper, then create the Tab/Pane from that id (instead of calling `appendTmuxSessionId()` during render). Also keyed by `connection.id` to avoid momentary reuse while switching widget Connections.  
  - PRs/changes include `tests/dashboard-connection-widget-tmux.test.mjs`, `src/modules/dashboard/widgets/builtin/connections/ConnectionWidget.tsx`, and `docs/manual/10-dashboard.md` (via the same update set as https://github.com/ryantsai/KKTerm/pull/139).
- System tray behavior note updated in the manual to match the updated external-open flow.  
  - Updated: `docs/manual/01-getting-started.md`

## Fixed
- Docs consistency updates:
  - Marked File Explorer as **planned** in architecture diagrams.
  - Corrected Dashboard animated canvas background count from 9 to 21 across all README locales (full list included in the PR).
  - Fixed contributing guide widget path from `src/dashboard/widgets/` to `src/modules/dashboard/widgets/builtin/`.
  - Replaced non-existent `mist` background reference with `ocean` in all locales.
- Updated tray/assistant external-open events so the app shell switches to the Workspace Module before opening or focusing the Connection (instead of racing ahead of the module switch).
  - Updated: `src/App.tsx`, `src/modules/workspace/connections/ConnectionSidebar.tsx`

## Internal
- Docs maintenance: pruned/reorganized `AGENTS.md` into a smaller “routing + guardrails” doc and moved the durable architectural/source-of-truth burden back to `CONTEXT.md`, `docs/ARCHITECTURE.md`, product docs, and manual docs.
- Docs/readme updates across all languages reflecting current codebase state (PR #139 by @ryantsai): https://github.com/ryantsai/KKTerm/pull/139

## Highlights
- App Launcher drop target now covers the full Dashboard Widget Instance body (no more “your file is hovering, but not landing”).
- URL Pane is contained to its nearest host panel (Dashboard Connection widget, embedded split Pane, or Workspace Canvas)—so it can’t spill into adjacent panes/panels.
- Custom titlebar work continues: the titlebar appearance is now theme-integrated and better aligned, with a fix to custom titlebar chrome.

## New
- **Built-in MCP server (kkterm-cli)** is now wired end-to-end and expanded (21 tools), with **Module** terminology defined. PR #135 by @ryantsai (see PR #135).
- AI Coding Usage documentation added for the **AI Coding Usage widget** and the built-in MCP server; **aider** mentions dropped. PR #137 by @ryantsai (see PR #137).

## Improved
- App Launcher icon grid row spacing adjusted so extra widget height doesn’t stretch the row tracks. (PR #132? see: “Make App Launcher drop target…” and “fixed the row spacing too.”)
- Terminal-pane containment fix for URL Pane rendering updated to document contained URL Pane behavior. (PR #136? see WebViewWorkspace containment fix details in commits; PR #136 is the src/ restructure, and the containment change is in the PR with SHA 71d9be9.)

## Fixed
- Fixed **custom titlebar chrome**. PR #134 by @ryantsai.
- Fixed **titlebar button position**. (Test referenced: `tests/titlebar-theme.test.mjs`.)
- Fixed **App Launcher drop target** to cover the full widget body. PR #132 by @ryantsai.
- Fixed **URL Pane containment** by clamping WebView2 native bounds to the nearest host panel/pane/canvas and adjusting URL webview layout behavior. (Regression coverage added via `tests/webview-toolbar-layout.test.mjs`.)
- Fixed **MCP tool input/Enter handling** for terminal sessions by mapping submit behavior to use carriage return (`\r`) with the expected “pressEnter” semantics. PR #? (commit SHA `6a9eabe`).
- Fixed **MCP config dialog** UI/behavior details (close button placement, config snippet path resolution, and opening real user config file). PR #? (commit SHA `1bd8d96`).

## Internal
- Restructured `src/` to mirror **Module** domain language. PR #136 by @ryantsai.
- Added/reworked built-in MCP server/config documentation and logging improvements (including debug JSONL logging to `mcp.debug.log`).
- Release-engineering script hardening and resilience (e.g., tolerate missing GitHub release), plus updated release tooling.
- Rendered the committed `demo.gif` in all READMEs to remove placeholder imagery. PR #138 by @ryantsai.
