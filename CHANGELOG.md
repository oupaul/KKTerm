# Changelog

All notable changes to KKTerm are documented here.

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
