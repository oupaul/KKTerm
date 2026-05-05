export async function writeToClipboard(text: string) {
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
  if (!navigator.clipboard?.readText) {
    return "";
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}
