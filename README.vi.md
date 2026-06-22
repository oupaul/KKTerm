<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>Một cửa sổ Windows native duy nhất cho terminal, SSH, SFTP, RDP/VNC và một dashboard — cộng thêm một AI dựng cho bạn những công cụ nhỏ của riêng bạn theo yêu cầu.</strong>
</p>

<p align="center">
  <em>Vì thanh tác vụ của bạn không nên trông như một cái máy đánh bạc ở Las Vegas.</em>
</p>

<p align="center">
  <sub>Đặt tên theo <strong>乖乖 (Kuāi Kuāi)</strong>, món snack bắp vị dừa màu xanh mà các sysadmin Đài Loan đặt lên server để chúng ngoan ngoãn. Mong rằng app này cũng giành được chỗ của nó trên rack.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Tải bộ cài Windows mới nhất (.exe)</a></strong>
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
    <a href="README.ko.md">한국어</a> ·
    <a href="README.fr.md">Français</a> ·
    <a href="README.de.md">Deutsch</a> ·
    <a href="README.es.md">Español</a> ·
    <a href="README.es-MX.md">Español (MX)</a> ·
    <a href="README.it.md">Italiano</a> ·
    <a href="README.pt-BR.md">Português (BR)</a> ·
    <a href="README.th.md">ไทย</a> ·
    <a href="README.id.md">Bahasa Indonesia</a> ·
    <strong>Tiếng Việt</strong>
  </sub>
</p>

---

## Lời chào trong 45 giây

Bạn là sysadmin / DevOps / dân chơi homelab / vibe-coder. Ngay lúc này bạn có:

- Một trình giả lập terminal
- Một SSH client riêng (với danh sách profile mà bạn mất cả cuối tuần để dựng)
- Một SFTP client từ 2007 mà chẳng hiểu sao vẫn còn sống
- Remote Desktop trong một cửa sổ mà bạn cứ lạc mất ở sai màn hình
- Một trình xem VNC chỉ vì đúng một cái máy Linux đó
- Một tab trình duyệt cho trang quản trị của router
- Một trình quản lý tệp để ngó nghiêng ổ đĩa cục bộ, và một trình soạn thảo văn bản chỉ vì đúng một cái log mà bạn cứ `tail` mãi
- Một phiên `claude` / `codex` trên máy từ xa, rớt mỗi lần Wi-Fi hắt hơi
- Một tờ giấy nhớ ghi mật khẩu *(yên tâm, tụi mình không nói đâu)*

**KKTerm là một cửa sổ duy nhất cho tất cả những thứ đó.** Native trên Windows — *có chủ đích, trong khi phần còn lại của thế giới công cụ dev ra bản mac trước và coi hệ điều hành của bạn như một dòng chú thích cuối trang* — trong một bộ cài duy nhất và từ chối gọi về nhà.

Cộng thêm vài thứ bạn không biết là mình muốn:

- Một **Dashboard** nơi bạn bảo AI *"dựng cho tôi một widget ping router của tôi mỗi 30 giây"* và nó hiện ra, trong sandbox riêng, trên lưới của bạn.
- **Các pane SSH tự gắn lại vào phiên `claude` / `codex` từ xa của bạn** sau mỗi cơn dỗi của Wi-Fi, để một công việc sáu tiếng sống sót qua một lần rớt mạng.
- **Workspaces** giữ homelab, công việc chính và đám server của khách hàng kia trong những hộp chứa riêng biệt, chuyển đổi chỉ bằng một cú nhấp.
- Một **đồng hồ đo mức dùng AI** để bạn thôi đâm sầm vào bức tường rate limit một cách bất ngờ lúc 3 giờ sáng.
- Một **Install Helper** tìm, cài, cập nhật và mở các công cụ dev Windows mà thường bạn phải lùng qua mười tab trình duyệt.
- **Hai mươi lăm hình nền động** cho dashboard (đúng vậy, có cả `matrix`), vì tụi mình cũng chẳng sĩ diện gì.

Và phần hay nhất: trợ lý AI có thể biến một câu duy nhất thành một công cụ dashboard nhỏ mà bạn thực sự dùng tiếp.

> ⭐ **Nếu nghe giống cái app mà bạn đã định dựng suốt sáu năm qua — hãy gắn sao cho repo để tụi mình biết có người đang theo dõi. Thật sự rất giúp ích.**

Có ý kiến về việc nên làm gì tiếp theo? Tham gia luồng góp ý công khai:
**[KKTerm nên ưu tiên gì cho các luồng công việc quản trị đa nền tảng?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## Vì sao là "KKTerm"?

Bước vào bất kỳ trung tâm dữ liệu nào ở Đài Loan và nhìn lên đỉnh các rack. Vượt qua các fab của TSMC, phòng điều khiển Metro Đài Bắc, phòng máy chủ của ngân hàng Cathay, thiết bị chuyển mạch của Chunghwa Telecom — bạn sẽ thấy một túi nhỏ màu xanh 乖乖 (Kuāi Kuāi), món snack bắp vị dừa từ thập niên 1960.

Cái tên dịch nghĩa đen là **"ngoan nào"**, **"cư xử cho đàng hoàng"**. Truyền thống trong giới IT đơn giản và hoàn toàn nghiêm túc:

- **Phải là màu xanh (dừa).** Vàng (cà ri) nghĩa là *hôm nay ở nhà đi*; đỏ (cay) làm server nổi giận. Chỉ xanh thôi.
- **Không được hết hạn.** Một gói Kuai Kuai để lâu lại phản tác dụng. Kỹ sư siêng năng thay mới.
- **Phải nhìn thấy được.** Server phải biết là nó ở đó.
- **Đừng ăn.** Túi đó đang làm nhiệm vụ.

Một số hệ thống lớn nhất, buồn tẻ nhất và ám ảnh uptime nhất ở châu Á đang chạy với một túi bắp dán trên thân máy. Nó hiệu nghiệm vì những người bảo trì tin là nó hiệu nghiệm, mà đó lại là mô tả thành thật đến lạ về phần lớn văn hóa IT.

**KKTerm** là **Kuai Kuai Term** — một không gian quản trị mong làm đúng công việc của món snack: ngồi lặng lẽ bên cạnh các cỗ máy quan trọng của bạn và giúp chúng cư xử đàng hoàng. Local-first. Không telemetry. AI phải được phê duyệt. Loại phần mềm buồn tẻ mà đáng tin cậy.

Tụi mình vẫn chưa thể kèm một túi Kuai Kuai thật vào bộ cài. Đó là việc của v2.

---

## Xem nó chuyển động

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>(GIF demo. Một bức ảnh đáng giá nghìn gạch đầu dòng, mà tụi mình thì hết gạch đầu dòng rồi.)</em></sub></p>

<p align="center">
  <img src="docs/assets/screenshots/hero.png" alt="Toàn bộ cửa sổ KKTerm: cây kết nối, một lưới Panes trực tiếp và trợ lý AI" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — toàn bộ không gian làm việc trong một cái liếc: cây kết nối bên trái, lưới Panes trực tiếp ở giữa, trợ lý AI bên phải.</em></sub></p>

---

## Một cửa sổ, mọi kết nối

| Bạn muốn… | KKTerm làm được |
| --- | --- |
| Mở shell cục bộ PowerShell / cmd / WSL | Terminal cục bộ, kề nhau |
| SSH vào một server | SSH với khóa, agent, mật khẩu, jump host và port forwarding |
| Duyệt tệp trên server đó | SFTP từ kết nối SSH — hai khung, kéo để truyền |
| FTP đến một NAS từ 2012 | FTP / FTPS trong cùng trình duyệt tệp |
| Telnet đến thiết bị cổ lỗ | Đúng, Telnet cũng có trong đó |
| Nói chuyện với cổng serial | Kết nối serial — chọn cổng COM và baud |
| Remote vào một máy Windows | Remote Desktop Microsoft xịn, tích hợp sẵn |
| VNC vào một con Pi | VNC, render thẳng vào không gian làm việc |
| Mở giao diện web của router | Một tab trình duyệt nhúng với thông tin đăng nhập đã lưu |
| Duyệt ổ đĩa của chính bạn | Một pane File Explorer cục bộ, cùng lớp vỏ hai khung như SFTP |
| Mở một log, CSV, ảnh hoặc PDF | Một trình xem Document tích hợp với chế độ log tail-follow đúng nghĩa |
| Theo dõi CPU của host | Một thanh trạng thái thời gian thực và một dashboard bạn tự dựng |

Cùng một app. Cùng một cửa sổ. Cùng phím tắt. Cùng một theme, mong là không làm mắt bạn chảy máu.

<p align="center">
  <img src="docs/assets/screenshots/connections-grid.png" alt="Một Tab duy nhất chứa SSH, SFTP và một Web UI nhúng kề nhau" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — một Tab duy nhất, nhiều loại Connection chung sống: SSH cạnh SFTP cạnh một Web UI nhúng.</em></sub></p>

---

## Vì sao người ta để mở nó cả ngày

### Tải xuống nhỏ, khởi động nhanh như chớp

KKTerm được xây để có cảm giác như một tiện ích, không phải một nền tảng. Các bản desktop hiện tại chỉ khoảng 10-13 MB, cài nhanh và khởi động đủ nhanh để việc mở workspace quản trị không giống như đang bật thêm một hệ điều hành thứ hai.

Dấu chân nhỏ này quan trọng trên jump box, laptop cũ và VM, nơi mỗi dịch vụ nền thêm vào là một thứ nữa phải nghi ngờ. KKTerm mở lên, khôi phục workspace của bạn, rồi nhường chỗ cho bạn làm việc.

### Lưới nhiều Pane, trộn đúng cách bạn làm việc

Một Tab có thể chứa một lưới Panes, và các Panes đó không cần cùng loại. Đặt SSH cạnh SFTP, PowerShell cục bộ dưới một RDP Session, VNC cạnh Web UI của router, hoặc trình duyệt tệp cạnh terminal đang chuyển tệp.

Đó là một workspace cho hình dạng thật sự, lộn xộn của công việc quản trị: trộn các loại Connection, đổi kích thước lưới, giữ live Sessions tiếp tục sống và thôi Alt-Tab qua cả đống cửa sổ.

<p align="center">
  <img src="docs/assets/screenshots/multi-pane.png" alt="Một Tab chia thành bốn pane với các loại kết nối khác nhau" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — một lưới bốn ô: PowerShell, một phiên SSH, một trình duyệt SFTP và một bề mặt VNC, tất cả trong một Tab.</em></sub></p>

### Một trợ lý AI dựng công cụ cho bạn

Phần lớn các demo "AI trong terminal" dừng ở chat. Trợ lý của KKTerm còn dựng được những widget dashboard nhỏ, bền, hợp với cách bạn làm việc thật — và giữ những thứ nguy hiểm phía sau một công tắc:

- **Quyết định nó được chạm vào gì** — bật hoặc tắt cả nhóm công cụ (Dashboard / Connections / Live Sessions).
- **Quyết định nó hỏi thế nào** — `Prompt` (mặc định, hỏi mỗi lần) hoặc `Allow All` (bạn là người lớn, bạn đã ký giấy miễn trừ).

Bất cứ thứ gì trông giống `rm -rf` đều bị đánh dấu nguy hiểm và chờ một cái gật đầu rõ ràng của con người. AI không thể lén chạy một lệnh phá hủy chỉ vì ai đó khôn lỏi nhét một prompt injection vào một trang man.

Nó nói chuyện với OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA, hoặc bất kỳ endpoint nào tương thích OpenAI. Khóa API của bạn được đưa vào keychain của hệ điều hành.

Nó còn thấy được những gì bạn thấy: chụp một vùng hoặc cả một Pane bằng **menu chụp màn hình** rồi gửi thẳng vào cuộc trò chuyện, để "sao hộp thoại này trông sai sai vậy?" trở thành một câu hỏi mà trợ lý thật sự trả lời được.

<p align="center">
  <img src="docs/assets/screenshots/ai-assistant.png" alt="Bảng trợ lý AI với các công tắc truy cập công cụ và chế độ phê duyệt" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — bảng trợ lý AI: công tắc theo nhóm công cụ, công tắc Prompt / Allow All, và một lệnh nguy hiểm đang chờ một cái gật đầu của con người.</em></sub></p>

### Một dashboard không giả vờ làm Grafana

Dashboard là một lưới widget mà bạn kéo và đổi kích thước. Nó không dành cho observability quy mô petabyte — nó dành cho "tôi muốn một nút mở năm app yêu thích và một bảng hiện uptime của host SSH, *bên cạnh* khung chat của tôi".

#### Widget do AI tạo — mô tả là có

Đây là phần khiến tụi mình thực sự hào hứng. Bạn không chọn từ một marketplace và không viết JavaScript. Bạn **bảo trợ lý AI điều bạn muốn**, và nó dựng widget ngay tại đó, trên dashboard của bạn:

> *"Thêm một widget hiện 5 commit gần nhất của repo chính của tôi dưới dạng danh sách."*
> *"Làm cho tôi một widget giấy nhớ để lưu bảng tra trực của tôi."*
> *"Dựng một widget ping router nhà tôi mỗi 30 giây và hiện xanh/đỏ."*
> *"Tôi cần một đồng hồ bấm giờ. Phong cách thì tùy bạn, làm tôi bất ngờ đi."*

Có cái là bảng hiển thị đơn giản (markdown, checklist, một con số to); có cái chạy mã trực tiếp trong một sandbox cô lập mà bạn phê duyệt. Mỗi widget bạn giữ là của bạn — nó được lưu cùng màu, icon và tiêu đề riêng, và bạn có thể có nhiều bản sao với kích thước khác nhau. Xóa một cái bằng chuột phải khi hết phép màu.

<p align="center">
  <img src="docs/assets/screenshots/ai-widgets.png" alt="Một lưới dashboard đầy widget do AI tạo" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — một khung nhìn Dashboard đầy widget do AI dựng: một bộ giám sát ping, một tờ giấy nhớ, một con số trực tiếp, và một món đồ chơi nhỏ chẳng có lý do gì để vui đến thế.</em></sub></p>

#### Hình nền động của dashboard (vì tụi mình thích thế)

Chọn một tâm trạng cho mỗi khung nhìn dashboard từ **hai mươi lăm** hình nền động trên canvas:

| Tâm trạng | Hình nền |
| --- | --- |
| Tĩnh lặng | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Vũ trụ | `starfield`, `nebula` |
| Ấm | `embers`, `lava` |
| Geek | `matrix`, `topo`, `synthwave` |
| Bồn chồn | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

Chúng tạm dừng khi bạn ở chỗ khác, nên gần như chẳng tốn gì. Ghép `matrix` với trợ lý AI của bạn cho một bầu không khí nói rằng "tôi cực kỳ năng suất và có lẽ đang ở trong phim của anh em Wachowski". Hoặc chọn `ocean` và trông như một người nghiêm túc. Tụi mình không phán xét lựa chọn nào cả.

<p align="center">
  <img src="docs/assets/screenshots/backgrounds.png" alt="Vài hình nền động đặt cạnh nhau" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — một bảng tâm trạng: `matrix`, `aurora`, `synthwave` và `taipei101`.</em></sub></p>

### Giữ cho các agent AI từ xa của bạn sống

Đây là tính năng thứ hai khiến người ta mê. Terminal SSH của KKTerm có thể thả bạn thẳng vào một **phiên tmux có tên** trên host từ xa, sống sót qua việc kết nối lại:

- Mở một kết nối SSH bật tmux rồi khởi động `claude`, `codex`, `gemini-cli`, `cursor-agent`, hoặc agent chạy dài nào bạn thích.
- Gập laptop lại. Mở ra lại. Pane lặng lẽ gắn lại — agent vẫn đang chạy, vẫn còn scrollback, vẫn ở giữa việc nó đang làm.
- Mạng chớp một cái? KKTerm lặng lẽ nối lại vào đúng phiên đó mà không làm phiền bạn.
- Muốn trợ lý giúp? "Thêm terminal buffer vào ngữ cảnh" hút trọn phiên từ xa vào cuộc trò chuyện, để AI cục bộ của bạn có thể suy luận về việc agent từ xa đang làm gì.

Nếu bạn từng mất một phiên `claude` hay `codex` sáu tiếng vì Wi-Fi khách sạn chập chờn, riêng tính năng này đã đủ đáng tiền app. (App miễn phí. Tính năng vẫn đáng giá như thường.)

Shell cục bộ cũng có cùng mánh đó trên Windows: các pane PowerShell có thể chạy bên trong **psmux**, bản sao tmux native, để các tác vụ cục bộ chạy dài của bạn sống sót qua một Pane bị đóng y như các phiên từ xa.

<p align="center">
  <img src="docs/assets/screenshots/tmux-reattach.png" alt="Một pane SSH gắn lại vào một phiên tmux có tên sau khi kết nối lại" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — danh sách phiên tmux/psmux trên thanh công cụ của Pane, với một agent `claude` từ xa vẫn đang chạy sau khi kết nối lại.</em></sub></p>

### Biết bạn còn bao nhiêu AI

Các agent lập trình tính tiền theo cửa sổ gói, không theo tháng, và chúng vui vẻ xơi hết hạn mức của bạn trong lúc bạn đang họp. **Đồng hồ đo mức dùng AI** giữ cho điều đó luôn hiện rõ:

- Một widget dashboard hiện **Claude Code** và **Codex** cạnh nhau: tài khoản đang kết nối, gói, mức đã dùng trong cửa sổ hiện tại và tuần này, thời điểm reset kế tiếp.
- Một **chỉ báo gọn trên thanh trạng thái** phản chiếu cùng những con số, để cả khi đóng dashboard bạn vẫn liếc một cái là biết còn dư địa trước lần refactor lớn kế tiếp hay không.
- Nó báo trước cho bạn nếu cần đăng nhập lại — *trước* một tác vụ dài, chứ không phải giữa chừng.

<p align="center">
  <img src="docs/assets/screenshots/usage-meter.png" alt="Widget đồng hồ đo mức dùng AI và chỉ báo trên thanh trạng thái" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — widget mức dùng hiện Claude Code và Codex cạnh nhau, cùng bản phản chiếu gọn trên thanh trạng thái.</em></sub></p>

### Tách biệt các thế giới của bạn bằng Workspaces

Homelab, công việc chính và đám server của khách hàng kia không thuộc về cùng một danh sách. **Workspaces** là các hộp chứa Connections có tên, biệt lập, mà bạn chuyển đổi từ Activity Rail. Chuyển đổi chỉ định lại phạm vi cho cây kết nối — các Sessions đang mở, Dashboard và Cài đặt của bạn vẫn nguyên chỗ — nên đổi ngữ cảnh tốn một cú nhấp, không phải khởi động lại.

<p align="center">
  <img src="docs/assets/screenshots/workspaces.png" alt="Bộ chuyển workspace trong activity rail" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — bộ chuyển workspace ở đỉnh Activity Rail, đang giữa lúc chuyển giữa "Home Lab" và "Day Job".</em></sub></p>

### Tệp và log, trong cùng một cửa sổ

Không phải mọi thứ đều là host từ xa. KKTerm duyệt **ổ đĩa cục bộ** của bạn trong một Pane File Explorer (cùng lớp vỏ hai khung như SFTP), và mở một tệp đơn lẻ trong một **trình xem Document** chọn đúng chế độ cho công việc: văn bản/mã với một trình soạn nhẹ và lưu an toàn, Markdown, bảng CSV/TSV, JSON, ảnh, PDF, và một **chế độ Log** chuyên dụng với tô màu theo cấp, lọc, ANSI và tail-follow. Không còn phải với tay tới một trình soạn riêng chỉ để đọc cái log mà bạn vốn đang đứng ngay cạnh.

<p align="center">
  <img src="docs/assets/screenshots/file-viewer.png" alt="Trình xem Document ở chế độ log-tail bên cạnh một pane file explorer" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — trình xem Document đang bám theo một log trực tiếp (màu theo cấp + lọc) bên cạnh một Pane File Explorer cục bộ.</em></sub></p>

### Để các AI khác lái KKTerm

KKTerm mang theo server MCP của riêng nó, để các agent lập trình bên ngoài (Claude Code, Codex, Copilot, Antigravity, OpenCode) dùng không gian làm việc của bạn như chính bạn — liệt kê kết nối, mở một cái, đọc một terminal buffer, đặt widget lên dashboard. AI tới AI, trên máy bạn, không có relay đám mây. Các hành động làm thay đổi, rủi ro hơn, nằm sau một công tắc an toàn duy nhất **tắt** theo mặc định.

Cài đặt → AI Assistant → **Built-in MCP Server** có hộp thoại "Hiện cấu hình" một cú nhấp, điền sẵn, kèm các lệnh `claude mcp add` / `codex mcp add` để sao chép.

<p align="center">
  <img src="docs/assets/screenshots/mcp-server.png" alt="Cài đặt server MCP tích hợp với hộp thoại hiện cấu hình" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Ảnh chụp màn hình tạm</strong> — bảng Built-in MCP Server với hộp thoại "Hiện cấu hình" và công tắc an toàn (tắt theo mặc định).</em></sub></p>

---

## KKTerm không phải là gì

Một danh sách ngắn, vì sự trung thực đổi lấy niềm tin:

- **Không phải sản phẩm đám mây.** Không đồng bộ, không tài khoản nhóm, không gói SaaS. Nếu một ngày bạn thấy hộp thoại "Đăng nhập vào KKTerm", thì có gì đó đã sai một cách thảm họa.
- **Không giả vờ mọi hệ điều hành đều giống nhau.** KKTerm phát hành bản Windows, macOS và Linux, nhưng vẫn ghi rõ các tính năng riêng của từng nền tảng.
- **Không phải agent AI tự hành.** Trợ lý đề xuất; con người quyết định. `Allow All` là lựa chọn bạn đưa ra, không phải mặc định.
- **Không phải bản thay thế Grafana / Datadog.** Dashboard dành cho các bề mặt điều khiển cá nhân, không phải observability cho 10.000 host.
- **Không phải IDE Kubernetes.** Đây là một không gian quản trị lấy terminal làm trung tâm. Xin đừng bắt nó render một Helm chart.

Nếu một trong số đó *từng* là yếu tố quyết định — cũng phải thôi, hẹn gặp ở v2.

---

## Tải KKTerm

**[Tải bộ cài Windows mới nhất (.exe)](https://github.com/ryantsai/KKTerm/releases/latest)** rồi chạy nó. Bộ cài hiện **chưa được ký** — việc ký bản phát hành nằm trong roadmap, nên đến lúc đó phần mềm diệt virus của bạn có thể nhìn bạn nghiêm khắc. Đó là chuyện bình thường.

Muốn build từ mã nguồn hay đóng góp? Mọi thứ bạn cần đều nằm trong [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Roadmap (bản ngắn)

- Bản build macOS + Linux
- Bộ cài đã ký + tự động cập nhật
- Truyền tệp mạnh hơn (tiếp tục, đồng bộ thư mục, nén/giải nén)
- Chia sẻ clipboard và thiết bị Remote Desktop phong phú hơn
- Thêm widget dashboard có sẵn

Bản đầy đủ và cập nhật thường xuyên: [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Đóng góp

Tụi mình rất mong có người chung tay. Thật đấy. Việc nhỏ cũng quan trọng:

- **Thử bản build dev** và mở một issue khi thấy có gì đó sai sai. "Thấy là lạ" là một báo cáo lỗi hợp lệ; tụi mình sẽ đào cùng bạn.
- **Dịch một ngôn ngữ.** Tiếng Anh là nguồn chân lý; mười ba ngôn ngữ khác sống ngay bên cạnh.
- **Thêm một widget dashboard.** Chọn một ý nhỏ, ra mắt nó, học lấy mẫu hình.
- **Cải thiện sổ tay.** Nếu bạn dùng một tính năng mà tài liệu không giúp được, một PR sửa điều đó quý như vàng.

Toàn bộ thiết lập, cấu trúc dự án và checklist PR nằm trong [`CONTRIBUTING.md`](CONTRIBUTING.md). Đang tìm điểm khởi đầu? Lọc các issue đang mở theo [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) hoặc [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

---

## Tài liệu dự án

- [Bối cảnh sản phẩm](CONTEXT.md) — ngôn ngữ miền bạn nên tuân theo
- [Kiến trúc](docs/ARCHITECTURE.md) — bản đồ module, đặt mã mới ở đâu
- [Sổ tay người dùng](docs/manual/INDEX.md) — đi qua từng tính năng một
- [Roadmap](docs/ROADMAP.md)
- [Kiến trúc Dashboard](docs/DASHBOARD.md)
- [Server MCP tích hợp](docs/MCP.md)
- [Hướng dẫn nhà cung cấp AI](docs/AI_PROVIDERS.md)

---

## Lịch sử sao

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

Nếu bạn đã đọc đến đây mà vẫn chưa gắn sao — còn chờ gì nữa, một lời mời riêng à? Coi như đây là lời mời riêng đó.

⭐ **[Gắn sao cho KKTerm trên GitHub](https://github.com/ryantsai/KKTerm)** — chỉ tốn một cú nhấp và làm cả tuần của người bảo trì rạng rỡ. Cứ coi như một gói 乖乖 kỹ thuật số trên rack.

---

## Giấy phép

MIT. Xem [LICENSE](LICENSE). Dùng nó, fork nó, phát hành nó, đặt nó vào một homelab không ai khác tìm ra — đó là giao kèo.
