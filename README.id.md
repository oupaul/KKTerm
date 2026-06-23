<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>Satu jendela Windows native untuk terminal, SSH, SFTP, RDP/VNC, dan dashboard — plus AI yang membuatkan alat-alat kecilmu sendiri sesuai permintaan.</strong>
</p>

<p align="center">
  <em>Karena taskbar-mu tidak seharusnya terlihat seperti mesin slot Las Vegas.</em>
</p>

<p align="center">
  <sub>Dinamai dari <strong>乖乖 (Kuāi Kuāi)</strong>, camilan jagung hijau rasa kelapa yang ditaruh para sysadmin Taiwan di atas server agar berperilaku baik. Semoga aplikasi ini juga mendapat tempatnya di rak.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Unduh installer Windows terbaru (.exe)</a></strong>
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
    <strong>Bahasa Indonesia</strong> ·
    <a href="README.vi.md">Tiếng Việt</a>
  </sub>
</p>

---

## Pitch dalam 45 detik

Kamu seorang sysadmin / DevOps / penggemar homelab / vibe-coder. Saat ini kamu punya:

- Sebuah emulator terminal
- Klien SSH terpisah (dengan daftar profil yang butuh satu akhir pekan untuk dirakit)
- Klien SFTP dari 2007 yang entah bagaimana masih ada
- Remote Desktop di jendela yang selalu kamu kehilangan di monitor yang salah
- Sebuah viewer VNC hanya demi satu mesin Linux itu
- Satu tab browser untuk halaman admin router
- Sebuah file manager untuk mengulik disk lokal, dan satu editor teks hanya demi satu log yang terus kamu `tail`
- Sebuah sesi `claude` / `codex` di mesin remote yang putus setiap kali Wi-Fi bersin
- Secarik sticky note berisi kata sandi *(tenang, kami tak akan bilang)*

**KKTerm adalah satu jendela untuk semua itu.** Native di Windows — *sengaja, sementara dunia dev tools lainnya merilis mac dulu dan memperlakukan OS-mu seperti catatan kaki* — dalam satu installer yang menolak menelepon pulang.

Ditambah beberapa hal yang kamu tak tahu kamu inginkan:

- Sebuah **Dashboard** tempat kamu menyuruh AI *"buatkan widget yang ping router-ku tiap 30 detik"* lalu ia muncul, dalam sandbox-nya sendiri, di grid-mu.
- **Panel SSH yang menyambung kembali ke sesi remote `claude` / `codex`-mu** setelah setiap amukan Wi-Fi, agar kerja enam jam selamat dari putusnya koneksi.
- **Workspaces** yang menjaga homelab, pekerjaan kantor, dan server klien itu dalam wadah-wadah terpisah yang bisa kamu tukar dengan sekali klik.
- Sebuah **Install Helper** yang menemukan, memasang, memperbarui, dan menjalankan alat dev Windows yang biasanya kamu kejar lewat sepuluh tab browser.
- **Dua puluh lima latar animasi** untuk dashboard *dan terminalmu* (ya, termasuk `matrix`), karena kami tak terlalu jaim untuk itu.

Dan bagian terbaiknya: asisten AI bisa mengubah satu kalimat menjadi alat dashboard kecil yang benar-benar terus kamu pakai.

> ⭐ **Kalau ini terdengar seperti aplikasi yang sudah enam tahun ingin kamu bangun — beri bintang ke repo-nya agar kami tahu ada yang memperhatikan. Ini sungguh membantu.**

Punya pendapat tentang apa yang sebaiknya datang berikutnya? Gabung ke thread umpan balik publik:
**[Apa yang sebaiknya diprioritaskan KKTerm untuk alur kerja admin lintas platform?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## Kenapa "KKTerm"?

Masuklah ke data center Taiwan mana pun dan lihat bagian atas rak. Melewati pabrik TSMC, ruang kendali Metro Taipei, ruang server bank Cathay, perangkat switching Chunghwa Telecom — kamu akan melihat kantong hijau kecil 乖乖 (Kuāi Kuāi), camilan jagung rasa kelapa dari era 1960-an.

Namanya secara harfiah berarti **"jadilah baik"**, **"berperilakulah"**. Tradisi IT-nya sederhana dan sungguh-sungguh serius:

- **Harus hijau (kelapa).** Kuning (kari) berarti *hari ini di rumah saja*; merah (pedas) membuat server marah. Hanya hijau.
- **Tidak boleh kedaluwarsa.** Kuai Kuai basi justru merugikanmu. Para insinyur rajin menggantinya.
- **Harus terlihat.** Server harus tahu ia ada di sana.
- **Jangan dimakan.** Kantong itu sedang bertugas.

Beberapa sistem terbesar, paling membosankan, dan paling terobsesi pada uptime di Asia berjalan dengan sekantong jagung yang ditempel di sasis. Itu berhasil karena orang-orang yang merawatnya percaya itu berhasil, yang merupakan deskripsi luar biasa jujur tentang sebagian besar budaya IT.

**KKTerm** adalah **Kuai Kuai Term** — ruang kerja admin yang mengincar pekerjaan yang sama dengan camilan itu: duduk diam di samping mesin-mesin pentingmu dan membantu mereka berperilaku baik. Local-first. Tanpa telemetri. AI dengan persetujuan. Jenis perangkat lunak yang membosankan tapi bisa diandalkan.

Kami belum berhasil menyertakan sekantong Kuai Kuai sungguhan bersama installer-nya. Itu item untuk v2.

---

## Lihat ia bergerak

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>(GIF demo. Satu gambar bernilai seribu poin, dan poin kami sudah habis.)</em></sub></p>

<p align="center">
  <img src="docs/assets/screenshots/hero.png" alt="Jendela KKTerm utuh: pohon koneksi, grid Panes langsung, dan asisten AI" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — seluruh workspace sekilas: pohon koneksi di kiri, grid Panes langsung di tengah, asisten AI di kanan.</em></sub></p>

---

## Satu jendela, setiap koneksi

| Kamu ingin… | KKTerm melakukannya |
| --- | --- |
| Buka shell lokal PowerShell / cmd / WSL | Terminal lokal, berdampingan |
| SSH ke server | SSH dengan kunci, agent, kata sandi, jump host, dan port forwarding |
| Jelajahi berkas di server itu | SFTP dari koneksi SSH — panel ganda, seret untuk transfer |
| FTP ke NAS dari 2012 | FTP / FTPS di browser berkas yang sama |
| Telnet ke perangkat purba | Ya, Telnet juga ada di dalamnya |
| Bicara dengan port serial | Koneksi serial — pilih port COM dan baud |
| Remote ke mesin Windows | Remote Desktop Microsoft asli, terintegrasi langsung |
| VNC ke sebuah Pi | VNC, dirender langsung ke ruang kerja |
| Buka UI web router | Tab browser tertanam dengan login tersimpan |
| Jelajahi disk-mu sendiri | Panel File Explorer lokal, cangkang panel ganda yang sama dengan SFTP |
| Buka log, CSV, gambar, atau PDF | Penampil Document bawaan dengan mode log tail-follow sungguhan |
| Pantau CPU host | Bilah status langsung dan dashboard yang kamu rakit sendiri |

Aplikasi yang sama. Jendela yang sama. Pintasan yang sama. Tema yang sama, yang semoga tak bikin matamu berdarah.

<p align="center">
  <img src="docs/assets/screenshots/connections-grid.png" alt="Satu Tab berisi SSH, SFTP, dan UI web tertanam berdampingan" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — satu Tab, beberapa jenis Connection hidup berdampingan: SSH di sebelah SFTP di sebelah UI web tertanam.</em></sub></p>

---

## Kenapa orang membiarkannya terbuka seharian

### Unduhan kecil, peluncuran secepat kilat

KKTerm dibuat agar terasa seperti utilitas, bukan platform. Build desktop saat ini sekitar 10-13 MB, cepat dipasang, dan meluncur cukup cepat sehingga membuka workspace admin-mu tidak terasa seperti menyalakan sistem operasi kedua.

Jejak kecil ini penting di jump box, laptop lama, dan VM, tempat setiap layanan latar belakang tambahan adalah satu hal lagi yang patut dicurigai. KKTerm terbuka, memulihkan workspace-mu, lalu menyingkir.

### Grid multi-Pane, campur sesuai cara kerjamu

Sebuah Tab bisa berisi grid Panes, dan Panes itu tidak harus sejenis. Taruh SSH di sebelah SFTP, PowerShell lokal di bawah RDP Session, VNC di sebelah UI web router, atau file browser di samping terminal yang sedang memindahkan file.

Ini satu workspace untuk bentuk nyata pekerjaan admin yang berantakan: campur jenis Connection, ubah ukuran grid, biarkan live Sessions tetap hidup, dan berhenti Alt-Tab melewati tumpukan jendela.

<p align="center">
  <img src="docs/assets/screenshots/multi-pane.png" alt="Sebuah Tab terbagi menjadi empat panel dengan jenis koneksi berbeda" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — grid empat: PowerShell, sesi SSH, browser SFTP, dan permukaan VNC, semuanya dalam satu Tab.</em></sub></p>

### Asisten AI yang mengomandoi terminalmu untukmu

Kebanyakan demo "AI di terminalmu" berhenti di obrolan. Asisten KKTerm bekerja *di dalam* sesimu: kamu menyerahkan konteks dari apa yang sudah ada di layar, dan ia bertindak pada mesin-mesin yang sedang kamu sambungkan — dengan manusia di dalam lingkar persetujuan.

**Serahkan konteksnya, langsung.** Tanpa relai salin-tempel:

- **Tambahkan terminal buffer ke konteks** menarik scrollback sebuah sesi lokal atau remote yang sedang berjalan langsung ke percakapan, sehingga "kenapa build ini gagal?" menjadi sesuatu yang benar-benar bisa ia baca.
- **Menu tangkapan layar** menangkap sebuah area atau seluruh Pane dan menjatuhkan gambarnya ke obrolan, sehingga "kenapa dialog ini terlihat aneh?" menjadi pertanyaan yang bisa ia jawab.
- **Lampirkan berkas** dan **konteks halaman Dashboard / IT Ops** saat ini, sehingga ia menalar tentang apa yang benar-benar kamu lihat, bukan deskripsi yang samar.

**Biarkan ia bertindak — di balik persetujuan.** Asisten bisa menjalankan perintah di terminalmu, membuka Connections, dan menempatkan widget di dashboard, tapi bagian yang berisiko tetap terkunci:

- **Tentukan apa yang boleh ia sentuh** — nyalakan atau matikan seluruh keluarga alat (Dashboard / Connections / Live Sessions).
- **Tentukan bagaimana ia bertanya** — `Prompt` (default, bertanya setiap kali) atau `Allow All` (kamu sudah dewasa, kamu menandatangani pernyataannya).
- Apa pun yang terlihat seperti `rm -rf` ditandai berbahaya — dengan alasannya ditampilkan di kartu persetujuan — dan menunggu kata "ya" eksplisit dari manusia. AI tidak bisa diam-diam menjalankan perintah merusak hanya karena ada yang berbuat licik dengan prompt injection di sebuah halaman man.

**Bawa otakmu sendiri.** Ia bicara dengan OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA, atau endpoint apa pun yang kompatibel OpenAI — dan bisa berjalan di atas **Claude Code CLI** atau **Codex CLI** sebagai backend, memakai login dan langganan `claude` / `codex`-mu yang sudah ada alih-alih kunci API terpisah. Kunci API-mu masuk ke keychain OS.

<p align="center">
  <img src="docs/assets/screenshots/ai-assistant.png" alt="Panel asisten AI dengan sakelar akses alat dan mode persetujuan" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — panel asisten AI: sakelar per keluarga alat, peralih Prompt / Allow All, dan sebuah perintah berbahaya yang menunggu "ya" dari manusia.</em></sub></p>

### Dashboard yang tidak berpura-pura jadi Grafana

Dashboard adalah grid widget yang bisa kamu seret dan ubah ukurannya. Ini bukan untuk observability skala petabyte — ini untuk "aku mau satu tombol untuk meluncurkan lima aplikasi favoritku dan satu panel yang menampilkan uptime host SSH-ku, *di samping* obrolanku".

#### Widget buatan AI — jelaskan, langsung jadi

Ini bagian yang benar-benar membuat kami bersemangat. Kamu tidak memilih dari marketplace dan tidak menulis JavaScript. Kamu **memberi tahu asisten AI apa yang kamu mau**, lalu ia membangun widget-nya langsung di dashboard-mu:

> *"Tambahkan widget yang menampilkan 5 commit terakhir repo utamaku sebagai daftar."*
> *"Buatkan aku widget sticky-note untuk contekan jaga on-call-ku."*
> *"Bangun widget yang ping router rumahku tiap 30 detik dan menampilkan hijau/merah."*
> *"Aku butuh stopwatch. Kejutkan aku soal gayanya."*

Sebagian adalah panel tampilan sederhana (markdown, checklist, satu angka besar); sebagian menjalankan kode langsung di sandbox terisolasi yang kamu setujui. Setiap widget yang kamu simpan jadi milikmu — tersimpan dengan warna, ikon, dan judulnya sendiri, dan kamu bisa punya beberapa salinan dengan ukuran berbeda. Hapus satu dengan klik kanan saat keajaibannya memudar.

<p align="center">
  <img src="docs/assets/screenshots/ai-widgets.png" alt="Grid dashboard penuh widget buatan AI" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — sebuah tampilan Dashboard penuh widget buatan AI: monitor ping, sticky note, statistik langsung, dan mainan kecil yang sama sekali tak pantas jadi semenyenangkan itu.</em></sub></p>

#### Latar animasi dashboard/terminal (karena kami mau saja)

Pilih satu suasana — per tampilan dashboard, *atau di belakang terminal mana pun* — dari **dua puluh lima** latar animasi canvas:

| Suasana | Latar |
| --- | --- |
| Tenang | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Antariksa | `starfield`, `nebula` |
| Hangat | `embers`, `lava` |
| Geek | `matrix`, `topo`, `synthwave` |
| Gelisah | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

Pemilih yang sama juga menopang panel terminalmu, jadi kamu bisa menaruh `matrix` di belakang sesi SSH yang sedang berjalan. Mereka berhenti saat kamu di tempat lain, jadi nyaris tak memakan sumber daya. Padukan `matrix` dengan asisten AI-mu untuk suasana yang berkata "aku sangat produktif dan mungkin sedang berada di film Wachowski". Atau pilih `ocean` dan tampak seperti orang serius. Kami tidak menghakimi kedua pilihan itu.

<p align="center">
  <img src="docs/assets/screenshots/backgrounds.png" alt="Beberapa latar animasi berdampingan" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — lembar contoh suasana: `matrix`, `aurora`, `synthwave`, dan `taipei101`.</em></sub></p>

### Jaga agar agen AI-mu tetap hidup

Ini fitur kedua yang membuat orang jatuh cinta. Terminal SSH KKTerm bisa langsung menjatuhkanmu ke sebuah **sesi tmux bernama** di host remote yang selamat dari penyambungan ulang:

- Buka koneksi SSH dengan tmux aktif lalu jalankan `claude`, `codex`, `gemini-cli`, `cursor-agent`, atau agen jangka panjang apa pun yang kamu suka.
- Tutup laptop. Buka lagi. Panel menyambung kembali diam-diam — agennya masih berjalan, masih punya scrollback-nya, masih di tengah apa pun yang sedang dikerjakannya.
- Jaringan tersendat? KKTerm menyambung kembali diam-diam ke sesi yang sama tanpa mengganggumu.
- Mau bantuan asisten? "Tambahkan terminal buffer ke konteks" menarik seluruh sesi remote ke dalam percakapan, agar AI lokalmu bisa menalar apa yang sedang dikerjakan agen remote-mu.

Kalau kamu pernah kehilangan sesi `claude` atau `codex` enam jam gara-gara Wi-Fi hotel yang labil, fitur satu ini saja sudah menebus harga aplikasinya. (Aplikasinya gratis. Fiturnya tetap layak.)

Shell lokal mendapat trik yang sama di Windows: panel PowerShell bisa berjalan di dalam **psmux**, klon tmux native, agar proses lokal berdurasi panjang selamat dari Pane yang ditutup, persis seperti yang remote.

<p align="center">
  <img src="docs/assets/screenshots/tmux-reattach.png" alt="Sebuah panel SSH menyambung kembali ke sesi tmux bernama setelah reconnect" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — daftar sesi tmux/psmux di toolbar Pane, dengan agen `claude` remote yang masih berjalan setelah reconnect.</em></sub></p>

### Pisahkan dunia-duniamu dengan Workspaces

Homelab, pekerjaan kantor, dan server klien itu tidak pantas berada di daftar yang sama. **Workspaces** adalah wadah Connections bernama dan terisolasi yang kamu tukar dari Activity Rail. Menukar hanya menata ulang cakupan pohon koneksi — Sessions yang terbuka, Dashboard, dan Pengaturanmu tetap di tempat — jadi berganti konteks cukup satu klik, bukan restart.

<p align="center">
  <img src="docs/assets/screenshots/workspaces.png" alt="Pengalih workspace di activity rail" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — pengalih workspace di puncak Activity Rail, di tengah pergantian antara "Home Lab" dan "Day Job".</em></sub></p>

### Dandani sesukamu: tema warna

Latar adalah bagian serunya; **tema warna** adalah yang benar-benar kamu pandangi seharian. KKTerm membawa **empat belas** skema warna yang mendandani ulang seluruh chrome aplikasi — Activity Rail, pohon koneksi, tab, dialog — dengan pratinjau mini langsung untuk masing-masing di Pengaturan ▸ Tampilan:

| Suasana | Skema |
| --- | --- |
| Netral | `Default`, `Dark`, `Light`, `Match OS` (mengikuti terang/gelap sistem), `Mac` |
| Penuh warna | `Orange`, `Purple`, `Pink`, `Confetti`, `Bubble Tea` |
| Cita rasa lokal | `Green Kuai Kuai` (ya, camilan itu), `Blue See`, `Blue, Green and White`, `Semiconductor` |

Terminal mempertahankan palet gelapnya sendiri apa pun skema yang kamu pilih, agar shell-mu tetap terbaca sementara sisa aplikasi menyesuaikan suasana hatimu.

<p align="center">
  <img src="docs/assets/screenshots/color-themes.png" alt="Grid skema warna di Pengaturan dengan pratinjau langsung" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — grid skema warna Pengaturan ▸ Tampilan, tiap ubin sebuah pratinjau mini langsung dari aplikasi.</em></sub></p>

### Install Helper (khusus Windows)

Menyiapkan mesin Windows baru untuk kerja dev biasanya berarti sepuluh tab browser dan banyak "berikutnya, berikutnya, selesai". **Install Helper** adalah katalog bawaan yang menemukan, memasang, memperbarui, dan mencopot alat yang kalau tidak harus kamu kejar manual — tanpa keluar dari KKTerm:

- **Essentials** — winget, Node (via nvm-windows), Python (via uv), Git.
- **AI Agents** — Claude Code, Codex, Antigravity, OpenCode, serta CLI dan aplikasi desktop agen coding lainnya.
- **AI Platforms** — stack lokal / self-hosted seperti Ollama, n8n, Open WebUI, Flowise, dan Langflow, dijalankan dan dikelola untukmu.
- **Development** — editor, kontainer, alat API, WSL dan distribusinya, Rustup.
- **Windows Power User** — PowerToys, PowerShell 7, psmux, Sysinternals, Everything, Ditto.
- **Remote Access** — Tailscale, RustDesk.
- **Utilities** — Notepad++, ripgrep, jq, fzf, 7-Zip, Oh My Posh, FFmpeg, dan lainnya.

Ia mendeteksi apa yang sudah terpasang, menandai mana yang punya pembaruan, dan **Perbarui semua** menelusuri antrean untukmu. Prompt UAC tetap eksplisit, tak ada yang terpasang diam-diam, dan seluruh katalog ikut di dalam aplikasi — tanpa akun tambahan, tanpa telemetri latar belakang.

> macOS dan Linux sudah punya manajer paket yang kamu sukai, jadi Install Helper adalah kemudahan khusus Windows dan bukan bagian dari build-build itu.

<p align="center">
  <img src="docs/assets/screenshots/install-helper.png" alt="Katalog Install Helper dengan alat yang terpasang dan tersedia" width="720" />
</p>

<p align="center"><sub><em>📸 <strong>Placeholder tangkapan layar</strong> — modul Install Helper: ubin alat berkategori, tombol pasang/perbarui, dan aksi "Perbarui semua" di header.</em></sub></p>

---

## Apa yang bukan KKTerm

Daftar singkat, karena kejujuran menumbuhkan kepercayaan:

- **Bukan produk cloud.** Tanpa sinkronisasi, tanpa akun tim, tanpa tingkatan SaaS. Kalau suatu hari kamu melihat dialog "Masuk ke KKTerm", ada yang salah secara katastrofik.
- **Tidak berpura-pura semua OS identik.** KKTerm merilis build Windows, macOS, dan Linux, tetapi fitur khusus platform tetap diberi batas yang jujur dan jelas.
- **Bukan agen AI otonom.** Asisten mengusulkan; manusia memutuskan. `Allow All` adalah pilihan yang kamu buat, bukan default.
- **Bukan pengganti Grafana / Datadog.** Dashboard untuk permukaan kendali pribadi, bukan observability 10.000 host.
- **Bukan IDE Kubernetes.** Ini ruang kerja admin yang berpusat pada terminal. Tolong jangan minta ia me-render chart Helm.

Kalau salah satu poin itu *dulunya* jadi penentu — wajar saja, sampai jumpa di v2.

---

## Dapatkan KKTerm

**[Unduh installer Windows terbaru (.exe)](https://github.com/ryantsai/KKTerm/releases/latest)** lalu jalankan. Installer-nya saat ini **belum ditandatangani** — penandatanganan rilis ada di roadmap, jadi sampai saat itu antivirus-mu mungkin menatapmu tajam. Itu normal.

Mau build dari sumber atau berkontribusi? Semua yang kamu butuhkan ada di [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Roadmap (versi singkat)

- Build macOS + Linux
- Installer bertanda tangan + pembaruan otomatis
- Transfer berkas lebih bertenaga (lanjutkan, sinkron folder, arsip/ekstrak)
- Berbagi clipboard dan perangkat Remote Desktop yang lebih kaya
- Lebih banyak widget dashboard bawaan

Versi lengkap dan sering diperbarui: [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Berkontribusi

Kami akan senang sekali dibantu. Sungguh. Hal kecil pun penting:

- **Coba build dev** dan buka issue saat ada yang terasa janggal. "Rasanya janggal" adalah laporan bug yang sah; kami akan menggali bersamamu.
- **Terjemahkan satu bahasa.** Bahasa Inggris adalah sumber kebenaran; tiga belas bahasa lain tinggal di sebelahnya.
- **Tambahkan widget dashboard.** Ambil satu ide kecil, rilis, pelajari polanya.
- **Perbaiki manual.** Kalau kamu memakai sebuah fitur dan dokumentasinya tak membantu, PR yang memperbaikinya berharga emas.

Penyiapan lengkap, struktur proyek, dan checklist PR ada di [`CONTRIBUTING.md`](CONTRIBUTING.md). Mencari titik masuk? Saring issue terbuka dengan [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) atau [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

---

## Dokumen proyek

- [Konteks produk](CONTEXT.md) — bahasa domain yang harus kamu ikuti
- [Arsitektur](docs/ARCHITECTURE.md) — peta modul, di mana menaruh kode baru
- [Manual pengguna](docs/manual/INDEX.md) — keliling fitur demi fitur
- [Roadmap](docs/ROADMAP.md)
- [Arsitektur Dashboard](docs/DASHBOARD.md)
- [Server MCP bawaan](docs/MCP.md)
- [Panduan penyedia AI](docs/AI_PROVIDERS.md)

---

## Riwayat bintang

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

Kalau kamu sudah sampai sejauh ini dan belum memberi bintang — tunggu apa lagi, undangan pribadi? Anggap ini undangan pribadinya.

⭐ **[Beri bintang KKTerm di GitHub](https://github.com/ryantsai/KKTerm)** — cukup satu klik dan membuat sepekan penuh sang maintainer cerah. Anggap saja 乖乖 digital di rak.

---

## Lisensi

MIT. Lihat [LICENSE](LICENSE). Pakai, fork, rilis, taruh di homelab yang takkan ditemukan orang lain — itulah kesepakatannya.
