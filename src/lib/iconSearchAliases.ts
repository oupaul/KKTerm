// Localized icon-search vocabulary.
//
// The icon catalog (Reicon names, Lucide fallback names + Material icon ids/labels/tags) is searchable
// in English only. This file maps localized search words to the English
// keywords baked into that catalog, so a user can find icons by typing in their
// own UI language (e.g. "資料夾" or "carpeta" both find folder icons).
//
// This intentionally does NOT live in the i18n locale JSON: it is not
// user-facing UI copy, it is a large, slowly-changing search dictionary keyed by
// source word rather than message id. Keeping it out of `src/i18n/locales`
// avoids bloating the translation files and the localization workflow. Extend
// the CONCEPTS list below to teach the search new words.
//
// Language codes match `SUPPORTED_LANGUAGES` in `src/i18n/config.ts`. A regional
// code with no entry falls back to its base language (e.g. `es-MX` → `es`).

type LocalizedWords = Partial<Record<string, readonly string[]>>;

type IconSearchConcept = {
  // English keywords present in the catalog search text for this concept.
  en: readonly string[];
  // Words a user might type in each language, lowercased on lookup.
  localized: LocalizedWords;
};

// One entry per concept. `en` keywords must appear in some icon's search text;
// `localized` lists the words a user types in each language to mean that concept.
const CONCEPTS: readonly IconSearchConcept[] = [
  {
    en: ["folder", "directory"],
    localized: {
      "zh-TW": ["資料夾", "檔案夾", "目錄"],
      "zh-CN": ["文件夹", "目录"],
      ja: ["フォルダ", "フォルダー", "ディレクトリ"],
      ko: ["폴더", "디렉터리", "디렉토리"],
      fr: ["dossier", "répertoire", "repertoire"],
      de: ["ordner", "verzeichnis"],
      es: ["carpeta", "directorio"],
      "pt-BR": ["pasta", "diretório", "diretorio"],
      it: ["cartella", "directory"],
      id: ["folder", "map", "direktori"],
      th: ["โฟลเดอร์", "ไดเรกทอรี"],
      vi: ["thư mục", "thu muc"],
    },
  },
  {
    en: ["file", "document"],
    localized: {
      "zh-TW": ["檔案", "文件"],
      "zh-CN": ["文件", "档案"],
      ja: ["ファイル", "書類"],
      ko: ["파일", "문서"],
      fr: ["fichier", "document"],
      de: ["datei", "dokument"],
      es: ["archivo", "documento", "fichero"],
      "pt-BR": ["arquivo", "documento", "ficheiro"],
      it: ["file", "documento"],
      id: ["berkas", "dokumen", "file"],
      th: ["ไฟล์", "เอกสาร"],
      vi: ["tập tin", "tap tin", "tài liệu", "tai lieu"],
    },
  },
  {
    en: ["image", "picture", "photo"],
    localized: {
      "zh-TW": ["圖片", "圖像", "照片", "相片"],
      "zh-CN": ["图片", "图像", "照片"],
      ja: ["画像", "写真", "イメージ"],
      ko: ["이미지", "사진", "그림"],
      fr: ["image", "photo", "photographie"],
      de: ["bild", "foto", "grafik"],
      es: ["imagen", "foto", "fotografía", "fotografia"],
      "pt-BR": ["imagem", "foto", "fotografia"],
      it: ["immagine", "foto", "fotografia"],
      id: ["gambar", "foto", "citra"],
      th: ["รูปภาพ", "ภาพ", "รูป"],
      vi: ["hình ảnh", "hinh anh", "ảnh", "anh"],
    },
  },
  {
    en: ["video", "movie", "film"],
    localized: {
      "zh-TW": ["影片", "視訊", "電影"],
      "zh-CN": ["视频", "影片", "电影"],
      ja: ["ビデオ", "動画", "映像", "映画"],
      ko: ["비디오", "동영상", "영상", "영화"],
      fr: ["vidéo", "video", "film"],
      de: ["video", "film"],
      es: ["vídeo", "video", "película", "pelicula"],
      "pt-BR": ["vídeo", "video", "filme"],
      it: ["video", "filmato", "film"],
      id: ["video", "film"],
      th: ["วิดีโอ", "วีดีโอ", "หนัง"],
      vi: ["video", "phim"],
    },
  },
  {
    en: ["music", "audio", "sound"],
    localized: {
      "zh-TW": ["音樂", "音訊", "聲音"],
      "zh-CN": ["音乐", "音频", "声音"],
      ja: ["音楽", "オーディオ", "サウンド", "音声"],
      ko: ["음악", "오디오", "소리", "사운드"],
      fr: ["musique", "audio", "son"],
      de: ["musik", "audio", "ton", "klang"],
      es: ["música", "musica", "audio", "sonido"],
      "pt-BR": ["música", "musica", "áudio", "audio", "som"],
      it: ["musica", "audio", "suono"],
      id: ["musik", "audio", "suara"],
      th: ["เพลง", "เสียง", "ออดิโอ"],
      vi: ["nhạc", "nhac", "âm thanh", "am thanh"],
    },
  },
  {
    en: ["settings", "gear", "cog", "config", "preferences"],
    localized: {
      "zh-TW": ["設定", "設置", "齒輪", "偏好"],
      "zh-CN": ["设置", "配置", "齿轮", "偏好"],
      ja: ["設定", "環境設定", "歯車", "コンフィグ"],
      ko: ["설정", "환경설정", "톱니바퀴", "구성"],
      fr: ["paramètres", "parametres", "réglages", "reglages", "configuration", "engrenage"],
      de: ["einstellungen", "konfiguration", "zahnrad"],
      es: ["ajustes", "configuración", "configuracion", "preferencias", "engranaje"],
      "pt-BR": ["configurações", "configuracoes", "ajustes", "preferências", "preferencias", "engrenagem"],
      it: ["impostazioni", "configurazione", "preferenze", "ingranaggio"],
      id: ["pengaturan", "setelan", "konfigurasi", "roda gigi"],
      th: ["ตั้งค่า", "การตั้งค่า", "เฟือง"],
      vi: ["cài đặt", "cai dat", "thiết lập", "thiet lap", "bánh răng", "banh rang"],
    },
  },
  {
    en: ["user", "person", "account", "profile"],
    localized: {
      "zh-TW": ["使用者", "用戶", "用户", "帳號", "個人"],
      "zh-CN": ["用户", "账号", "账户", "个人"],
      ja: ["ユーザー", "ユーザ", "アカウント", "人", "プロフィール"],
      ko: ["사용자", "계정", "프로필", "사람"],
      fr: ["utilisateur", "compte", "personne", "profil"],
      de: ["benutzer", "konto", "person", "profil"],
      es: ["usuario", "cuenta", "persona", "perfil"],
      "pt-BR": ["usuário", "usuario", "conta", "pessoa", "perfil"],
      it: ["utente", "account", "persona", "profilo"],
      id: ["pengguna", "akun", "orang", "profil"],
      th: ["ผู้ใช้", "บัญชี", "คน", "โปรไฟล์"],
      vi: ["người dùng", "nguoi dung", "tài khoản", "tai khoan", "hồ sơ", "ho so"],
    },
  },
  {
    en: ["users", "group", "people", "team"],
    localized: {
      "zh-TW": ["群組", "團隊", "人們"],
      "zh-CN": ["群组", "团队", "群体"],
      ja: ["グループ", "チーム", "人々"],
      ko: ["그룹", "팀", "사람들"],
      fr: ["groupe", "équipe", "equipe", "personnes"],
      de: ["gruppe", "team", "leute"],
      es: ["grupo", "equipo", "personas"],
      "pt-BR": ["grupo", "equipe", "pessoas"],
      it: ["gruppo", "squadra", "persone"],
      id: ["grup", "tim", "kelompok", "orang-orang"],
      th: ["กลุ่ม", "ทีม"],
      vi: ["nhóm", "nhom", "đội", "doi"],
    },
  },
  {
    en: ["server"],
    localized: {
      "zh-TW": ["伺服器", "服務器"],
      "zh-CN": ["服务器", "伺服器"],
      ja: ["サーバー", "サーバ"],
      ko: ["서버"],
      fr: ["serveur"],
      de: ["server"],
      es: ["servidor"],
      "pt-BR": ["servidor"],
      it: ["server"],
      id: ["server", "peladen"],
      th: ["เซิร์ฟเวอร์"],
      vi: ["máy chủ", "may chu", "server"],
    },
  },
  {
    en: ["database", "storage"],
    localized: {
      "zh-TW": ["資料庫", "數據庫"],
      "zh-CN": ["数据库"],
      ja: ["データベース", "データベース"],
      ko: ["데이터베이스", "디비"],
      fr: ["base de données", "base de donnees", "données", "donnees"],
      de: ["datenbank"],
      es: ["base de datos", "datos"],
      "pt-BR": ["banco de dados", "dados"],
      it: ["database", "banca dati", "dati"],
      id: ["basis data", "database", "data"],
      th: ["ฐานข้อมูล"],
      vi: ["cơ sở dữ liệu", "co so du lieu", "dữ liệu", "du lieu"],
    },
  },
  {
    en: ["cloud"],
    localized: {
      "zh-TW": ["雲端", "雲"],
      "zh-CN": ["云", "云端"],
      ja: ["クラウド", "雲"],
      ko: ["클라우드", "구름"],
      fr: ["nuage", "cloud"],
      de: ["wolke", "cloud"],
      es: ["nube"],
      "pt-BR": ["nuvem"],
      it: ["nuvola", "cloud"],
      id: ["awan", "cloud"],
      th: ["คลาวด์", "เมฆ"],
      vi: ["đám mây", "dam may", "mây", "may"],
    },
  },
  {
    en: ["network", "lan"],
    localized: {
      "zh-TW": ["網路", "網絡", "網絡"],
      "zh-CN": ["网络", "网路"],
      ja: ["ネットワーク"],
      ko: ["네트워크", "네트웍"],
      fr: ["réseau", "reseau"],
      de: ["netzwerk"],
      es: ["red"],
      "pt-BR": ["rede"],
      it: ["rete"],
      id: ["jaringan", "jejaring"],
      th: ["เครือข่าย", "เน็ตเวิร์ก"],
      vi: ["mạng", "mang"],
    },
  },
  {
    en: ["lock", "security", "secure"],
    localized: {
      "zh-TW": ["鎖", "安全", "鎖定"],
      "zh-CN": ["锁", "安全", "锁定"],
      ja: ["ロック", "鍵", "セキュリティ", "安全"],
      ko: ["잠금", "자물쇠", "보안"],
      fr: ["verrou", "cadenas", "sécurité", "securite"],
      de: ["schloss", "sperre", "sicherheit"],
      es: ["candado", "bloqueo", "seguridad"],
      "pt-BR": ["cadeado", "bloqueio", "segurança", "seguranca"],
      it: ["lucchetto", "blocco", "sicurezza"],
      id: ["kunci", "gembok", "keamanan"],
      th: ["ล็อก", "กุญแจ", "ความปลอดภัย"],
      vi: ["khóa", "khoa", "bảo mật", "bao mat"],
    },
  },
  {
    en: ["key"],
    localized: {
      "zh-TW": ["金鑰", "鑰匙", "密鑰"],
      "zh-CN": ["密钥", "钥匙"],
      ja: ["キー", "鍵"],
      ko: ["키", "열쇠"],
      fr: ["clé", "cle", "clef"],
      de: ["schlüssel", "schluessel"],
      es: ["llave", "clave"],
      "pt-BR": ["chave"],
      it: ["chiave"],
      id: ["kunci"],
      th: ["กุญแจ", "คีย์"],
      vi: ["chìa khóa", "chia khoa", "khóa", "khoa"],
    },
  },
  {
    en: ["terminal", "console", "shell", "command"],
    localized: {
      "zh-TW": ["終端機", "終端", "主控台", "命令列"],
      "zh-CN": ["终端", "控制台", "命令行"],
      ja: ["ターミナル", "端末", "コンソール", "シェル"],
      ko: ["터미널", "콘솔", "셸", "명령줄"],
      fr: ["terminal", "console", "invite de commande"],
      de: ["terminal", "konsole", "eingabeaufforderung"],
      es: ["terminal", "consola", "línea de comandos", "linea de comandos"],
      "pt-BR": ["terminal", "console", "linha de comando"],
      it: ["terminale", "console", "riga di comando"],
      id: ["terminal", "konsol", "baris perintah"],
      th: ["เทอร์มินัล", "คอนโซล", "บรรทัดคำสั่ง"],
      vi: ["dòng lệnh", "dong lenh", "thiết bị đầu cuối", "terminal"],
    },
  },
  {
    en: ["code", "developer"],
    localized: {
      "zh-TW": ["程式碼", "代碼", "程式", "開發"],
      "zh-CN": ["代码", "程序", "开发"],
      ja: ["コード", "プログラム", "開発"],
      ko: ["코드", "프로그램", "개발"],
      fr: ["code", "développeur", "developpeur"],
      de: ["code", "quellcode", "entwickler"],
      es: ["código", "codigo", "desarrollador"],
      "pt-BR": ["código", "codigo", "desenvolvedor"],
      it: ["codice", "sviluppatore"],
      id: ["kode", "pengembang"],
      th: ["โค้ด", "รหัส", "นักพัฒนา"],
      vi: ["mã", "ma", "lập trình", "lap trinh"],
    },
  },
  {
    en: ["home", "house"],
    localized: {
      "zh-TW": ["首頁", "主頁", "家", "房屋"],
      "zh-CN": ["首页", "主页", "家", "房屋"],
      ja: ["ホーム", "家", "自宅"],
      ko: ["홈", "집"],
      fr: ["accueil", "maison"],
      de: ["startseite", "haus", "zuhause"],
      es: ["inicio", "casa"],
      "pt-BR": ["início", "inicio", "casa"],
      it: ["home", "casa"],
      id: ["beranda", "rumah"],
      th: ["หน้าแรก", "บ้าน"],
      vi: ["trang chủ", "trang chu", "nhà", "nha"],
    },
  },
  {
    en: ["star", "favorite", "favourite"],
    localized: {
      "zh-TW": ["星星", "收藏", "最愛", "我的最愛"],
      "zh-CN": ["星星", "收藏", "最爱"],
      ja: ["スター", "星", "お気に入り"],
      ko: ["별", "즐겨찾기"],
      fr: ["étoile", "etoile", "favori"],
      de: ["stern", "favorit"],
      es: ["estrella", "favorito"],
      "pt-BR": ["estrela", "favorito"],
      it: ["stella", "preferito"],
      id: ["bintang", "favorit"],
      th: ["ดาว", "รายการโปรด"],
      vi: ["sao", "yêu thích", "yeu thich"],
    },
  },
  {
    en: ["heart", "like", "love"],
    localized: {
      "zh-TW": ["愛心", "心", "喜歡"],
      "zh-CN": ["爱心", "心", "喜欢"],
      ja: ["ハート", "心", "いいね"],
      ko: ["하트", "좋아요", "마음"],
      fr: ["coeur", "cœur", "aimer"],
      de: ["herz", "gefällt mir", "gefaellt mir"],
      es: ["corazón", "corazon", "me gusta"],
      "pt-BR": ["coração", "coracao", "curtir"],
      it: ["cuore", "mi piace"],
      id: ["hati", "suka"],
      th: ["หัวใจ", "ถูกใจ"],
      vi: ["trái tim", "trai tim", "tim", "thích", "thich"],
    },
  },
  {
    en: ["search", "find"],
    localized: {
      "zh-TW": ["搜尋", "搜索", "尋找"],
      "zh-CN": ["搜索", "查找"],
      ja: ["検索", "サーチ"],
      ko: ["검색", "찾기"],
      fr: ["rechercher", "recherche", "chercher"],
      de: ["suche", "suchen"],
      es: ["buscar", "búsqueda", "busqueda"],
      "pt-BR": ["buscar", "pesquisar", "busca"],
      it: ["cerca", "ricerca"],
      id: ["cari", "pencarian"],
      th: ["ค้นหา"],
      vi: ["tìm kiếm", "tim kiem", "tìm", "tim"],
    },
  },
  {
    en: ["mail", "email", "envelope", "message"],
    localized: {
      "zh-TW": ["郵件", "電子郵件", "信封", "訊息"],
      "zh-CN": ["邮件", "电子邮件", "信封", "消息"],
      ja: ["メール", "電子メール", "封筒", "メッセージ"],
      ko: ["메일", "이메일", "편지", "메시지"],
      fr: ["courrier", "email", "e-mail", "enveloppe", "message"],
      de: ["mail", "e-mail", "umschlag", "nachricht"],
      es: ["correo", "email", "sobre", "mensaje"],
      "pt-BR": ["correio", "email", "envelope", "mensagem"],
      it: ["posta", "email", "busta", "messaggio"],
      id: ["surel", "email", "amplop", "pesan"],
      th: ["อีเมล", "จดหมาย", "ข้อความ"],
      vi: ["thư", "thu", "email", "phong bì", "phong bi", "tin nhắn", "tin nhan"],
    },
  },
  {
    en: ["calendar", "date", "schedule"],
    localized: {
      "zh-TW": ["行事曆", "日曆", "日期", "排程"],
      "zh-CN": ["日历", "日程", "日期"],
      ja: ["カレンダー", "日付", "予定"],
      ko: ["캘린더", "달력", "날짜", "일정"],
      fr: ["calendrier", "date", "agenda"],
      de: ["kalender", "datum", "termin"],
      es: ["calendario", "fecha", "agenda"],
      "pt-BR": ["calendário", "calendario", "data", "agenda"],
      it: ["calendario", "data", "agenda"],
      id: ["kalender", "tanggal", "jadwal"],
      th: ["ปฏิทิน", "วันที่", "กำหนดการ"],
      vi: ["lịch", "lich", "ngày", "ngay"],
    },
  },
  {
    en: ["clock", "time", "timer"],
    localized: {
      "zh-TW": ["時鐘", "時間", "計時器"],
      "zh-CN": ["时钟", "时间", "计时器"],
      ja: ["時計", "時間", "タイマー"],
      ko: ["시계", "시간", "타이머"],
      fr: ["horloge", "heure", "temps", "minuteur"],
      de: ["uhr", "zeit", "timer"],
      es: ["reloj", "hora", "tiempo", "temporizador"],
      "pt-BR": ["relógio", "relogio", "hora", "tempo", "temporizador"],
      it: ["orologio", "ora", "tempo", "timer"],
      id: ["jam", "waktu", "pengatur waktu"],
      th: ["นาฬิกา", "เวลา"],
      vi: ["đồng hồ", "dong ho", "thời gian", "thoi gian"],
    },
  },
  {
    en: ["download"],
    localized: {
      "zh-TW": ["下載"],
      "zh-CN": ["下载"],
      ja: ["ダウンロード"],
      ko: ["다운로드", "내려받기"],
      fr: ["télécharger", "telecharger", "téléchargement", "telechargement"],
      de: ["herunterladen", "download"],
      es: ["descargar", "descarga"],
      "pt-BR": ["baixar", "download"],
      it: ["scaricare", "download"],
      id: ["unduh", "download"],
      th: ["ดาวน์โหลด"],
      vi: ["tải xuống", "tai xuong", "tải về", "tai ve"],
    },
  },
  {
    en: ["upload"],
    localized: {
      "zh-TW": ["上傳"],
      "zh-CN": ["上传"],
      ja: ["アップロード"],
      ko: ["업로드", "올리기"],
      fr: ["téléverser", "televerser", "envoyer"],
      de: ["hochladen", "upload"],
      es: ["subir", "cargar"],
      "pt-BR": ["enviar", "upload", "carregar"],
      it: ["caricare", "upload"],
      id: ["unggah", "upload"],
      th: ["อัปโหลด"],
      vi: ["tải lên", "tai len"],
    },
  },
  {
    en: ["trash", "delete", "remove", "bin"],
    localized: {
      "zh-TW": ["垃圾桶", "刪除", "移除"],
      "zh-CN": ["垃圾桶", "删除", "移除", "回收站"],
      ja: ["ゴミ箱", "削除", "ごみ箱"],
      ko: ["휴지통", "삭제", "제거"],
      fr: ["corbeille", "supprimer", "poubelle"],
      de: ["papierkorb", "löschen", "loeschen", "entfernen"],
      es: ["papelera", "eliminar", "borrar"],
      "pt-BR": ["lixeira", "excluir", "apagar", "remover"],
      it: ["cestino", "elimina", "rimuovi"],
      id: ["sampah", "hapus", "buang"],
      th: ["ถังขยะ", "ลบ", "นำออก"],
      vi: ["thùng rác", "thung rac", "xóa", "xoa", "xóa bỏ", "xoa bo"],
    },
  },
  {
    en: ["edit", "pencil", "pen", "write"],
    localized: {
      "zh-TW": ["編輯", "鉛筆", "筆", "撰寫"],
      "zh-CN": ["编辑", "铅笔", "笔", "撰写"],
      ja: ["編集", "鉛筆", "ペン"],
      ko: ["편집", "연필", "펜", "수정"],
      fr: ["modifier", "éditer", "editer", "crayon", "stylo"],
      de: ["bearbeiten", "stift", "bleistift"],
      es: ["editar", "lápiz", "lapiz", "bolígrafo", "boligrafo"],
      "pt-BR": ["editar", "lápis", "lapis", "caneta"],
      it: ["modifica", "matita", "penna"],
      id: ["edit", "sunting", "pensil", "pena"],
      th: ["แก้ไข", "ดินสอ", "ปากกา"],
      vi: ["chỉnh sửa", "chinh sua", "bút chì", "but chi", "bút", "but"],
    },
  },
  {
    en: ["link", "chain", "url"],
    localized: {
      "zh-TW": ["連結", "鏈接", "鏈結"],
      "zh-CN": ["链接", "链结"],
      ja: ["リンク", "鎖"],
      ko: ["링크", "연결"],
      fr: ["lien", "chaîne", "chaine"],
      de: ["link", "verknüpfung", "verknuepfung", "kette"],
      es: ["enlace", "vínculo", "vinculo", "cadena"],
      "pt-BR": ["link", "ligação", "ligacao", "corrente"],
      it: ["collegamento", "link", "catena"],
      id: ["tautan", "link", "rantai"],
      th: ["ลิงก์", "ลิงค์", "โซ่"],
      vi: ["liên kết", "lien ket", "đường dẫn", "duong dan"],
    },
  },
  {
    en: ["globe", "world", "web", "internet"],
    localized: {
      "zh-TW": ["地球", "世界", "網路", "全球"],
      "zh-CN": ["地球", "世界", "网络", "全球"],
      ja: ["地球", "世界", "ウェブ", "グローブ"],
      ko: ["지구", "세계", "웹", "글로브"],
      fr: ["globe", "monde", "web", "internet"],
      de: ["globus", "welt", "web", "internet"],
      es: ["globo", "mundo", "web", "internet"],
      "pt-BR": ["globo", "mundo", "web", "internet"],
      it: ["globo", "mondo", "web", "internet"],
      id: ["globe", "dunia", "web", "internet", "bola dunia"],
      th: ["โลก", "เว็บ", "อินเทอร์เน็ต"],
      vi: ["địa cầu", "dia cau", "thế giới", "the gioi", "web"],
    },
  },
  {
    en: ["phone", "call", "telephone"],
    localized: {
      "zh-TW": ["電話", "通話"],
      "zh-CN": ["电话", "通话"],
      ja: ["電話", "通話"],
      ko: ["전화", "통화"],
      fr: ["téléphone", "telephone", "appel"],
      de: ["telefon", "anruf"],
      es: ["teléfono", "telefono", "llamada"],
      "pt-BR": ["telefone", "chamada", "ligação", "ligacao"],
      it: ["telefono", "chiamata"],
      id: ["telepon", "panggilan"],
      th: ["โทรศัพท์", "โทร"],
      vi: ["điện thoại", "dien thoai", "cuộc gọi", "cuoc goi"],
    },
  },
  {
    en: ["computer", "desktop", "monitor", "pc"],
    localized: {
      "zh-TW": ["電腦", "桌機", "螢幕"],
      "zh-CN": ["电脑", "台式机", "显示器"],
      ja: ["コンピューター", "パソコン", "デスクトップ", "モニター"],
      ko: ["컴퓨터", "데스크톱", "모니터", "피시"],
      fr: ["ordinateur", "bureau", "écran", "ecran"],
      de: ["computer", "rechner", "bildschirm", "monitor"],
      es: ["ordenador", "computadora", "escritorio", "monitor"],
      "pt-BR": ["computador", "desktop", "monitor"],
      it: ["computer", "desktop", "monitor", "schermo"],
      id: ["komputer", "desktop", "monitor"],
      th: ["คอมพิวเตอร์", "เดสก์ท็อป", "จอภาพ"],
      vi: ["máy tính", "may tinh", "màn hình", "man hinh"],
    },
  },
  {
    en: ["macos", "mac", "apple", "osx", "darwin"],
    localized: {
      "zh-TW": ["蘋果", "麥金塔"],
      "zh-CN": ["苹果", "麦金塔"],
      ja: ["アップル", "マック"],
      ko: ["애플", "맥"],
      th: ["แอปเปิล", "แมค"],
      vi: ["táo", "tao"],
    },
  },
  {
    en: ["windows", "microsoft", "win"],
    localized: {
      "zh-TW": ["微軟", "視窗"],
      "zh-CN": ["微软", "视窗"],
      ja: ["マイクロソフト"],
      ko: ["마이크로소프트", "윈도우"],
      th: ["ไมโครซอฟท์"],
      vi: ["cửa sổ", "cua so"],
    },
  },
  {
    en: ["raspberry", "raspberrypi", "pi", "raspbian"],
    localized: {
      "zh-TW": ["樹莓派", "樹莓"],
      "zh-CN": ["树莓派", "树莓"],
      ja: ["ラズパイ", "ラズベリーパイ"],
      ko: ["라즈베리파이", "라즈베리 파이"],
      th: ["ราสป์เบอร์รีพาย"],
      vi: ["mâm xôi", "mam xoi"],
    },
  },
  {
    en: ["redhat", "red hat", "rhel"],
    localized: {
      "zh-TW": ["紅帽"],
      "zh-CN": ["红帽"],
      ja: ["レッドハット"],
      ko: ["레드햇"],
      th: ["เรดแฮท"],
    },
  },
  {
    en: ["laptop", "notebook"],
    localized: {
      "zh-TW": ["筆電", "筆記型電腦"],
      "zh-CN": ["笔记本", "笔记本电脑"],
      ja: ["ノートパソコン", "ラップトップ"],
      ko: ["노트북", "랩톱"],
      fr: ["ordinateur portable", "portable"],
      de: ["laptop", "notebook"],
      es: ["portátil", "portatil", "laptop"],
      "pt-BR": ["notebook", "laptop", "portátil", "portatil"],
      it: ["portatile", "laptop"],
      id: ["laptop"],
      th: ["แล็ปท็อป", "โน้ตบุ๊ก"],
      vi: ["máy tính xách tay", "may tinh xach tay", "laptop"],
    },
  },
  {
    en: ["mobile", "smartphone", "cellphone"],
    localized: {
      "zh-TW": ["手機", "智慧型手機"],
      "zh-CN": ["手机", "智能手机"],
      ja: ["スマホ", "スマートフォン", "携帯"],
      ko: ["휴대폰", "스마트폰", "핸드폰"],
      fr: ["mobile", "smartphone", "portable"],
      de: ["handy", "smartphone", "mobiltelefon"],
      es: ["móvil", "movil", "celular", "teléfono móvil"],
      "pt-BR": ["celular", "smartphone", "móvel", "movel"],
      it: ["cellulare", "smartphone"],
      id: ["ponsel", "hp", "smartphone"],
      th: ["มือถือ", "สมาร์ทโฟน"],
      vi: ["di động", "di dong", "điện thoại", "dien thoai"],
    },
  },
  {
    en: ["wifi", "wireless"],
    localized: {
      "zh-TW": ["無線", "無線網路"],
      "zh-CN": ["无线", "无线网络"],
      ja: ["ワイファイ", "無線", "ワイヤレス"],
      ko: ["와이파이", "무선"],
      fr: ["wifi", "sans fil"],
      de: ["wlan", "wifi", "drahtlos"],
      es: ["wifi", "inalámbrico", "inalambrico"],
      "pt-BR": ["wifi", "sem fio"],
      it: ["wifi", "senza fili", "wireless"],
      id: ["wifi", "nirkabel"],
      th: ["ไวไฟ", "ไร้สาย"],
      vi: ["wifi", "không dây", "khong day"],
    },
  },
  {
    en: ["bug", "issue", "error"],
    localized: {
      "zh-TW": ["錯誤", "蟲", "臭蟲", "問題"],
      "zh-CN": ["错误", "缺陷", "问题", "虫子"],
      ja: ["バグ", "不具合", "エラー", "虫"],
      ko: ["버그", "오류", "문제", "벌레"],
      fr: ["bogue", "bug", "erreur", "problème", "probleme"],
      de: ["fehler", "bug", "käfer", "kaefer"],
      es: ["error", "bug", "fallo", "insecto"],
      "pt-BR": ["erro", "bug", "falha", "inseto"],
      it: ["bug", "errore", "problema", "insetto"],
      id: ["bug", "kesalahan", "masalah", "serangga"],
      th: ["บัก", "ข้อผิดพลาด", "ปัญหา"],
      vi: ["lỗi", "loi", "con bọ", "con bo"],
    },
  },
  {
    en: ["package", "box", "module"],
    localized: {
      "zh-TW": ["套件", "封包", "箱子", "模組"],
      "zh-CN": ["包", "封包", "盒子", "模块"],
      ja: ["パッケージ", "箱", "モジュール"],
      ko: ["패키지", "상자", "모듈"],
      fr: ["paquet", "boîte", "boite", "module"],
      de: ["paket", "kiste", "box", "modul"],
      es: ["paquete", "caja", "módulo", "modulo"],
      "pt-BR": ["pacote", "caixa", "módulo", "modulo"],
      it: ["pacchetto", "scatola", "modulo"],
      id: ["paket", "kotak", "modul"],
      th: ["แพ็กเกจ", "กล่อง", "โมดูล"],
      vi: ["gói", "goi", "hộp", "hop", "mô đun", "mo dun"],
    },
  },
  {
    en: ["shield", "protect", "antivirus"],
    localized: {
      "zh-TW": ["盾牌", "防護", "保護"],
      "zh-CN": ["盾牌", "防护", "保护"],
      ja: ["盾", "シールド", "保護"],
      ko: ["방패", "보호", "실드"],
      fr: ["bouclier", "protection"],
      de: ["schild", "schutz"],
      es: ["escudo", "protección", "proteccion"],
      "pt-BR": ["escudo", "proteção", "protecao"],
      it: ["scudo", "protezione"],
      id: ["perisai", "pelindung", "proteksi"],
      th: ["โล่", "ป้องกัน"],
      vi: ["khiên", "khien", "bảo vệ", "bao ve"],
    },
  },
  {
    en: ["bell", "notification", "alert"],
    localized: {
      "zh-TW": ["鈴鐺", "通知", "提醒"],
      "zh-CN": ["铃铛", "通知", "提醒"],
      ja: ["ベル", "通知", "アラート"],
      ko: ["종", "알림", "벨"],
      fr: ["cloche", "notification", "alerte"],
      de: ["glocke", "benachrichtigung", "warnung"],
      es: ["campana", "notificación", "notificacion", "alerta"],
      "pt-BR": ["sino", "notificação", "notificacao", "alerta"],
      it: ["campana", "notifica", "avviso"],
      id: ["lonceng", "notifikasi", "peringatan"],
      th: ["กระดิ่ง", "การแจ้งเตือน", "แจ้งเตือน"],
      vi: ["chuông", "chuong", "thông báo", "thong bao"],
    },
  },
  {
    en: ["tag", "label"],
    localized: {
      "zh-TW": ["標籤", "標記"],
      "zh-CN": ["标签", "标记"],
      ja: ["タグ", "ラベル"],
      ko: ["태그", "라벨"],
      fr: ["étiquette", "etiquette", "tag"],
      de: ["etikett", "tag", "kennzeichnung"],
      es: ["etiqueta"],
      "pt-BR": ["etiqueta", "rótulo", "rotulo", "marcador"],
      it: ["etichetta", "tag"],
      id: ["tag", "label"],
      th: ["แท็ก", "ป้ายกำกับ"],
      vi: ["thẻ", "the", "nhãn", "nhan"],
    },
  },
  {
    en: ["bookmark"],
    localized: {
      "zh-TW": ["書籤"],
      "zh-CN": ["书签"],
      ja: ["ブックマーク", "しおり"],
      ko: ["북마크", "책갈피"],
      fr: ["signet", "marque-page"],
      de: ["lesezeichen"],
      es: ["marcador"],
      "pt-BR": ["favorito", "marcador"],
      it: ["segnalibro"],
      id: ["penanda", "markah"],
      th: ["บุ๊กมาร์ก", "ที่คั่นหนังสือ"],
      vi: ["dấu trang", "dau trang"],
    },
  },
  {
    en: ["camera"],
    localized: {
      "zh-TW": ["相機", "攝影機"],
      "zh-CN": ["相机", "摄像头"],
      ja: ["カメラ"],
      ko: ["카메라"],
      fr: ["appareil photo", "caméra", "camera"],
      de: ["kamera"],
      es: ["cámara", "camara"],
      "pt-BR": ["câmera", "camera"],
      it: ["fotocamera", "telecamera"],
      id: ["kamera"],
      th: ["กล้อง"],
      vi: ["máy ảnh", "may anh", "camera"],
    },
  },
  {
    en: ["map", "location", "pin", "place"],
    localized: {
      "zh-TW": ["地圖", "位置", "地點"],
      "zh-CN": ["地图", "位置", "地点"],
      ja: ["地図", "位置", "場所", "ピン"],
      ko: ["지도", "위치", "장소", "핀"],
      fr: ["carte", "emplacement", "lieu", "épingle", "epingle"],
      de: ["karte", "standort", "ort", "stecknadel"],
      es: ["mapa", "ubicación", "ubicacion", "lugar"],
      "pt-BR": ["mapa", "localização", "localizacao", "lugar"],
      it: ["mappa", "posizione", "luogo"],
      id: ["peta", "lokasi", "tempat", "pin"],
      th: ["แผนที่", "ตำแหน่ง", "สถานที่"],
      vi: ["bản đồ", "ban do", "vị trí", "vi tri"],
    },
  },
  {
    en: ["flag"],
    localized: {
      "zh-TW": ["旗幟", "標旗"],
      "zh-CN": ["旗帜", "标记旗"],
      ja: ["フラグ", "旗"],
      ko: ["깃발", "플래그"],
      fr: ["drapeau"],
      de: ["flagge", "fahne"],
      es: ["bandera"],
      "pt-BR": ["bandeira"],
      it: ["bandiera"],
      id: ["bendera"],
      th: ["ธง"],
      vi: ["cờ", "co"],
    },
  },
  {
    en: ["chart", "graph", "statistics", "analytics"],
    localized: {
      "zh-TW": ["圖表", "統計", "分析"],
      "zh-CN": ["图表", "统计", "分析"],
      ja: ["グラフ", "チャート", "統計", "分析"],
      ko: ["차트", "그래프", "통계", "분석"],
      fr: ["graphique", "statistiques", "analyse"],
      de: ["diagramm", "grafik", "statistik", "analyse"],
      es: ["gráfico", "grafico", "estadísticas", "estadisticas", "análisis", "analisis"],
      "pt-BR": ["gráfico", "grafico", "estatísticas", "estatisticas", "análise", "analise"],
      it: ["grafico", "statistiche", "analisi"],
      id: ["grafik", "bagan", "statistik", "analitik"],
      th: ["แผนภูมิ", "กราฟ", "สถิติ"],
      vi: ["biểu đồ", "bieu do", "đồ thị", "do thi", "thống kê", "thong ke"],
    },
  },
  {
    en: ["cpu", "processor", "chip"],
    localized: {
      "zh-TW": ["處理器", "晶片", "中央處理器"],
      "zh-CN": ["处理器", "芯片", "中央处理器"],
      ja: ["プロセッサー", "チップ", "シーピーユー"],
      ko: ["프로세서", "칩", "씨피유"],
      fr: ["processeur", "puce"],
      de: ["prozessor", "chip"],
      es: ["procesador", "chip"],
      "pt-BR": ["processador", "chip"],
      it: ["processore", "chip"],
      id: ["prosesor", "cip", "chip"],
      th: ["โปรเซสเซอร์", "ชิป"],
      vi: ["bộ xử lý", "bo xu ly", "chip", "vi xử lý", "vi xu ly"],
    },
  },
  {
    en: ["robot", "bot", "ai", "assistant"],
    localized: {
      "zh-TW": ["機器人", "助理", "人工智慧"],
      "zh-CN": ["机器人", "助手", "人工智能"],
      ja: ["ロボット", "ボット", "アシスタント"],
      ko: ["로봇", "봇", "비서", "에이아이"],
      fr: ["robot", "assistant", "ia"],
      de: ["roboter", "bot", "assistent", "ki"],
      es: ["robot", "asistente", "ia"],
      "pt-BR": ["robô", "robo", "assistente", "ia"],
      it: ["robot", "assistente", "ia"],
      id: ["robot", "bot", "asisten", "kecerdasan buatan"],
      th: ["หุ่นยนต์", "บอท", "ผู้ช่วย"],
      vi: ["rô bốt", "ro bot", "trợ lý", "tro ly"],
    },
  },
  {
    en: ["warning", "caution", "alert"],
    localized: {
      "zh-TW": ["警告", "注意", "警示"],
      "zh-CN": ["警告", "注意", "警示"],
      ja: ["警告", "注意"],
      ko: ["경고", "주의"],
      fr: ["avertissement", "attention", "alerte"],
      de: ["warnung", "achtung", "vorsicht"],
      es: ["advertencia", "precaución", "precaucion", "alerta"],
      "pt-BR": ["aviso", "atenção", "atencao", "alerta", "cuidado"],
      it: ["avvertimento", "attenzione", "avviso"],
      id: ["peringatan", "perhatian", "awas"],
      th: ["คำเตือน", "ระวัง"],
      vi: ["cảnh báo", "canh bao", "chú ý", "chu y"],
    },
  },
  {
    en: ["rocket", "launch"],
    localized: {
      "zh-TW": ["火箭", "啟動", "發射"],
      "zh-CN": ["火箭", "启动", "发射"],
      ja: ["ロケット", "起動", "発射"],
      ko: ["로켓", "발사", "실행"],
      fr: ["fusée", "fusee", "lancement"],
      de: ["rakete", "start"],
      es: ["cohete", "lanzamiento"],
      "pt-BR": ["foguete", "lançamento", "lancamento"],
      it: ["razzo", "lancio"],
      id: ["roket", "peluncuran"],
      th: ["จรวด", "เปิดตัว"],
      vi: ["tên lửa", "ten lua", "phóng", "phong"],
    },
  },
];

// A built dictionary: localized phrase -> English keywords, plus the longest
// phrase length (in words) so the tokenizer knows how far to look ahead.
type AliasDictionary = {
  map: Map<string, readonly string[]>;
  maxWords: number;
};

// language -> dictionary (or null when there are no aliases). Built once and cached.
const dictionaryCache = new Map<string, AliasDictionary | null>();

function buildDictionary(language: string): AliasDictionary {
  const map = new Map<string, string[]>();
  let maxWords = 1;
  for (const concept of CONCEPTS) {
    const words = concept.localized[language];
    if (!words) {
      continue;
    }
    for (const word of words) {
      const key = word.trim().toLowerCase().replace(/\s+/g, " ");
      if (!key) {
        continue;
      }
      maxWords = Math.max(maxWords, key.split(" ").length);
      const existing = map.get(key);
      if (existing) {
        for (const keyword of concept.en) {
          if (!existing.includes(keyword)) {
            existing.push(keyword);
          }
        }
      } else {
        map.set(key, [...concept.en]);
      }
    }
  }
  return { map, maxWords };
}

function dictionaryFor(language: string | undefined): AliasDictionary | null {
  if (!language || language === "en") {
    return null;
  }
  if (dictionaryCache.has(language)) {
    return dictionaryCache.get(language) ?? null;
  }
  // Exact match first, then fall back to the base language (e.g. es-MX -> es).
  let dictionary = buildDictionary(language);
  if (dictionary.map.size === 0) {
    const base = language.split("-")[0];
    dictionary = base !== language
      ? dictionaryFor(base) ?? { map: new Map(), maxWords: 1 }
      : dictionary;
  }
  const result = dictionary.map.size === 0 ? null : dictionary;
  dictionaryCache.set(language, result);
  return result;
}

/**
 * Tokenize a search query into AND-ed groups of OR-ed alternatives, making the
 * search bilingual: the active UI language *and* English both work.
 *
 * Each group keeps the raw token, so an English term always matches the
 * (English) icon catalog directly — users who prefer to search in English can,
 * regardless of UI language. In addition, localized terms are expanded to the
 * English catalog keywords they map to, so the same query also works in the UI
 * language. Lookup is greedy and phrase-aware (longest match first), so
 * multi-word localized names like "base de datos" or "thư mục" resolve as a unit
 * instead of being split into unrelated tokens. English (or unmapped languages)
 * yield one raw token per group, preserving the English-only behavior.
 */
export function buildIconSearchGroups(query: string, language?: string): string[][] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }
  const dictionary = dictionaryFor(language);
  if (!dictionary) {
    return tokens.map((token) => [token]);
  }

  const groups: string[][] = [];
  let index = 0;
  while (index < tokens.length) {
    const maxLength = Math.min(dictionary.maxWords, tokens.length - index);
    let matched: { length: number; phrase: string; english: readonly string[] } | null = null;
    for (let length = maxLength; length >= 1; length -= 1) {
      const phrase = tokens.slice(index, index + length).join(" ");
      const english = dictionary.map.get(phrase);
      if (english) {
        matched = { length, phrase, english };
        break;
      }
    }
    if (matched) {
      // Bilingual group: the localized phrase OR its English catalog keywords.
      groups.push([matched.phrase, ...matched.english]);
      index += matched.length;
    } else {
      groups.push([tokens[index]]);
      index += 1;
    }
  }
  return groups;
}

/** A search text matches when every group has at least one alternative present. */
export function iconSearchGroupsMatch(searchText: string, groups: readonly string[][]): boolean {
  return groups.every((alternatives) => alternatives.some((term) => searchText.includes(term)));
}
