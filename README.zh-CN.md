<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>一扇 Windows 原生窗口，搞定终端、SSH、SFTP、RDP/VNC 和 Dashboard — 还附一个能照你要求打造专属小工具的 AI。</strong>
</p>

<p align="center">
  <em>因为你的任务栏不该长得像拉斯维加斯的老虎机。</em>
</p>

<p align="center">
  <sub>名称来自 <strong>乖乖</strong>，那包台湾系统管理员放在服务器上、希望它好好工作的绿色椰子味玉米点心。希望这个 app 也能争取到它在机架上的一席之地。</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">下载最新版 Windows 安装程序（.exe）</a></strong>
</p>

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm/stargazers">
    <img src="https://img.shields.io/github/stars/ryantsai/KKTerm?style=for-the-badge&logo=github&color=ffd33d" alt="GitHub stars" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/network/members">
    <img src="https://img.shields.io/github/forks/ryantsai/KKTerm?style=for-the-badge&logo=github&color=8a63d2" alt="GitHub forks" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/releases">
    <img src="https://img.shields.io/github/downloads/ryantsai/KKTerm/total?style=for-the-badge&logo=github&color=0969da" alt="GitHub downloads" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/issues">
    <img src="https://img.shields.io/github/issues/ryantsai/KKTerm?style=for-the-badge&logo=github&color=2ea043" alt="Open issues" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/ryantsai/KKTerm?style=for-the-badge&color=blue" alt="MIT License" />
  </a>
  <br />
  <img src="https://img.shields.io/badge/cross%E2%80%91platform-desktop-0078D6?style=flat-square" alt="Cross-platform desktop" />
  <img src="https://img.shields.io/badge/local--first-no%20telemetry-success?style=flat-square" alt="Local-first" />
  <br />
  <sub>
    <a href="README.md">English</a> ·
    <a href="README.zh-TW.md">繁體中文</a> ·
    <strong>简体中文</strong> ·
    <a href="README.ja.md">日本語</a> ·
    <a href="README.ko.md">한국어</a> ·
    <a href="README.fr.md">Français</a> ·
    <a href="README.de.md">Deutsch</a> ·
    <a href="README.es.md">Español</a> ·
    <a href="README.es-MX.md">Español (MX)</a> ·
    <a href="README.it.md">Italiano</a> ·
    <a href="README.pt-BR.md">Português (BR)</a> ·
    <a href="README.th.md">ไทย</a> ·
    <a href="README.id.md">Bahasa Indonesia</a> ·
    <a href="README.vi.md">Tiếng Việt</a>
  </sub>
</p>

---

## 45 秒简报

你是 sysadmin / DevOps / 玩 homelab 的人 / vibe coder。现在你手上有：

- 一个终端模拟器
- 一个独立的 SSH client（里面那份 profile 列表花了你整个周末才整理出来）
- 一个 2007 年的 SFTP client，不知为何还活着
- 远程桌面开在一个你一直在错误屏幕上找的窗口
- 一个 VNC viewer，只为了那一台 Linux 主机
- 一个浏览器标签页，开着路由器后台
- 一个跑在远程主机上的 `claude` / `codex` session，每次 Wi-Fi 一打喷嚏就断
- 一张写着密码的便利贴*（没事，我们不会说出去）*

**KKTerm 把这些塞进同一扇窗口。** 原生 Windows — *没错，是故意的，当整个开发工具圈都先做 mac 版、把你的操作系统当成脚注处理的时候* — 一个安装程序就搞定，而且绝不回家报告。

顺便还帮你做了几件你不知道自己需要的事：

- 一个 **Dashboard**，你可以对 AI 说 *「帮我做一个每 30 秒 ping 一次路由器的 widget」*，它就会在你的网格上凭空出现，而且关在自己的沙箱里。
- **能自动 attach 回远程 `claude` / `codex` session 的 SSH pane**，这样每次 Wi-Fi 闹脾气，你那个跑了六小时的任务也不会阵亡。
- 一个 **AI 用量计**，让你不会凌晨三点才被 rate-limit 墙撞个正着。
- 一个 **Installer Helper**，帮你找到、安装、更新并启动那些平常得翻十个浏览器标签页才找得到的 Windows 开发工具。
- Dashboard 用的**二十五种 canvas 动画背景**（对，包括 `matrix`），因为我们也没在客气。

而最棒的部分：AI 助理可以把一句话变成一个你真的会继续使用的小型 Dashboard 工具。

> ⭐ **如果这听起来就是你过去六年一直想做的那个 app — 请点个 star，让我们知道有人在看。这真的很有帮助。**

对接下来该做什么有想法吗？来公开反馈帖聊聊：
**[KKTerm 该为跨平台管理工作流优先做什么？](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## 为什么叫「KKTerm」？

走进任何一座台湾的数据中心，抬头看机架顶端。从台积电晶圆厂、台北捷运控制室、国泰银行的服务器机房、中华电信的交换机房 — 你都会看到一小包绿色的 **乖乖**，那是 1960 年代就有的椰子味玉米点心。

名字字面上就是「**乖乖的**」、「**听话**」。IT 圈的传统很简单，而且大家绝对是认真的：

- **必须是绿色（椰子味）。** 黄色（咖喱）代表*今天请假*；红色（辣味）会把服务器惹毛。只有绿色。
- **不能过期。** 过期的乖乖会反过来害你。工程师会勤奋地汰旧换新。
- **必须看得到。** 服务器必须知道它在那里。
- **不要吃它。** 那包乖乖正在值班。

亚洲一些最大、最无聊、最执着于 uptime 的系统，就是这样靠着一包贴在机箱上的玉米脆果在运转。它有效，是因为维护它的人相信它有效 — 这也算是对 IT 文化最诚实的描述了。

**KKTerm** 就是 **Kuai Kuai Term** — 一个跟那包点心一样有抱负的管理工作区：安静地坐在你那些重要机器旁边，帮它们乖一点。本地优先。零遥测。AI 全程要审批。那种无聊但可靠的软件。

我们目前还没办法在 installer 里塞一包真正的乖乖。那是 v2 的待办事项。

---

## 亲眼看看

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>（demo GIF 放这里。一张图胜过一千个要点，而我们要点也快用完了。）</em></sub></p>

---

## 一扇窗口，所有连接

| 你想要… | KKTerm 帮你做到 |
| --- | --- |
| 开一个本机 PowerShell / cmd / WSL shell | 本机终端，并排摆着 |
| SSH 进服务器 | SSH 支持密钥、agent、密码、跳板主机与 port forwarding |
| 浏览那台服务器上的文件 | 从 SSH 连接直接开 SFTP — 双窗格、拖拽就能传 |
| FTP 到 2012 年的 NAS | FTP / FTPS，同一个文件浏览器 |
| Telnet 连上古董设备 | 对，Telnet 也在里面 |
| 跟串口对话 | Serial 连接 — 选个 COM port 和波特率就好 |
| 远程进一台 Windows 机器 | 内建货真价实的微软远程桌面 |
| VNC 进一台 Pi | VNC，直接画进工作区 |
| 开路由器的网页后台 | 内嵌浏览器标签页，还会帮你带入登录信息 |
| 看主机的 CPU | 实时状态栏，加上一个你可以自己堆东西的 Dashboard |

同一个 app。同一扇窗口。同一组快捷键。同一套但愿不会让你眼睛流血的主题。

---

## 为什么大家整天开着它

### 下载很小，启动像闪电

KKTerm 做得像一个工具，而不是一整套平台。现在的桌面版大约只有 10-13 MB 左右，安装很快，启动也快到不像是在开第二套操作系统。

这种小体积在跳板机、老笔记本、VM 里很重要；每多一个后台服务，就多一个值得怀疑的东西。KKTerm 打开、恢复你的工作区，然后安静退到后台。

### 多窗格网格，想怎么混都行

一个 Tab 可以放一组 Pane 网格，而且这些 Pane 不必是同一种。SSH 旁边放 SFTP、RDP Session 下面放本地 PowerShell、VNC 旁边放路由器 Web UI，或把文件浏览器放在正在搬文件的终端旁边。

这是一个能容纳真实管理工作混乱形状的工作区：混搭 Connection 类型、调整网格大小、让 live Sessions 继续活着，别再在一堆窗口之间 Alt-Tab。

### 一个会帮你打造工具的 AI 助理

大多数「终端里的 AI」demo 都停在聊天。KKTerm 的助理还能照你实际的工作方式，打造小而耐用的 Dashboard widget — 而且把危险的东西留在开关后面：

- **决定它能碰什么** — 整类工具（Dashboard / Connections / Live Sessions）可以一键开关。
- **决定它怎么问** — `Prompt`（默认，每次都问）或 `Allow All`（你是成年人，你签了免责声明）。

任何看起来像 `rm -rf` 的东西都会被标记为危险，等一个人类明确点头。AI 不会因为有人在某份 man page 里塞了 prompt injection，就偷偷跑一个破坏性命令。

它能对接 OpenAI、Anthropic、OpenRouter、DeepSeek、Grok、Azure OpenAI、LiteLLM、GitHub Copilot、Ollama、NVIDIA，或任何 OpenAI 兼容的端点。你的 API 密钥会进到 OS keychain。

### 一个不假装自己是 Grafana 的 Dashboard

Dashboard 是一个可拖拽、可缩放的 widget 网格。它不是给你做 PB 级观测用的 — 它是给「我想要一个按钮启动我最爱的五个 app，旁边一个面板显示我 SSH 主机的 uptime，*再旁边*就是我的聊天窗口」用的。

#### AI 打造的 Widget — 用讲的，它就生出来

这部分是我们真心兴奋的。你不用从市场挑，也不用写 JavaScript。你**告诉 AI 助理你要什么**，它就直接在你的 Dashboard 上把 widget 做出来：

> *「加一个 widget，把我主 repo 最近 5 条 commit 列成清单。」*
> *「帮我做一个便利贴 widget，放我的 on-call 小抄。」*
> *「做一个 widget，每 30 秒 ping 一次我家路由器，显示绿灯/红灯。」*
> *「我要一个秒表。样式你自己发挥，给我点惊喜。」*

有些是单纯的显示面板（markdown、checklist、一个大大的数字）；有些则在你批准过的隔离沙箱里跑实时代码。每个你留下的 widget 都是你的 — 它会带着自己的颜色、图标、标题保存下来，而且你可以放好几份不同大小。腻了就右键删掉。

#### Dashboard 动画背景（因为我们就是想要）

每个 Dashboard view 都能从**二十五种** canvas 动画背景里挑一种心情：

| 心情 | 背景 |
| --- | --- |
| 平静 | `aurora`、`clouds`、`ocean`、`raindrops`、`rainywindow`、`frostedWindow`、`snow`、`sakura`、`fireflies`、`bubbles`、`aquarium`、`ricefield`、`lanterns` |
| 太空 | `starfield`、`nebula` |
| 温暖 | `embers`、`lava` |
| 极客 | `matrix`、`topo`、`synthwave` |
| 躁动 | `cyberpunk`、`taipei101`、`thunderstorm`、`confetti`、`particleCursor` |

你切走的时候它们会暂停，所以几乎不耗资源。把 `matrix` 配上你的 AI 助理，气氛瞬间变成「我极度有生产力，而且大概人在沃卓斯基的电影里」。或者选 `ocean`，看起来像个正经人。两种选择我们都不评判。

### 让你的远程 AI agent 活着

这是大家爱上的第二个功能。KKTerm 的 SSH 终端可以直接把你丢进远程主机上一个**命名的 tmux session**，而且它扛得过重连：

- 开一个启用 tmux 的 SSH 连接，然后启动 `claude`、`codex`、`gemini-cli`、`cursor-agent`，或任何你爱用的长时间 agent。
- 合上笔记本。再打开。Pane 会悄悄重新 attach — agent 还在跑，scrollback 还在，还在做它刚才在做的事。
- 网络抖了一下？KKTerm 会默默重连回同一个 session，不来烦你。
- 想让助理帮忙？「把终端 buffer 加进 context」会把整个远程 session 拉进对话，让你的本地 AI 能推理你的远程 agent 在做什么。

如果你曾经因为酒店那烂 Wi-Fi 而丢掉一个跑了六小时的 `claude` 或 `codex` session，光这一个功能就值回票价。（这 app 是免费的。但这功能还是值得。）

### 知道你还剩多少 AI 额度

编程 agent 是按方案窗口计费，不是按月，而且你在开会的时候它们会很乐意把你的配额吃光。**AI 用量计**让这件事一直看得见：

- 一个 Dashboard widget，把 **Claude Code** 和 **Codex** 并排显示：连接的账号、方案、当前窗口和本周用了多少、下次重置时间。
- 一个精简的**状态栏指示器**，镜像同一组数字，所以就算 Dashboard 关着，你也能一眼看出在下一次大重构之前还剩多少余裕。
- 它会提前告诉你需不需要重新登录 — 在长任务*之前*，而不是做到一半。

### 让别的 AI 来操控 KKTerm

KKTerm 内建自己的 MCP 服务器，所以外部编程 agent（Claude Code、Codex、Copilot、Antigravity、OpenCode）能像你一样用你的工作区 — 列出连接、打开一个、读终端 buffer、把 widget 放到 Dashboard 上。AI 对 AI，全在你机器上，没有云端中继。会改动东西、比较有风险的操作，全部留在一个默认**关闭**的安全开关后面。

设置 → AI Assistant → **Built-in MCP Server** 有一个一键「显示配置」对话框，全部帮你填好，还有可复制的 `claude mcp add` / `codex mcp add` 命令。

---

## KKTerm 不是什么

一份简短清单，因为诚实才能换到信任：

- **不是云端产品。** 没有同步、没有团队账号、没有 SaaS 套餐。如果你哪天看到「登录 KKTerm」对话框，那一定是出了什么天大的差错。
- **不假装自己跨平台。** 我们是故意 Windows 优先；macOS 和 Linux 在 roadmap 上。如果你今天就需要 mac 优先的工具，你有上百个选择。我们在做的是 Windows 管理员默默等了很久的那一个。
- **不是自主 AI agent。** 助理提议，人类决定。`Allow All` 是你自己做的选择，不是默认值。
- **不是 Grafana / Datadog 的替代品。** Dashboard 是给个人控制面板用的，不是给一万台主机观测用的。
- **不是 Kubernetes IDE。** 它是一个以终端为核心的管理工作区。拜托别叫它画 Helm chart。

如果上面任何一条*曾经*是你的雷点 — 公道，那我们 v2 见。

---

## 获取 KKTerm

**[下载最新版 Windows 安装程序（.exe）](https://github.com/ryantsai/KKTerm/releases/latest)** 然后运行它。这个安装程序目前**未签名** — 发行签名在 roadmap 上，在那之前你的杀毒软件可能会对你投以严厉的眼神。这是正常的。

想从源码构建或贡献？你需要的一切都在 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

---

## Roadmap（精简版）

- macOS + Linux 版本
- 签名过的安装程序 + 自动更新
- 更强的文件传输（续传、文件夹同步、压缩/解压）
- 更完整的远程桌面剪贴板与设备共享
- 更多内建 Dashboard widget

完整且经常更新的版本：[`docs/ROADMAP.md`](docs/ROADMAP.md)。

---

## 参与贡献

我们很欢迎有人帮忙。真心的。小事也算数：

- **跑跑 dev 版本**，觉得哪里怪怪的就开个 issue。「感觉怪怪的」是合法的 bug 报告；我们会陪你一起挖。
- **翻译一个语言。** 英文是 source of truth；旁边还住着另外十三种语言。
- **加一个 Dashboard widget。** 挑个小点子，做出来，学会这套模式。
- **改善手册。** 如果你用了某个功能、但文档帮不上忙，一个修好它的 PR 就是黄金。

完整的环境设置、项目结构与 PR 检查清单都在 [`CONTRIBUTING.md`](CONTRIBUTING.md)。在找切入点吗？用 [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) 或 [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) 筛选 open issues。

---

## 项目文档

- [产品脉络](CONTEXT.md) — 你该对齐的领域语言
- [架构](docs/ARCHITECTURE.md) — 模块地图、新代码该放哪
- [Roadmap](docs/ROADMAP.md)
- [Dashboard 架构](docs/DASHBOARD.md)
- [AI provider 指南](docs/AI_PROVIDERS.md)

---

## Star 历史

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

如果你看到这里却还没点 star — 你在等什么，等一张亲笔邀请函吗？这就是那张亲笔邀请函。

⭐ **[在 GitHub 上给 KKTerm 点 star](https://github.com/ryantsai/KKTerm)** — 只要点一下，就能让维护者开心一整周。把它想成放在机架上的一包数字乖乖。

---

## 许可证

MIT。见 [LICENSE](LICENSE)。用它、fork 它、拿去出货、把它放进一个没人找得到的 homelab — 这就是那个交易。
