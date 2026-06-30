// In Tauri's WKWebView (macOS) the browser clipboard APIs
// (navigator.clipboard.writeText / document.execCommand) are unreliable: they
// depend on a user-gesture context that is easily lost, so copy silently fails
// in some panes (notably SSH) while working in others. The Tauri clipboard
// plugin writes to the system clipboard from Rust, which needs no gesture
// context and works identically everywhere. We try it first and only fall back
// to the browser APIs in a plain (non-Tauri) web runtime.
export async function writeToClipboard(text: string) {
  try {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text);
    return;
  } catch {
    // Not in a Tauri runtime, or the plugin call failed — fall back below.
  }
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export async function readFromClipboard() {
  try {
    const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
    return await readText();
  } catch {
    // Not in a Tauri runtime, or the plugin call failed — fall back below.
  }
  if (!navigator.clipboard?.readText) {
    return "";
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}
