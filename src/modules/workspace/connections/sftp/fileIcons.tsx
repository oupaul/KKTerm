import i18next from "../../../../i18n/config";
import audioIcon from "../../../../assets/file-icons/audio.svg";
import cIcon from "../../../../assets/file-icons/c.svg";
import certificateIcon from "../../../../assets/file-icons/certificate.svg";
import consoleIcon from "../../../../assets/file-icons/console.svg";
import cppIcon from "../../../../assets/file-icons/cpp.svg";
import csharpIcon from "../../../../assets/file-icons/csharp.svg";
import cssIcon from "../../../../assets/file-icons/css.svg";
import databaseIcon from "../../../../assets/file-icons/database.svg";
import dockerIcon from "../../../../assets/file-icons/docker.svg";
import documentIcon from "../../../../assets/file-icons/document.svg";
import exeIcon from "../../../../assets/file-icons/exe.svg";
import fileIcon from "../../../../assets/file-icons/file.svg";
import folderIcon from "../../../../assets/file-icons/folder.svg";
import fontIcon from "../../../../assets/file-icons/font.svg";
import gitIcon from "../../../../assets/file-icons/git.svg";
import goIcon from "../../../../assets/file-icons/go.svg";
import htmlIcon from "../../../../assets/file-icons/html.svg";
import imageIcon from "../../../../assets/file-icons/image.svg";
import javaIcon from "../../../../assets/file-icons/java.svg";
import javascriptIcon from "../../../../assets/file-icons/javascript.svg";
import jsonIcon from "../../../../assets/file-icons/json.svg";
import keyIcon from "../../../../assets/file-icons/key.svg";
import lockIcon from "../../../../assets/file-icons/lock.svg";
import logIcon from "../../../../assets/file-icons/log.svg";
import markdownIcon from "../../../../assets/file-icons/markdown.svg";
import pdfIcon from "../../../../assets/file-icons/pdf.svg";
import phpIcon from "../../../../assets/file-icons/php.svg";
import powerpointIcon from "../../../../assets/file-icons/powerpoint.svg";
import powershellIcon from "../../../../assets/file-icons/powershell.svg";
import pythonIcon from "../../../../assets/file-icons/python.svg";
import reactIcon from "../../../../assets/file-icons/react.svg";
import rubyIcon from "../../../../assets/file-icons/ruby.svg";
import rustIcon from "../../../../assets/file-icons/rust.svg";
import settingsIcon from "../../../../assets/file-icons/settings.svg";
import svgIcon from "../../../../assets/file-icons/svg.svg";
import tableIcon from "../../../../assets/file-icons/table.svg";
import tomlIcon from "../../../../assets/file-icons/toml.svg";
import typescriptIcon from "../../../../assets/file-icons/typescript.svg";
import videoIcon from "../../../../assets/file-icons/video.svg";
import wordIcon from "../../../../assets/file-icons/word.svg";
import xmlIcon from "../../../../assets/file-icons/xml.svg";
import yamlIcon from "../../../../assets/file-icons/yaml.svg";
import zipIcon from "../../../../assets/file-icons/zip.svg";
import type { FileEntry } from "../../../../types";

const FILE_ICON_BY_NAME: Record<string, string> = {
  ".dockerignore": dockerIcon,
  ".env": settingsIcon,
  ".gitattributes": gitIcon,
  ".gitignore": gitIcon,
  ".npmrc": settingsIcon,
  ".prettierrc": settingsIcon,
  ".yarnrc": settingsIcon,
  "cargo.lock": lockIcon,
  "docker-compose.yml": dockerIcon,
  "docker-compose.yaml": dockerIcon,
  dockerfile: dockerIcon,
  "go.mod": goIcon,
  "go.sum": goIcon,
  makefile: consoleIcon,
  "package-lock.json": lockIcon,
  "package.json": jsonIcon,
  "pnpm-lock.yaml": lockIcon,
  readme: markdownIcon,
  "tsconfig.json": typescriptIcon,
  "vite.config.js": javascriptIcon,
  "vite.config.mjs": javascriptIcon,
  "vite.config.ts": typescriptIcon,
  "yarn.lock": lockIcon,
};

const FILE_ICON_BY_EXTENSION: Record<string, string> = {
  "7z": zipIcon,
  aac: audioIcon,
  avi: videoIcon,
  bmp: imageIcon,
  c: cIcon,
  cer: certificateIcon,
  cert: certificateIcon,
  conf: settingsIcon,
  cpp: cppIcon,
  crt: certificateIcon,
  cs: csharpIcon,
  css: cssIcon,
  csv: tableIcon,
  db: databaseIcon,
  doc: wordIcon,
  docx: wordIcon,
  env: settingsIcon,
  exe: exeIcon,
  gif: imageIcon,
  go: goIcon,
  gz: zipIcon,
  h: cIcon,
  hpp: cppIcon,
  htm: htmlIcon,
  html: htmlIcon,
  ico: imageIcon,
  jar: javaIcon,
  java: javaIcon,
  jpeg: imageIcon,
  jpg: imageIcon,
  js: javascriptIcon,
  json: jsonIcon,
  jsx: reactIcon,
  key: keyIcon,
  lock: lockIcon,
  log: logIcon,
  m4a: audioIcon,
  md: markdownIcon,
  mkv: videoIcon,
  mov: videoIcon,
  mp3: audioIcon,
  mp4: videoIcon,
  mpeg: videoIcon,
  mpg: videoIcon,
  pem: keyIcon,
  pdf: pdfIcon,
  php: phpIcon,
  png: imageIcon,
  potx: powerpointIcon,
  ppsx: powerpointIcon,
  ppt: powerpointIcon,
  pptx: powerpointIcon,
  ps1: powershellIcon,
  py: pythonIcon,
  rar: zipIcon,
  rb: rubyIcon,
  rs: rustIcon,
  scss: cssIcon,
  sh: consoleIcon,
  sqlite: databaseIcon,
  sqlite3: databaseIcon,
  svg: svgIcon,
  tar: zipIcon,
  toml: tomlIcon,
  ts: typescriptIcon,
  tsx: reactIcon,
  txt: documentIcon,
  wav: audioIcon,
  webm: videoIcon,
  webp: imageIcon,
  woff: fontIcon,
  woff2: fontIcon,
  xls: tableIcon,
  xlsx: tableIcon,
  xml: xmlIcon,
  yaml: yamlIcon,
  yml: yamlIcon,
  zip: zipIcon,
};

function fileExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return "";
  }
  return fileName.slice(lastDotIndex + 1).toLowerCase();
}

function fileIconFor(file: FileEntry) {
  if (file.kind === "folder") {
    return folderIcon;
  }

  const normalizedName = file.name.toLowerCase();
  return (
    FILE_ICON_BY_NAME[normalizedName] ??
    FILE_ICON_BY_EXTENSION[fileExtension(normalizedName)] ??
    (file.kind === "other" ? documentIcon : fileIcon)
  );
}

function fileIconLabel(file: FileEntry) {
  if (file.kind === "folder") {
    return i18next.t("sftp.folder");
  }
  if (file.kind === "symlink") {
    return i18next.t("sftp.symlink");
  }
  const extension = fileExtension(file.name);
  return extension ? i18next.t("sftp.fileTypeLabel", { ext: extension.toUpperCase() }) : i18next.t("sftp.file");
}

export function FileTypeIcon({ file }: { file: FileEntry }) {
  return (
    <span
      aria-label={fileIconLabel(file)}
      className={`file-type-icon file-type-icon-${file.kind}`}
      role="img"
    >
      <img alt="" draggable={false} src={fileIconFor(file)} />
    </span>
  );
}
