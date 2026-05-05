import packageManifest from "../../package.json";

export type OpenSourceComponent = {
  name: string;
  version: string;
  license: string;
  role: string;
};

export const ABOUT_PRODUCT = {
  name: "AdminDeck",
  slogan: "Local-first administration workspace.",
  developer: "Ryan Tsai",
  repositoryUrl: "https://github.com/ryantsai/AdminDeck",
  version: packageManifest.version,
  license: "Apache-2.0",
};

const frontendRuntimeComponents: OpenSourceComponent[] = [
  { name: "@icon-park/react", version: "1.4.2", license: "Apache-2.0", role: "Frontend runtime" },
  { name: "@tauri-apps/api", version: "2.11.0", license: "Apache-2.0 OR MIT", role: "Frontend runtime" },
  { name: "@tauri-apps/plugin-dialog", version: "2.7.1", license: "MIT OR Apache-2.0", role: "Frontend runtime" },
  { name: "@tauri-apps/plugin-fs", version: "2.5.1", license: "MIT OR Apache-2.0", role: "Frontend runtime" },
  { name: "@tauri-apps/plugin-opener", version: "2.5.3", license: "MIT OR Apache-2.0", role: "Frontend runtime" },
  { name: "@xterm/addon-fit", version: "0.11.0", license: "MIT", role: "Terminal runtime" },
  { name: "@xterm/addon-search", version: "0.16.0", license: "MIT", role: "Terminal runtime" },
  { name: "@xterm/addon-web-links", version: "0.12.0", license: "MIT", role: "Terminal runtime" },
  { name: "@xterm/addon-webgl", version: "0.19.0", license: "MIT", role: "Terminal runtime" },
  { name: "@xterm/xterm", version: "6.0.0", license: "MIT", role: "Terminal runtime" },
  { name: "lucide-react", version: "1.14.0", license: "ISC", role: "Frontend runtime" },
  { name: "react", version: "19.2.5", license: "MIT", role: "Frontend runtime" },
  { name: "react-dom", version: "19.2.5", license: "MIT", role: "Frontend runtime" },
  { name: "zustand", version: "5.0.12", license: "MIT", role: "Frontend runtime" },
];

const frontendToolingComponents: OpenSourceComponent[] = [
  { name: "@tailwindcss/vite", version: "4.2.4", license: "MIT", role: "Frontend tooling" },
  { name: "@tauri-apps/cli", version: "2.11.0", license: "Apache-2.0 OR MIT", role: "Build tooling" },
  { name: "@types/react", version: "19.2.14", license: "MIT", role: "Type definitions" },
  { name: "@types/react-dom", version: "19.2.3", license: "MIT", role: "Type definitions" },
  { name: "@vitejs/plugin-react", version: "4.7.0", license: "MIT", role: "Frontend tooling" },
  { name: "tailwindcss", version: "4.2.4", license: "MIT", role: "Frontend tooling" },
  { name: "typescript", version: "5.8.3", license: "Apache-2.0", role: "Language tooling" },
  { name: "vite", version: "7.3.2", license: "MIT", role: "Frontend tooling" },
];

const rustComponents: OpenSourceComponent[] = [
  { name: "base64", version: "0.22.1", license: "MIT OR Apache-2.0", role: "Rust runtime" },
  { name: "image", version: "0.25.10", license: "MIT OR Apache-2.0", role: "Rust runtime" },
  { name: "keyring-core", version: "1.0.0", license: "MIT OR Apache-2.0", role: "Rust runtime" },
  { name: "portable-pty", version: "0.9.0", license: "MIT", role: "Rust runtime" },
  { name: "reqwest", version: "0.12.28", license: "MIT OR Apache-2.0", role: "Rust runtime" },
  { name: "rusqlite", version: "0.32.1", license: "MIT", role: "Rust runtime" },
  { name: "russh", version: "0.60.2", license: "Apache-2.0", role: "Rust runtime" },
  { name: "russh-sftp", version: "2.1.2", license: "Apache-2.0", role: "Rust runtime" },
  { name: "serde", version: "1.0.228", license: "MIT OR Apache-2.0", role: "Rust runtime" },
  { name: "serde_json", version: "1.0.149", license: "MIT OR Apache-2.0", role: "Rust runtime" },
  { name: "tauri", version: "2.11.0", license: "Apache-2.0 OR MIT", role: "Rust runtime" },
  { name: "tauri-build", version: "2.6.0", license: "Apache-2.0 OR MIT", role: "Rust build tooling" },
  { name: "tauri-plugin-dialog", version: "2.7.1", license: "Apache-2.0 OR MIT", role: "Rust runtime" },
  { name: "tauri-plugin-fs", version: "2.5.1", license: "Apache-2.0 OR MIT", role: "Rust runtime" },
  { name: "tauri-plugin-opener", version: "2.5.3", license: "Apache-2.0 OR MIT", role: "Rust runtime" },
  { name: "tokio", version: "1.52.1", license: "MIT", role: "Rust runtime" },
  { name: "url", version: "2.5.8", license: "MIT OR Apache-2.0", role: "Rust runtime" },
  { name: "windows", version: "0.61.3", license: "MIT OR Apache-2.0", role: "Windows runtime" },
  {
    name: "windows-native-keyring-store",
    version: "1.0.0",
    license: "MIT OR Apache-2.0",
    role: "Windows runtime",
  },
  { name: "windows-sys", version: "0.59.0", license: "MIT OR Apache-2.0", role: "Windows runtime" },
];

export const OPEN_SOURCE_COMPONENT_GROUPS = [
  { label: "Frontend runtime", components: frontendRuntimeComponents },
  { label: "Frontend tooling", components: frontendToolingComponents },
  { label: "Rust backend", components: rustComponents },
] as const;
