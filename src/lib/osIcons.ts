// OS / Linux-distribution icon registry shared by the connection icon picker and
// the SSH remote-OS auto-detection flow. Brand logos are bundled SVGs under
// `src/assets/connection-icons/os/` (CC0 simple-icons, recolored for the dark
// UI; Windows is an app-authored tile). This module is intentionally free of
// Vite-only imports (no `import.meta.glob`) so it stays importable from the pure
// frontend test runner; the id -> bundled-URL resolution lives in
// `src/lib/osIconUrls.ts`.

export const OS_ICON_REF_PREFIX = "os:";
const OS_ICON_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

export type OsIconEntry = {
  /** Canonical id; also the SVG file name and the value after `os:`. */
  id: string;
  /** Display label shown in the icon palette (brand proper noun, untranslated). */
  label: string;
  /** Search keywords for the palette filter (English plus common aliases). */
  keywords: string[];
};

// Order roughly by popularity so the palette reads sensibly.
export const OS_ICON_ENTRIES: OsIconEntry[] = [
  { id: "ubuntu", label: "Ubuntu", keywords: ["ubuntu", "linux", "debian", "canonical", "os"] },
  { id: "debian", label: "Debian", keywords: ["debian", "linux", "os"] },
  { id: "fedora", label: "Fedora", keywords: ["fedora", "linux", "redhat", "rhel", "os"] },
  { id: "redhat", label: "Red Hat", keywords: ["redhat", "red hat", "rhel", "enterprise", "linux", "os"] },
  { id: "centos", label: "CentOS", keywords: ["centos", "rhel", "redhat", "linux", "os"] },
  { id: "almalinux", label: "AlmaLinux", keywords: ["almalinux", "alma", "rhel", "redhat", "linux", "os"] },
  { id: "rockylinux", label: "Rocky Linux", keywords: ["rocky", "rockylinux", "rhel", "redhat", "linux", "os"] },
  { id: "opensuse", label: "openSUSE", keywords: ["opensuse", "suse", "leap", "tumbleweed", "linux", "os"] },
  { id: "suse", label: "SUSE", keywords: ["suse", "sles", "sled", "enterprise", "linux", "os"] },
  { id: "archlinux", label: "Arch Linux", keywords: ["arch", "archlinux", "linux", "os"] },
  { id: "manjaro", label: "Manjaro", keywords: ["manjaro", "arch", "linux", "os"] },
  { id: "alpinelinux", label: "Alpine Linux", keywords: ["alpine", "alpinelinux", "docker", "linux", "os"] },
  { id: "linuxmint", label: "Linux Mint", keywords: ["mint", "linuxmint", "ubuntu", "debian", "linux", "os"] },
  { id: "kalilinux", label: "Kali Linux", keywords: ["kali", "kalilinux", "security", "pentest", "linux", "os"] },
  { id: "gentoo", label: "Gentoo", keywords: ["gentoo", "linux", "os"] },
  { id: "raspberrypi", label: "Raspberry Pi", keywords: ["raspberry", "raspberrypi", "pi", "raspbian", "debian", "linux", "os"] },
  { id: "nixos", label: "NixOS", keywords: ["nixos", "nix", "linux", "os"] },
  { id: "voidlinux", label: "Void Linux", keywords: ["void", "voidlinux", "linux", "os"] },
  { id: "elementary", label: "elementary OS", keywords: ["elementary", "ubuntu", "debian", "linux", "os"] },
  { id: "popos", label: "Pop!_OS", keywords: ["pop", "popos", "pop os", "system76", "ubuntu", "linux", "os"] },
  { id: "zorin", label: "Zorin OS", keywords: ["zorin", "ubuntu", "debian", "linux", "os"] },
  { id: "freebsd", label: "FreeBSD", keywords: ["freebsd", "bsd", "unix", "os"] },
  { id: "openbsd", label: "OpenBSD", keywords: ["openbsd", "bsd", "unix", "os"] },
  { id: "netbsd", label: "NetBSD", keywords: ["netbsd", "bsd", "unix", "os"] },
  { id: "openwrt", label: "OpenWrt", keywords: ["openwrt", "router", "linux", "embedded", "os"] },
  { id: "proxmox", label: "Proxmox VE", keywords: ["proxmox", "pve", "hypervisor", "debian", "linux", "os"] },
  { id: "truenas", label: "TrueNAS", keywords: ["truenas", "freenas", "nas", "storage", "bsd", "linux", "os"] },
  { id: "pfsense", label: "pfSense", keywords: ["pfsense", "firewall", "router", "freebsd", "bsd", "os"] },
  { id: "apple", label: "macOS", keywords: ["macos", "mac", "apple", "osx", "darwin", "unix", "os"] },
  { id: "windows", label: "Windows", keywords: ["windows", "microsoft", "win", "os"] },
  { id: "linux", label: "Linux", keywords: ["linux", "gnu", "tux", "generic", "unix", "os"] },
];

const OS_ICON_IDS = new Set(OS_ICON_ENTRIES.map((entry) => entry.id));

export function isKnownOsIconId(id: string): boolean {
  return OS_ICON_IDS.has(id);
}

export function osIconRefForId(id: string): string {
  return `${OS_ICON_REF_PREFIX}${id}`;
}

export function osIconIdFromRef(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.startsWith(OS_ICON_REF_PREFIX)) {
    return null;
  }
  const id = value.slice(OS_ICON_REF_PREFIX.length);
  return OS_ICON_ID_PATTERN.test(id) && OS_ICON_IDS.has(id) ? id : null;
}

export function isOsIconRef(value: string | null | undefined): boolean {
  return osIconIdFromRef(value) !== null;
}

/** Raw remote-OS facts returned by the backend `detect_ssh_remote_os` command. */
export type DetectedRemoteOs = {
  /** `/etc/os-release` ID, lowercased (e.g. "ubuntu", "rhel"). */
  id?: string | null;
  /** `/etc/os-release` ID_LIKE, lowercased (space-separated parent ids). */
  idLike?: string | null;
  /** `uname -s` kernel name (e.g. "Linux", "Darwin", "FreeBSD"). */
  kernel?: string | null;
  /** Device-tree hardware model (e.g. "Raspberry Pi 5 Model B"). */
  model?: string | null;
  /** Detected appliance distribution from distinctive on-disk markers
   *  (e.g. "proxmox", "truenas", "pfsense") that share a generic os-release. */
  app?: string | null;
};

// `/etc/os-release` ID (and ID_LIKE token) -> bundled OS icon id.
const OS_RELEASE_ID_TO_ICON: Record<string, string> = {
  ubuntu: "ubuntu",
  debian: "debian",
  raspbian: "raspberrypi",
  linuxmint: "linuxmint",
  mint: "linuxmint",
  pop: "popos",
  popos: "popos",
  elementary: "elementary",
  zorin: "zorin",
  kali: "kalilinux",
  fedora: "fedora",
  rhel: "redhat",
  redhat: "redhat",
  centos: "centos",
  rocky: "rockylinux",
  almalinux: "almalinux",
  alma: "almalinux",
  ol: "redhat",
  oracle: "redhat",
  amzn: "redhat",
  scientific: "redhat",
  opensuse: "opensuse",
  "opensuse-leap": "opensuse",
  "opensuse-tumbleweed": "opensuse",
  suse: "suse",
  sles: "suse",
  sled: "suse",
  arch: "archlinux",
  archarm: "archlinux",
  endeavouros: "archlinux",
  arcolinux: "archlinux",
  garuda: "archlinux",
  manjaro: "manjaro",
  alpine: "alpinelinux",
  gentoo: "gentoo",
  nixos: "nixos",
  void: "voidlinux",
  openwrt: "openwrt",
  truenas: "truenas",
  freebsd: "freebsd",
  openbsd: "openbsd",
  netbsd: "netbsd",
};

function osIconIdFromKernel(kernel: string): string | null {
  const value = kernel.toLowerCase();
  if (value.includes("darwin")) {
    return "apple";
  }
  if (value.includes("freebsd")) {
    return "freebsd";
  }
  if (value.includes("openbsd")) {
    return "openbsd";
  }
  if (value.includes("netbsd")) {
    return "netbsd";
  }
  if (value.includes("cygwin") || value.includes("mingw") || value.includes("msys") || value.includes("windows")) {
    return "windows";
  }
  if (value.includes("linux")) {
    return "linux";
  }
  return null;
}

/**
 * Resolve detected remote-OS facts to a bundled OS icon id. Priority: a
 * distinctive appliance marker (Proxmox/TrueNAS/pfSense, which share a generic
 * os-release), then Raspberry Pi hardware (64-bit Pi OS reports ID=debian), then
 * the exact `/etc/os-release` ID, its ID_LIKE parents, and finally the kernel
 * name. Unknown Linux distributions fall back to the generic Tux icon so a host
 * still gets a recognizable platform glyph.
 */
export function osIconIdForDetection(detected: DetectedRemoteOs): string | null {
  const app = detected.app?.trim().toLowerCase();
  if (app && isKnownOsIconId(app)) {
    return app;
  }
  const model = detected.model?.trim().toLowerCase();
  if (model && model.includes("raspberry pi")) {
    return "raspberrypi";
  }
  const id = detected.id?.trim().toLowerCase();
  if (id && OS_RELEASE_ID_TO_ICON[id]) {
    return OS_RELEASE_ID_TO_ICON[id];
  }
  const idLike = detected.idLike?.trim().toLowerCase();
  if (idLike) {
    for (const token of idLike.split(/\s+/)) {
      if (OS_RELEASE_ID_TO_ICON[token]) {
        return OS_RELEASE_ID_TO_ICON[token];
      }
    }
  }
  const kernel = detected.kernel?.trim();
  if (kernel) {
    const fromKernel = osIconIdFromKernel(kernel);
    if (fromKernel) {
      return fromKernel;
    }
  }
  // Known os-release id but no specific logo, on a Linux host: generic Tux.
  if (id) {
    return "linux";
  }
  return null;
}

// --- Auto-detection state -------------------------------------------------
//
// SSH remote-OS auto-detection runs at most once per Connection and never
// overrides a hand-picked icon. Two persistent (localStorage) per-Connection
// signals gate it, both keyed by Connection id (Child Connection Tabs fall back
// to their parent Connection's icon):
//
//   * "locked" — the user deliberately chose an icon (including a reset to the
//     default) through the icon picker. Auto-detection must never run.
//   * "done"   — auto-detection already resolved an icon for this Connection.
//     It is not run again, so the remote host is probed only once (the backend
//     also caches per host within a session).
//
// A Connection that already carries a user/legacy custom icon that is not an
// "os:" ref is also treated as locked at detection time, so icons chosen before
// this feature shipped are never overridden.

const OS_ICON_LOCK_STORAGE_KEY = "kkterm.osIconAutoDetect.locked.v1";
const OS_ICON_DONE_STORAGE_KEY = "kkterm.osIconAutoDetect.done.v1";

function readIdSet(storageKey: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((id) => typeof id === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function addId(storageKey: string, connectionId: string): void {
  try {
    const ids = readIdSet(storageKey);
    if (ids.has(connectionId)) {
      return;
    }
    ids.add(connectionId);
    window.localStorage.setItem(storageKey, JSON.stringify([...ids]));
  } catch {
    // Best-effort: a missing/blocked localStorage just means detection may run
    // again next connect, which is harmless.
  }
}

export function isOsIconAutoDetectLocked(connectionId: string): boolean {
  return readIdSet(OS_ICON_LOCK_STORAGE_KEY).has(connectionId);
}

export function lockOsIconAutoDetect(connectionId: string): void {
  addId(OS_ICON_LOCK_STORAGE_KEY, connectionId);
}

export function isOsIconAutoDetectDone(connectionId: string): boolean {
  return readIdSet(OS_ICON_DONE_STORAGE_KEY).has(connectionId);
}

export function markOsIconAutoDetectDone(connectionId: string): void {
  addId(OS_ICON_DONE_STORAGE_KEY, connectionId);
}

/**
 * Whether SSH remote-OS auto-detection should run for this Connection now. It
 * runs once per Connection and never overrides a deliberate icon choice. The
 * icon is consulted only to respect a pre-existing user/legacy custom icon
 * (a non-"os:" value); an empty icon or an earlier auto-detected "os:" icon is
 * still eligible until the "done" flag is set.
 */
export function shouldAutoDetectOsIcon(connection: {
  id: string;
  type: string;
  iconDataUrl?: string | null;
}): boolean {
  if (connection.type !== "ssh") {
    return false;
  }
  if (isOsIconAutoDetectLocked(connection.id) || isOsIconAutoDetectDone(connection.id)) {
    return false;
  }
  const icon = connection.iconDataUrl;
  if (icon && !isOsIconRef(icon)) {
    return false;
  }
  return true;
}
