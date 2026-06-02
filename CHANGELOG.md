# Changelog

All notable changes to KKTerm are documented here.

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
