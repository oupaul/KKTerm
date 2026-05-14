<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>本地優先、Windows 優先的管理工作區：終端機、遠端連線、檔案傳輸、Dashboard 與需審批的 AI 輔助。</strong>
</p>

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm/stargazers">
    <img src="https://img.shields.io/github/stars/ryantsai/KKTerm?style=social" alt="GitHub stars" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/ryantsai/KKTerm" alt="MIT License" />
  </a>
  <br />
  <sub><a href="README.md">English</a></sub>
</p>

---

KKTerm 是給長時間在終端機、遠端主機、檔案瀏覽器與小型管理工具之間切換的人使用的桌面應用。它把已儲存的 Connection、即時 Session、分割終端窗格、SFTP/FTP 檔案傳輸、URL WebView、RDP/VNC 工作區、Widget Dashboard，以及 AI Assistant 整合在一個原生 Tauri v2 應用裡。

重點是：KKTerm 是本地優先。持久資料存在本機 SQLite，密碼與 API key 存在作業系統鑰匙圈，預設不記錄終端內容，也不需要雲端帳號或分析遙測。

## 特別之處

- **多種連線集中在同一個工作區**：本機 shell、SSH、Telnet、Serial、URL/WebView2、RDP、VNC、FTP、FTPS，以及從 SSH 啟動的 SFTP。
- **理解 Session 的終端窗格**：一個終端 Tab 可分割窗格，切換 Tab 不會卸載即時 Session，SSH 窗格可使用穩定的 tmux session 重新 attach。
- **真正可用的檔案傳輸**：雙欄本機/遠端瀏覽器、遞迴上傳下載、傳輸佇列、覆蓋提示、遠端屬性、SFTP chmod 與 chown。
- **Windows 原生整合**：ConPTY/local PTY、WebView2、Microsoft RDP ActiveX、系統匣選單、目前使用者 NSIS 安裝程式，以及 Windows CPU/RAM/網路狀態。
- **Dashboard Widgets**：多個持久 Dashboard View、12 欄拖放/調整大小網格、App Launcher widget，以及 AI 建立的驗證式 content widget 或隔離 iframe script widget。
- **有審批邊界的 AI**：聊天、選取的終端 context、截圖、指令提案、Dashboard 工具與多 provider 設定，但不自動執行指令。
- **本機備份與匯入**：設定與 Connection 資料可匯出/匯入為 KKTerm settings ZIP；啟動與手動備份使用同一種可匯入格式。
- **無遙測姿態**：沒有 analytics、沒有自動 crash upload；診斷資料是本機檔案，由使用者檢查後自行決定是否分享。

## 目前功能地圖

| 區域 | 目前已實作 |
| --- | --- |
| **Connections** | SQLite 樹狀資料、資料夾/子資料夾、搜尋、拖放排序、重新命名、複製、刪除、Quick Connect、自訂圖示、釘選/作用中 rail 捷徑 |
| **Terminal** | 本機 shell、SSH、Telnet、Serial、分割窗格、xterm.js renderer、可用時啟用 WebGL glyph rendering、scrollback 搜尋、本機啟動目錄/啟動 script |
| **SSH** | 原生 `russh` 路徑、agent/key/password 驗證、host key 信任流程、可選 system SSH fallback、ProxyJump 欄位、SSH port forwarding、tmux list/rename/close/mouse 控制 |
| **SFTP / FTP** | SSH 啟動的 SFTP 與 FTP/FTPS Connections、雙欄瀏覽器、遞迴傳輸、佇列/取消/清除紀錄、衝突處理、屬性、支援時可 chmod/chown |
| **URL WebView** | 內嵌 WebView2 URL Session、導覽工具列、favicon 擷取、網站憑證 metadata/fill、data partition metadata |
| **Remote Desktop** | 透過 Windows ActiveX 的 RDP，含 geometry-scoped overlay parking；VNC 透過 `vnc-rs` framebuffer 繪製到 workspace canvas |
| **Dashboard** | 持久 Views、widget instances、edit mode、拖放/調整大小、App Launcher、AI 建立的 content/script widgets、每個 widget 的 preset/accent/icon/title/settings |
| **AI Assistant** | 串流聊天、OpenAI-compatible runtime、provider registry、指令提案安全分類、截圖/context 附件、經驗證的 Dashboard tool calls |
| **Settings** | General、Appearance、Credentials、AI、SSH、Terminal、URL、RDP、VNC、Dashboard、About；自訂 UI 字型、minimize-to-tray、Don't Sleep、備份/匯入 |
| **Localization** | i18next UI，English 為來源，動態載入 zh-TW、zh-CN、ja、ko、fr、de、es、es-MX、it、pt-BR、th、id、vi 等 locale |

## AI Providers

前端 registry 目前包含：

OpenAI、Anthropic、OpenRouter、DeepSeek、Grok、Azure OpenAI、LiteLLM、GitHub Copilot、Ollama、NVIDIA，以及通用 OpenAI-compatible endpoints。

Provider metadata 與模型選項位於 `src/ai/providerRegistry/`；Rust provider adapters 位於 `src-tauri/src/ai/providers/`。API keys 透過作業系統鑰匙圈儲存，不放進 SQLite。

## 本地優先資料模型

KKTerm 使用清楚的領域邊界：

- **Connection**：儲存在 SQLite 的持久資源，例如 SSH host 或 URL。
- **Quick Connect**：未儲存的一次性草稿，用來啟動 Session。
- **Session**：即時 runtime state，例如 PTY、SSH channel、SFTP browser、WebView2 host、RDP control 或 VNC framebuffer。
- **Tab**：前端 workspace container，承載一個 Session 或一組相關 panes。

這讓已儲存資料與即時 process/channel state 保持分離。關閉 Tab 會結束 live Session；切換 Tab 不會。

## 快速開始

需求：

- Windows 是主要支援平台。
- Node.js 與 npm。
- Rust toolchain。
- Windows 上的 Tauri v2 prerequisites，包含 WebView2。

```bash
npm install
npm run tauri dev
```

常用檢查：

```bash
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

建立 Windows installer：

```bash
npm run package:installer
```

Installer script 會產生 `artifacts/kkterm-<version>-windows-x64-setup.exe` 與對應的 `.sha256`。

## 原生除錯

請用真正的 Tauri runtime 驗證：

```bash
npm run tauri dev
```

Browser/Vite preview 對部分前端檢查有用，但不能用來驗證 local ConPTY focus、WebView2 hosting、RDP/VNC、keychain、native menus、tray、dialogs 或 OS integration。

Windows 除錯可使用 VS Code 的 `Run KKTerm exe` 啟動 `src-tauri/target/debug/kkterm.exe` 並開啟 Rust backtrace。需要在原生 WebView2 host 內使用 DevTools 時，使用 `Attach KKTerm WebView2`。

## 目前限制

KKTerm 仍在快速變動，所以這份 README 描述目前 codebase 的狀態，不把 roadmap 當成已完成事實。

- Windows 是 v0.1 acceptance platform。
- Installer 目前尚未簽章。
- Release signing 延後期間，update checks 暫停。
- 原生 SFTP 路徑尚不支援 ProxyJump。
- File transfer resume、folder sync/diff、archive/extract 與 remote editing 尚未實作。
- RDP 與 VNC 仍是活躍開發區；更完整的 clipboard/device sync 與進階品質控制仍在演進。
- AI 可以輔助、提案並操作經允許的工具，但不應被視為自主 operator。

## 專案文件

- [Product context](CONTEXT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Dashboard architecture](docs/DASHBOARD.md)
- [AI provider guide](docs/AI_PROVIDERS.md)
- [Performance notes](docs/PERFORMANCE.md)
- [Release notes and gates](docs/RELEASE.md)

## 技術棧

Rust、Tauri v2、React 19、TypeScript、Vite、Tailwind CSS、Zustand、xterm.js、SQLite、WebView2、`russh`、`russh-sftp`、`vnc-rs`、`suppaftp` 與 OS keychain storage。

## 授權

MIT。詳見 [LICENSE](LICENSE)。
