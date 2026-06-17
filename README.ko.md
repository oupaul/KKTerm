<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>터미널, SSH, SFTP, RDP/VNC, Dashboard를 하나의 Windows 네이티브 창에 — 게다가 요청하면 당신만의 작은 도구를 만들어 주는 AI까지.</strong>
</p>

<p align="center">
  <em>당신의 작업 표시줄이 라스베이거스 슬롯머신처럼 보일 필요는 없으니까.</em>
</p>

<p align="center">
  <sub>이름은 <strong>乖乖 (Kuāi Kuāi, 과이과이)</strong>에서 왔다. 대만 시스템 관리자들이 서버가 얌전히 돌아가길 바라며 그 위에 올려두는 초록색 코코넛 맛 옥수수 과자다. 이 앱도 랙 위 한 자리를 얻을 수 있기를.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">최신 Windows 설치 프로그램 (.exe) 다운로드</a></strong>
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
    <a href="README.ja.md">日本語</a> ·
    <strong>한국어</strong> ·
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

## 45초 소개

당신은 시스템 관리자 / DevOps / 홈랩 애호가 / 바이브 코더, 그런 부류다. 지금 손에 든 것들：

- 터미널 에뮬레이터 하나
- 별도의 SSH 클라이언트 (그 프로필 목록 만드는 데 주말 하나를 다 썼다)
- 2007년산 SFTP 클라이언트 (어째선지 아직도 살아 있다)
- 자꾸 엉뚱한 모니터에서 잃어버리는 창에 떠 있는 원격 데스크톱
- 그 리눅스 한 대 때문에 켜둔 VNC 뷰어
- 라우터 관리 페이지를 띄운 브라우저 탭
- 원격 머신에서 도는 `claude` / `codex` 세션 (Wi-Fi가 재채기만 해도 끊긴다)
- 비밀번호를 적은 포스트잇 *(걱정 마, 말 안 한다)*

**KKTerm은 이 모든 걸 하나의 창에 담는다.** Windows 네이티브 — *다른 개발 도구들이 mac을 먼저 내놓고 당신의 OS를 각주 취급하는 와중에, 의도적으로* — 설치 프로그램 하나로 끝, 그리고 절대 집에 전화하지 않는다.

덤으로, 당신이 필요한 줄도 몰랐던 것들 몇 가지：

- **Dashboard**에서 AI에게 *"라우터를 30초마다 ping하는 위젯 만들어 줘"*라고 말하면, 샌드박스에 갇힌 채 당신의 그리드 위에 나타난다.
- **원격 `claude` / `codex` 세션에 자동으로 다시 붙는 SSH Pane**. Wi-Fi가 아무리 떼를 써도 6시간짜리 작업이 살아남는다.
- **AI 사용량 미터**. 새벽 3시에 레이트 리밋 벽에 들이받고 놀랄 일이 없어진다.
- **Install Helper**. 평소엔 브라우저 탭 열 개를 헤매며 찾던 Windows 개발 도구를 찾고·설치하고·업데이트하고·실행한다.
- Dashboard용 **애니메이션 배경 25종**(그래, `matrix`도 있다). 좀 과하긴 한데, 후회는 없다.

그리고 가장 좋은 부분：AI 어시스턴트는 한 문장을, 당신이 실제로 계속 쓰게 될 작은 Dashboard 도구로 바꿔 준다.

> ⭐ **이게 지난 6년 동안 만들려고 벼르던 바로 그 앱처럼 들린다면 — 리포지터리에 스타를 눌러 누군가 보고 있다는 걸 알려 달라. 정말로 도움이 된다.**

다음에 뭘 해야 할지 의견이 있다면? 공개 피드백 스레드로 오시라：
**[KKTerm은 크로스 플랫폼 관리 워크플로에서 무엇을 우선해야 할까?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## 왜 "KKTerm"인가?

대만의 데이터센터 어디든 들어가서 랙 위쪽을 봐라. TSMC 팹, 타이베이 메트로 관제실, 캐세이 은행 서버홀, 중화전신 교환 장비를 지나다 보면 — 작은 초록 봉지 하나가 눈에 띌 것이다. **乖乖 (Kuāi Kuāi)**, 1960년대부터 이어진 코코넛 맛 옥수수 과자다.

이름은 말 그대로 **"착하게 굴어라"**, **"얌전히 있어라"**라는 뜻이다. IT 업계의 전통은 단순하고, 그리고 완전히 진지하다：

- **초록(코코넛)이어야 한다.** 노랑(카레)은 *오늘 출근하지 말라*는 뜻이고, 빨강(매운맛)은 서버를 화나게 한다. 오직 초록.
- **유통기한이 지나면 안 된다.** 상한 과이과이는 오히려 해롭다. 엔지니어들은 부지런히 갈아 끼운다.
- **보여야 한다.** 서버가 그게 거기 있다는 걸 알아야 한다.
- **먹지 마라.** 그 봉지는 근무 중이다.

아시아에서 가장 크고, 가장 지루하고, 가장 가동률에 집착하는 시스템 중 일부가 섀시에 테이프로 붙인 옥수수 과자 봉지와 함께 돌아간다. 그게 효과가 있는 건 그걸 유지하는 사람들이 효과가 있다고 믿기 때문이다 — 대부분의 IT 문화에 대한 놀랍도록 정직한 묘사이기도 하다.

**KKTerm**은 **Kuai Kuai Term**이다 — 그 과자와 같은 일을 꿈꾸는 관리 워크스페이스다: 당신의 중요한 기계들 옆에 조용히 앉아 얌전히 굴도록 돕는 것. 로컬 우선. 텔레메트리 없음. 승인 게이트가 달린 AI. 지루하지만 믿음직한 종류의 소프트웨어.

진짜 과이과이 한 봉지를 설치 프로그램에 동봉하는 건 아직 못 했다. 그건 v2 과제다.

---

## 움직이는 모습 보기

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>(데모 GIF는 여기에. 한 장의 그림이 천 개의 글머리표를 이긴다. 그리고 글머리표는 거의 다 떨어졌다.)</em></sub></p>

---

## 하나의 창, 모든 연결

| 당신이 하고 싶었던 것 | KKTerm은 이렇게 한다 |
| --- | --- |
| 로컬 PowerShell / cmd / WSL 셸 열기 | 로컬 터미널, 나란히 |
| 서버로 SSH | 키·agent·비밀번호·점프 호스트·포트 포워딩을 지원하는 SSH |
| 그 서버의 파일 둘러보기 | SSH 연결에서 바로 SFTP — 듀얼 페인, 드래그로 전송 |
| 2012년산 NAS로 FTP | FTP / FTPS, 같은 파일 브라우저 안에서 |
| 골동품 장비로 Telnet | 네, Telnet도 들어 있습니다 |
| 시리얼 포트와 대화 | Serial 연결 — COM 포트와 보드레이트만 고르면 끝 |
| Windows 머신으로 원격 | 진짜 Microsoft 원격 데스크톱을 내장 |
| Pi로 VNC | VNC, 워크스페이스에 곧장 렌더링 |
| 라우터 웹 UI 열기 | 로그인 정보를 저장할 수 있는 내장 브라우저 탭 |
| 호스트 CPU 보기 | 실시간 상태 표시줄과, 직접 쌓아 올릴 수 있는 Dashboard |

같은 앱. 같은 창. 같은 단축키. 같은, 부디 눈이 아프지 않기를 바라는 테마.

---

## 왜 사람들은 하루 종일 켜 두는가

### 작은 다운로드, 번개 같은 실행

KKTerm은 플랫폼이 아니라 도구처럼 느껴지도록 만든다. 현재 데스크톱 빌드는 대략 10-13 MB 정도이고, 설치가 빠르며, 관리자 작업 공간을 여는 일이 두 번째 운영체제를 부팅하는 것처럼 느껴지지 않을 만큼 빠르게 실행된다.

작은 크기는 점프 박스, 오래된 노트북, VM에서 중요하다. 백그라운드 서비스가 하나 늘 때마다 의심할 것도 하나 늘기 때문이다. KKTerm은 열리고, 작업 공간을 복원하고, 방해하지 않는다.

### 멀티 Pane 그리드, 원하는 대로 섞기

하나의 Tab은 Pane 그리드를 담을 수 있고, 그 Pane들이 같은 종류일 필요는 없다. SSH 옆에 SFTP를 두고, RDP Session 아래에 로컬 PowerShell을 두고, VNC 옆에 라우터 Web UI를 두거나, 파일을 옮기는 터미널 옆에 파일 브라우저를 둘 수 있다.

실제 관리 작업의 지저분한 모양을 그대로 담는 하나의 작업 공간이다. Connection 종류를 섞고, 그리드를 조절하고, live Sessions를 계속 살려 두면서 창더미 사이를 Alt-Tab으로 헤매는 일을 멈출 수 있다.

### 도구를 만들어 주는 AI 어시스턴트

대부분의 "터미널 속 AI" 데모는 채팅에서 멈춘다. KKTerm의 어시스턴트는 당신이 실제로 일하는 방식에 맞춰 작고 오래가는 Dashboard 위젯도 만든다 — 그리고 위험한 건 스위치 뒤에 둔다：

- **무엇을 건드릴 수 있는지 정한다** — 도구 묶음(Dashboard / Connections / Live Sessions)을 통째로 켜고 끄기.
- **어떻게 물어볼지 정한다** — `Prompt`(기본, 매번 묻기) 또는 `Allow All`(당신은 성인이고, 각서에 서명했다).

`rm -rf`처럼 보이는 건 전부 위험으로 표시되어 사람의 명시적인 예스를 기다린다. 누군가 man page에 프롬프트 인젝션을 심어 잔머리를 굴려도, AI가 파괴적인 명령을 몰래 실행하는 일은 없다.

OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA, 또는 OpenAI 호환 엔드포인트 무엇과도 대화한다. API 키는 OS 키체인에 들어간다.

### Grafana인 척하지 않는 Dashboard

Dashboard는 드래그·리사이즈 가능한 위젯 그리드다. 페타바이트급 관측을 위한 게 아니다 — "내가 좋아하는 앱 다섯 개를 실행하는 버튼과, 내 SSH 호스트 가동 시간을 보여주는 패널을, *내 채팅 옆에* 두고 싶다"를 위한 것이다.

#### AI가 만든 위젯 — 말로 하면, 나온다

이 부분은 우리가 정말로 신나는 지점이다. 마켓플레이스에서 고르지도, JavaScript를 쓰지도 않는다. **AI 어시스턴트에게 원하는 걸 말하면**, 바로 당신의 Dashboard 위에 위젯을 만들어 준다：

> *"내 메인 repo의 최근 커밋 5개를 목록으로 보여주는 위젯 추가해 줘."*
> *"온콜 치트시트를 담아둘 포스트잇 위젯 만들어 줘."*
> *"우리 집 라우터를 30초마다 ping해서 초록/빨강을 보여주는 위젯 만들어 줘."*
> *"스톱워치가 필요해. 스타일은 알아서, 놀래켜 봐."*

어떤 건 단순한 표시 패널(markdown, 체크리스트, 큼직한 숫자 하나)이고, 어떤 건 당신이 승인한 격리 샌드박스 안에서 실시간 코드를 돌린다. 남겨둔 위젯은 전부 당신 것이다 — 고유한 색·아이콘·제목을 달고 저장되며, 크기가 다른 사본을 여러 개 둘 수 있다. 질리면 우클릭으로 삭제.

#### Dashboard 애니메이션 배경 (그냥 하고 싶어서)

Dashboard 뷰마다 **25종**의 캔버스 애니메이션 배경에서 기분을 고를 수 있다：

| 기분 | 배경 |
| --- | --- |
| 잔잔 | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| 우주 | `starfield`, `nebula` |
| 따뜻 | `embers`, `lava` |
| 긱 | `matrix`, `topo`, `synthwave` |
| 들썩 | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

다른 화면에 있을 땐 멈추므로 비용은 거의 0이다. `matrix`를 AI 어시스턴트와 짝지으면 "나는 극도로 생산적이며 아마도 워쇼스키 영화 속에 있다"는 분위기가 난다. 아니면 `ocean`을 골라 진지한 사람처럼 보이거나. 어느 쪽이든 우리는 평가하지 않는다.

### 원격 AI 에이전트를 살아 있게 유지

이게 사람들이 빠져드는 두 번째 기능이다. KKTerm의 SSH 터미널은 재연결을 견뎌내는 원격 호스트의 **이름 붙은 tmux 세션** 안으로 당신을 곧장 떨어뜨릴 수 있다：

- tmux를 켠 SSH 연결을 열고 `claude`, `codex`, `gemini-cli`, `cursor-agent`, 또는 좋아하는 장시간 에이전트를 실행한다.
- 노트북을 닫는다. 다시 연다. Pane은 조용히 다시 붙는다 — 에이전트는 여전히 돌고 있고, 스크롤백도 남아 있고, 하던 일을 그대로 하고 있다.
- 네트워크가 깜빡? KKTerm은 당신을 귀찮게 하지 않고 같은 세션으로 조용히 다시 연결한다.
- 어시스턴트의 도움이 필요하다면? "터미널 버퍼를 컨텍스트에 추가"로 원격 세션 전체가 대화에 들어와, 로컬 AI가 원격 에이전트의 작업을 추론할 수 있다.

호텔의 불안정한 Wi-Fi 때문에 6시간짜리 `claude`나 `codex` 세션을 날려본 적이 있다면, 이 기능 하나로 본전은 뽑는다. (앱은 무료다. 그래도 이 기능은 그만한 가치가 있다.)

### AI가 얼마나 남았는지 알기

코딩 에이전트는 월 단위가 아니라 요금제 윈도 단위로 과금하고, 당신이 회의에 들어가 있는 동안에도 기꺼이 할당량을 먹어 치운다. **AI 사용량 미터**가 그걸 늘 보이게 한다：

- **Claude Code**와 **Codex**를 나란히 보여주는 Dashboard 위젯: 연결된 계정, 요금제, 현재 윈도와 이번 주 사용량, 다음 리셋 시각.
- 같은 숫자를 비추는 간결한 **상태 표시줄 인디케이터**. Dashboard를 닫아두어도 다음 대규모 리팩터링 전에 여유가 있는지 한눈에 안다.
- 다시 로그인해야 하는지 미리 알려준다 — 긴 작업 *전에*, 도중이 아니라.

### 다른 AI가 KKTerm을 조종하게 하기

KKTerm은 자체 MCP 서버를 내장하고 있어, 외부 코딩 에이전트(Claude Code, Codex, Copilot, Antigravity, OpenCode)가 당신처럼 워크스페이스를 쓸 수 있다 — 연결 목록 보기, 하나 열기, 터미널 버퍼 읽기, Dashboard에 위젯 놓기. AI 대 AI, 당신의 머신 위에서, 클라우드 중계 없이. 변경을 가하는 더 위험한 동작들은 기본적으로 **꺼져 있는** 단일 안전 토글 뒤에 있다.

설정 → AI Assistant → **Built-in MCP Server**에 모든 게 미리 채워진 원클릭 "설정 표시" 대화상자가 있고, 복사 가능한 `claude mcp add` / `codex mcp add` 명령도 들어 있다.

---

## KKTerm이 아닌 것

짧은 목록, 정직함이 신뢰를 벌기 때문이다：

- **클라우드 제품이 아니다.** 동기화 없음, 팀 계정 없음, SaaS 요금제 없음. 언젠가 "KKTerm에 로그인" 대화상자를 본다면, 뭔가 치명적으로 잘못된 것이다.
- **크로스 플랫폼인 척하지 않는다.** 우리는 의도적으로 Windows 우선이다; macOS와 Linux는 로드맵에 있다. 오늘 mac 우선 도구가 필요하다면 선택지는 수백 개다. 우리는 Windows 관리자들이 조용히 기다려 온 그 하나를 만들고 있다.
- **자율 AI 에이전트가 아니다.** 어시스턴트는 제안하고, 사람이 결정한다. `Allow All`은 기본값이 아니라 당신이 내리는 선택이다.
- **Grafana / Datadog 대체재가 아니다.** Dashboard는 개인용 제어판을 위한 것이지, 1만 대 규모 관측을 위한 게 아니다.
- **Kubernetes IDE가 아니다.** 이건 터미널 중심의 관리 워크스페이스다. Helm 차트를 그려달라고 하지 말아 달라.

그중 무엇이든 *예전엔* 거래 결렬 사유였다면 — 좋다, v2에서 보자.

---

## KKTerm 받기

**[최신 Windows 설치 프로그램 (.exe) 다운로드](https://github.com/ryantsai/KKTerm/releases/latest)** 후 실행하면 된다. 설치 프로그램은 현재 **서명되지 않았다** — 릴리스 서명은 로드맵에 있으므로, 그전까지는 백신이 당신을 엄한 눈으로 볼 수 있다. 정상이다.

소스에서 빌드하거나 기여하고 싶다면? 필요한 건 전부 [`CONTRIBUTING.md`](CONTRIBUTING.md)에 있다.

---

## 로드맵 (짧은 버전)

- macOS + Linux 빌드
- 서명된 설치 프로그램 + 자동 업데이트
- 더 강력한 파일 전송 (이어받기, 폴더 동기화, 압축/해제)
- 더 풍부한 원격 데스크톱 클립보드·장치 공유
- 더 많은 내장 Dashboard 위젯

전체이며 자주 갱신되는 버전: [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## 기여하기

손을 보태주면 정말 좋겠다. 진심이다. 작은 것도 중요하다：

- **dev 빌드를 써보고**, 뭔가 이상하면 issue를 남겨 달라. "어딘가 이상했다"도 정당한 버그 리포트다; 함께 파보겠다.
- **로케일을 번역하라.** 영어가 source of truth이고, 그 옆에 다른 13개 언어가 산다.
- **Dashboard 위젯을 추가하라.** 작은 아이디어를 골라 출시하고 패턴을 익혀라.
- **매뉴얼을 개선하라.** 어떤 기능을 썼는데 문서가 도움이 안 됐다면, 그걸 고치는 PR은 금이다.

전체 설정, 프로젝트 구조, PR 체크리스트는 [`CONTRIBUTING.md`](CONTRIBUTING.md)에 있다. 진입점을 찾고 있나? open issue를 [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) 또는 [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)로 걸러 보라.

---

## 프로젝트 문서

- [제품 컨텍스트](CONTEXT.md) — 맞춰야 할 도메인 언어
- [아키텍처](docs/ARCHITECTURE.md) — 모듈 지도, 새 코드를 둘 곳
- [로드맵](docs/ROADMAP.md)
- [Dashboard 아키텍처](docs/DASHBOARD.md)
- [AI 프로바이더 가이드](docs/AI_PROVIDERS.md)

---

## 스타 히스토리

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

여기까지 읽고도 아직 스타를 안 눌렀다면 — 뭘 기다리나, 직접 쓴 초대장이라도? 이게 바로 그 직접 쓴 초대장이다.

⭐ **[GitHub에서 KKTerm에 스타 누르기](https://github.com/ryantsai/KKTerm)** — 클릭 한 번이면 메인테이너의 한 주가 통째로 환해진다. 랙 위에 올려두는 디지털 과이과이라고 생각해 달라.

---

## 라이선스

MIT. [LICENSE](LICENSE) 참고. 쓰고, 포크하고, 출시하고, 아무도 못 찾는 홈랩에 넣어두라 — 그게 이 거래다.
