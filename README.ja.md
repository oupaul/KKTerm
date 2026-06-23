<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>ターミナル、SSH、SFTP、RDP/VNC、Dashboard を1つのWindowsネイティブウィンドウに——おまけに、頼めば自分専用の小さなツールを作ってくれるAI付き。</strong>
</p>

<p align="center">
  <em>タスクバーをラスベガスのスロットマシンにしなくていい。</em>
</p>

<p align="center">
  <sub>名前の由来は<strong>乖乖 (グァイグァイ / Kuāi Kuāi)</strong>——台湾のサーバー管理者がサーバーの上に置く、緑色のココナッツ味コーンスナック。このアプリもラックに置いてもらえる存在でありたい。</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">最新の KKTerm リリースをダウンロード</a></strong>
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
    <a href="README.zh-CN.md">简体中文</a> ·
    <strong>日本語</strong> ·
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

## はじめに（45秒で読める）

あなたはサーバー管理者・DevOps・ホームラボ勢・バイブコーダー、その類の人間だ。今の環境はこんな感じではないか：

- ターミナルエミュレーター
- 別のSSHクライアント（プロファイル一覧を作るのに週末を1回潰した）
- 2007年製のSFTPクライアント（なぜかまだ現役）
- どこか別のモニターに消えているリモートデスクトップのウィンドウ
- 某Linuxマシン専用のVNCビューア
- ルーター管理UIを開いたブラウザのタブ
- ローカルディスクを覗くためのファイルマネージャーと、ずっと tail しているあのログ1つのためのテキストエディター
- リモートマシンで動いている `claude` / `codex` のセッション（Wi-Fiがくしゃみをするたびに切れる）
- パスワードを書いた付箋 *（言わない、絶対言わない）*

**KKTerm はそのすべてを1つのウィンドウにまとめる。** Windowsネイティブ——*他のdevツールがmacファーストで出荷しながらWindowsをおまけ扱いにしている中で、意図的に*——シングルインストーラーで配布、テレメトリーなし。

さらに、あなたがまだ気づいていなかったものも：

- **Dashboard** でAIに *「ルーターを30秒おきにpingするWidget を作って」* と言えば、サンドボックス化されたグリッドの上にそれが現れる。
- **リモートの `claude` / `codex` セッションに自動アタッチし直すSSHのPane**。Wi-Fiがどれだけ癇癪を起こしても、6時間動かしっぱなしのジョブが生き残る。
- **ワークスペース (Workspaces)**。ホームラボ、本業、あの客先のサーバーを、ワンクリックで切り替えられる別々の隔離されたコンテナに分ける。
- **Install Helper**。普段ならブラウザータブを10個渡り歩いて探すWindows開発ツールを、見つけて・インストールして・更新して・起動できる。
- Dashboard *とターミナル*用の**25種類のアニメーション背景**（そう、`matrix` もある）。やりすぎかもしれないが、後悔はしていない。

そして一番いいところ：AIアシスタントは一文から、実際に使い続けられる小さなDashboardツールを作れる。

> ⭐ **「俺が6年間ずっと作ろうと思ってたやつだ」と思ったなら——リポジトリにスターをつけて、誰かが見ていることを教えてほしい。本当に力になる。**

次に何をすべきか意見がある？公開フィードバックスレッドへどうぞ：
**[KKTerm はクロスプラットフォームの管理ワークフローで何を優先すべきか？](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## なぜ「KKTerm」なのか

台湾のデータセンターに行って、ラックの上を見てみてほしい。TSMCの工場、台北メトロの制御室、国泰銀行のサーバーホール、中華電信の交換機——どこかに必ず小さな緑色の袋が置いてある。**乖乖 (グァイグァイ / Kuāi Kuāi)**、1960年代から続くココナッツ味のコーンスナックだ。

名前の意味はそのまま**「おりこうにしなさい」**、**「ちゃんと動きなさい」**。IT業界の慣習はシンプルで、かつ至って本気だ：

- **緑（ココナッツ味）でなければならない。** 黄色（カレー）は*今日は仕事を休め*の意味；赤（辛味）はサーバーを怒らせる。緑だけ。
- **賞味期限切れはダメ。** 期限切れの乖乖は逆効果。エンジニアはこまめに入れ替える。
- **見える場所に。** サーバーがそこにあると認識できなければならない。
- **食べるな。** その袋は勤務中だ。

アジアで最も大きく、最も退屈で、最も稼働率に取り憑かれたシステムのいくつかが、シャーシに貼り付けられたコーンスナックの袋とともに動いている。効くのは、それを維持する人々が効くと信じているからだ——これはたいていのIT文化に対する、驚くほど正直な説明でもある。

**KKTerm** は **Kuai Kuai Term**——あのスナックと同じ志を持つ管理ワークスペースだ：大事なマシンの隣に静かに座って、ちゃんと動くのを助ける。ローカルファースト。テレメトリーなし。AIは承認ゲート付き。退屈で頼れる類のソフトウェア。

実物の乖乖をインストーラーに同梱することは、まだ実現できていない。それは v2 の課題だ。

---

## 動いているところを見る

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>（デモGIF。一枚の絵は千の箇条書きに勝る。そして箇条書きはもう尽きかけている。）</em></sub></p>



---

## 1つのウィンドウ、あらゆる接続

| やりたかったこと | KKTerm ならこうなる |
| --- | --- |
| ローカルの PowerShell / cmd / WSL シェルを開く | ローカルターミナルを並べて表示 |
| サーバーへSSH | 鍵・agent・パスワード・踏み台ホスト・ポートフォワーディング対応のSSH |
| そのサーバーのファイルを見る | SSH接続からSFTPを起動——デュアルペイン、ドラッグで転送 |
| 2012年のNASへFTP | FTP / FTPS、同じファイルブラウザの中で |
| 骨董品の機器へTelnet | はい、Telnetも入っています |
| シリアルポートと会話 | Serial接続——COMポートとボーレートを選ぶだけ |
| Windowsマシンへリモート | 本物のMicrosoftリモートデスクトップを内蔵 |
| Piへ VNC | VNC、ワークスペースに直接描画 |
| ルーターのWeb UIを開く | ログイン情報を保存できる組み込みブラウザタブ |
| 自分のディスクを見る | ローカルのFile Explorer Pane、SFTPと同じデュアルペインの外殻 |
| ログ・CSV・画像・PDFを開く | 本物のtail追従ログモードを備えた組み込みDocumentビューア |
| ホストのCPUを見る | ライブのステータスバーと、自分で組み立てられるDashboard |

同じアプリ。同じウィンドウ。同じホットキー。同じ、できれば目に優しいテーマ。

<p align="center">
  <img src="docs/assets/screenshots/connections-grid.png" alt="1つのTabにSSH・SFTP・組み込みWeb UIを並べて表示" width="720" />
</p>


---

## なぜ一日中開きっぱなしになるのか

### 小さなダウンロード、稲妻のような起動

KKTerm はプラットフォームではなく、道具として感じられるように作っている。現在のデスクトップビルドはだいたい 10-13 MB 程度で、すぐインストールでき、管理ワークスペースを開くのに別のOSを起動しているような重さがない。

この小ささは、踏み台マシン、古いノートPC、VMで効いてくる。余計なバックグラウンドサービスが1つ増えるたびに、信用したくないものも1つ増えるからだ。KKTerm は開き、ワークスペースを復元し、あとは邪魔をしない。

### マルチペインのグリッドで、接続を自由に混ぜる

1つの Tab には Pane のグリッドを置けるし、その Pane は同じ種類でなくていい。SSHの隣にSFTP、RDP Sessionの下にローカルPowerShell、VNCの横にルーターのWeb UI、ファイルを動かしているターミナルの横にファイルブラウザーを置ける。

管理作業の現実のぐちゃっとした形を、そのまま受け止めるワークスペースだ。Connection タイプを混ぜ、グリッドをリサイズし、live Sessions を生かしたまま、山ほどのウィンドウを Alt-Tab で渡り歩くのをやめられる。

<p align="center">
  <img src="docs/assets/screenshots/multi-pane.png" alt="1つのTabを4つの異なる接続種類のペインに分割" width="720" />
</p>


### あなたのターミナルを操作してくれるAIアシスタント

たいていの「ターミナルの中のAI」デモはチャットで止まる。KKTerm のアシスタントはあなたのセッションの*中で*動く：画面にすでにあるものをコンテキストとして渡せば、つないでいるマシンに対してアシスタントが手を動かす——しかも常に人間が承認ループにいる。

**コンテキストを、そのまま渡す。** コピペで往復する必要はない：

- **ターミナルバッファをコンテキストに追加**で、稼働中のローカルまたはリモートのセッションのスクロールバックをそのまま会話に引き込める。だから「なぜこのビルドは失敗したの？」が、アシスタントが実際に読める質問になる。
- **スクリーンショットメニュー**で領域やPane全体をつかみ、画像を会話に落とせる。だから「このダイアログ、なんで変な見た目なの？」に答えられる。
- **ファイルの添付**や現在の **Dashboard / IT Ops のページコンテキスト**も渡せる。だから曖昧な説明ではなく、あなたが実際に見ているものをもとに推論する。

**手を動かさせる——ただし承認の裏で。** アシスタントはあなたのターミナルでコマンドを実行し、Connectionを開き、Dashboardに Widget を置ける。ただしリスクのある部分はゲートの裏に残る：

- **何に触れられるかを決める**——ツールのカテゴリ（Dashboard / Connections / Live Sessions）をまるごとオン/オフ。
- **どう尋ねるかを決める**——`Prompt`（既定、毎回尋ねる）か `Allow All`（あなたは大人だ、誓約書にサインした）。
- `rm -rf` のように見えるものはすべて危険としてフラグが立ち——その理由が承認カードに表示され——人間の明示的なイエスを待つ。man pageに仕込まれたプロンプトインジェクションで誰かが小細工をしても、AIが破壊的なコマンドをこっそり実行することはない。

**頭脳は持ち込み式。** OpenAI、Anthropic、OpenRouter、DeepSeek、Grok、Azure OpenAI、LiteLLM、GitHub Copilot、Ollama、NVIDIA、あるいはOpenAI互換のあらゆるエンドポイントと会話できる——さらに **Claude Code CLI** や **Codex CLI** をバックエンドとして動かし、別途のAPIキーではなく既存の `claude` / `codex` のログインとサブスクリプションをそのまま使える。APIキーはOSのキーチェーンに入る。

<p align="center">
  <img src="docs/assets/screenshots/ai-assistant.png" alt="ツールアクセスと承認モードのトグルを備えたAIアシスタントパネル" width="720" />
</p>


### Grafanaのふりをしないダッシュボード

Dashboard はドラッグ＆リサイズできるWidgetのグリッドだ。ペタバイト規模の可観測性のためのものではない——「お気に入りのアプリ5つを起動するボタンと、SSHホストの稼働時間を表示するパネルが、チャットの*隣に*ほしい」のためのものだ。

#### AIが作るWidget——口で言えば、出てくる

ここは我々が本気でわくわくしている部分だ。マーケットプレイスから選ぶのでもなく、JavaScriptを書くのでもない。**AIアシスタントに欲しいものを伝える**だけで、あなたのDashboardの上にWidgetを作ってくれる：

> *「メインのrepoの直近5コミットをリストで表示するWidgetを追加して。」*
> *「オンコールのカンペを置く付箋Widgetを作って。」*
> *「自宅ルーターを30秒おきにpingして緑/赤を出すWidgetを作って。」*
> *「ストップウォッチが欲しい。スタイルは任せる、驚かせて。」*

単純な表示パネル（markdown、チェックリスト、大きな数字ひとつ）もあれば、あなたが承認した隔離サンドボックスの中でライブのコードを動かすものもある。残したWidgetはすべてあなたのもの——独自の色・アイコン・タイトルを持って保存され、サイズ違いを何個でも置ける。飽きたら右クリックで削除。

<p align="center">
  <img src="docs/assets/screenshots/ai-widgets.png" alt="AIが作ったWidgetが並ぶDashboardグリッド" width="720" />
</p>


#### Dashboard／ターミナルのアニメーション背景（やりたかったから）

Dashboardのビューごとに、*あるいは任意のターミナルの背後に*、**25種類**のキャンバスアニメーション背景から気分を選べる：

| 気分 | 背景 |
| --- | --- |
| 穏やか | `aurora`、`clouds`、`ocean`、`raindrops`、`rainywindow`、`frostedWindow`、`snow`、`sakura`、`fireflies`、`bubbles`、`aquarium`、`ricefield`、`lanterns` |
| 宇宙 | `starfield`、`nebula` |
| 暖 | `embers`、`lava` |
| ギーク | `matrix`、`topo`、`synthwave` |
| 騒がしい | `cyberpunk`、`taipei101`、`thunderstorm`、`confetti`、`particleCursor` |

同じピッカーがターミナルのPaneにも対応しているので、`matrix` を稼働中のSSHセッションの背後に置ける。別の画面にいる間は一時停止するので、コストはほぼゼロ。`matrix` をAIアシスタントと組み合わせれば「私はきわめて生産的で、しかもたぶんウォシャウスキーの映画の中にいる」という雰囲気になる。あるいは `ocean` を選んでまともな人間に見せる。どちらの選択も我々は評価しない。

<p align="center">
  <img src="docs/assets/screenshots/backgrounds.png" alt="複数のアニメーション背景を並べて表示" width="720" />
</p>


### AIエージェントを生かし続ける

これがみんなが惚れ込む2つ目の機能だ。KKTerm のSSHターミナルは、再接続を生き延びるリモートホスト上の**名前付きtmuxセッション**に、あなたを直接放り込める：

- tmuxを有効にしたSSH接続を開いて、`claude`、`codex`、`gemini-cli`、`cursor-agent`、あるいは好きな長時間エージェントを起動する。
- ラップトップを閉じる。また開く。Paneは静かに再アタッチする——エージェントはまだ動いていて、スクロールバックも残っていて、さっきの続きをやっている。
- ネットワークが一瞬途切れた？KKTerm はあなたを煩わせずに同じセッションへ静かに繋ぎ直す。
- アシスタントに手伝ってほしい？「ターミナルバッファをコンテキストに追加」で、リモートセッション全体が会話に取り込まれ、ローカルのAIがリモートエージェントの仕事を推論できる。

ホテルの不安定なWi-Fiで6時間の `claude` や `codex` セッションを失った経験があるなら、この機能ひとつでアプリの元は取れる。（アプリは無料だ。それでもこの機能には価値がある。）

ローカルシェルもWindowsで同じ技が使える：PowerShellのPaneは **psmux**（ネイティブのtmuxクローン）の中で動かせるので、ローカルの長時間ジョブも、リモートと同じようにPaneを閉じても生き残る。

<p align="center">
  <img src="docs/assets/screenshots/tmux-reattach.png" alt="再接続後に名前付きtmuxセッションへ再アタッチするSSH Pane" width="720" />
</p>


### ワークスペースで世界を分ける

ホームラボ、本業、あの客先のサーバーは、同じリストに入れるものではない。**ワークスペース (Workspaces)** は、Activity Rail から切り替える、名前付きで隔離された Connection のコンテナだ。切り替えても再スコープされるのは接続ツリーだけ——開いている Sessions、Dashboard、設定はそのまま——だからコンテキストの切り替えは、再起動ではなくワンクリックで済む。

<p align="center">
  <img src="docs/assets/screenshots/workspaces.png" alt="Activity Rail のワークスペース切り替え" width="720" />
</p>


### 好みの色に着せ替える：カラーテーマ

背景は遊びの部分。**カラーテーマ**は一日中実際に見つめ続ける部分だ。KKTerm はアプリ全体のクロム——Activity Rail、接続ツリー、タブ、ダイアログ——を着せ替える**14種類**のカラースキームを備えており、設定 ▸ 外観で各スキームのライブミニプレビューを表示する：

| 雰囲気 | スキーム |
| --- | --- |
| ニュートラル | `Default`、`Dark`、`Light`、`Match OS`（システムのライト/ダークに追従）、`Mac` |
| カラフル | `Orange`、`Purple`、`Pink`、`Confetti`、`Bubble Tea` |
| ローカルの味 | `Green Kuai Kuai`（そう、あのお菓子）、`Blue See`、`Blue, Green and White`、`Semiconductor` |

どのスキームを選んでも、ターミナルは独自のダークなパレットを保つので、シェルは読みやすいまま、アプリの残りの部分があなたの気分に合わせる。

<p align="center">
  <img src="docs/assets/screenshots/color-themes.png" alt="設定のカラースキームグリッドとライブプレビュー" width="720" />
</p>


### Install Helper（Windows専用）

開発用に新品の Windows マシンをセットアップするのは、たいてい10個のブラウザータブと「次へ、次へ、完了」の繰り返しだ。**Install Helper** は内蔵のツールカタログで、普段なら手作業で追いかけるツールを、KKTerm から離れずに見つけ・インストールし・更新し・アンインストールする：

- **Essentials（必須）** — winget、Node（nvm-windows経由）、Python（uv経由）、Git。
- **AI Agents** — Claude Code、Codex、Antigravity、OpenCode、その他のコーディングエージェントCLIとデスクトップアプリ。
- **AI Platforms** — Ollama、n8n、Open WebUI、Flowise、Langflow などローカル／セルフホストのスタックを、起動・管理まで代行。
- **Development（開発）** — エディター、コンテナ、APIツール、WSLとそのディストリビューション、Rustup。
- **Windows Power User** — PowerToys、PowerShell 7、psmux、Sysinternals、Everything、Ditto。
- **Remote Access（リモートアクセス）** — Tailscale、RustDesk。
- **Utilities（ユーティリティ）** — Notepad++、ripgrep、jq、fzf、7-Zip、Oh My Posh、FFmpeg など。

すでにインストール済みのものを検出し、更新があるものに印を付け、**すべて更新**でキュー全体を代わりに処理する。UACのプロンプトは明示的なまま、何かが黙ってインストールされることはなく、カタログ全体がアプリに同梱されている——追加のアカウントも、バックグラウンドのテレメトリーもない。

> macOS と Linux にはすでにお気に入りのパッケージマネージャーがあるので、Install Helper は Windows 専用の便利機能であり、それらのビルドには含まれていない。

<p align="center">
  <img src="docs/assets/screenshots/install-helper.png" alt="インストール済みと利用可能なツールを含む Install Helper カタログ" width="720" />
</p>


---

## KKTerm でないもの

短いリスト。正直さが信頼を生むからだ：

- **クラウド製品ではない。** 同期なし、チームアカウントなし、SaaSプランなし。もし「KKTerm にサインイン」ダイアログを見たら、何かが壊滅的に間違っている。
- **すべてのOSが同じだとは装わない。** KKTerm は Windows、macOS、Linux のビルドを出荷するが、プラットフォーム固有の機能は正直に分けている：Windows にはネイティブ RDP ActiveX パスと Install Helper カタログがあり、macOS と Linux ではそれぞれのシステムで使えるポータブルな経路を使う。
- **自律型AIエージェントではない。** アシスタントは提案し、人間が決める。`Allow All` は既定ではなく、あなたが下す選択だ。
- **Grafana / Datadog の代替ではない。** Dashboard は個人のコントロール面のためのもので、1万台規模の可観測性のためではない。
- **Kubernetes IDE ではない。** これはターミナル中心の管理ワークスペースだ。Helmチャートを描けと頼まないでほしい。

そのどれかが*もし*決定的な問題だったなら——わかった、v2で会おう。

---

## KKTerm を入手する

**[最新の KKTerm リリースをダウンロード](https://github.com/ryantsai/KKTerm/releases/latest)** し、自分のプラットフォーム向けのパッケージを選んで開く。Windows インストーラーは現在**未署名**だ——リリース署名はロードマップにあるので、それまではウイルス対策ソフトに厳しい目で見られるかもしれない。正常だ。

ソースからビルドしたい、または貢献したい？必要なものはすべて [`CONTRIBUTING.md`](CONTRIBUTING.md) にある。

---

## ロードマップ（短縮版）

- クロスプラットフォームリリースの磨き込み
- リリース署名の磨き込み
- より強力なファイル転送（再開、フォルダ同期、圧縮/展開）
- より充実したリモートデスクトップのクリップボード・デバイス共有
- 組み込みDashboard Widget の追加
- IT Ops 自動化機能の追加

完全で頻繁に更新される版：[`docs/ROADMAP.md`](docs/ROADMAP.md)。

---

## 貢献

手を貸してくれたら嬉しい。本気だ。小さなことでも大事だ：

- **devビルドを試して**、何かおかしいと感じたらissueを立ててほしい。「なんか変だった」も立派なバグ報告だ；一緒に掘る。
- **ロケールを翻訳する。** 英語がsource of truth；その隣に他の13言語が住んでいる。
- **Dashboard Widget を追加する。** 小さなアイデアを選び、出荷し、パターンを学ぶ。
- **マニュアルを改善する。** ある機能を使ったのにドキュメントが役に立たなかったなら、それを直すPRは金だ。

セットアップ一式、プロジェクト構成、PRチェックリストは [`CONTRIBUTING.md`](CONTRIBUTING.md) にある。入口を探している？open issueを [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) や [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) で絞り込んでみてほしい。

---

## プロジェクトドキュメント

- [プロダクトコンテキスト](CONTEXT.md) — 合わせるべきドメイン言語
- [アーキテクチャ](docs/ARCHITECTURE.md) — モジュールマップ、新しいコードの置き場所
- [ユーザーマニュアル](docs/manual/INDEX.md) — 機能ごとの解説
- [ロードマップ](docs/ROADMAP.md)
- [Dashboard アーキテクチャ](docs/DASHBOARD.md)
- [組み込みMCPサーバー](docs/MCP.md)
- [AIプロバイダーガイド](docs/AI_PROVIDERS.md)

---

## スター履歴

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

ここまで読んでまだスターを付けていないなら——何を待っている、個人的な招待状か？これがその個人的な招待状だ。

⭐ **[GitHub で KKTerm にスターを付ける](https://github.com/ryantsai/KKTerm)** — ワンクリックで、メンテナーの一週間がまるごと明るくなる。ラックに置くデジタルな乖乖だと思ってほしい。

---

## ライセンス

MIT。[LICENSE](LICENSE) を参照。使って、フォークして、出荷して、誰にも見つからないホームラボに入れて——それがこの取引だ。
