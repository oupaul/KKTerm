export async function writeToClipboard(text: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  // execCommand("copy") copies the focused selection, so the temporary
  // textarea must take focus; hand focus back afterwards or the previously
  // focused element (e.g. xterm's hidden textarea during copy-on-select)
  // stops receiving keystrokes until the user clicks it again.
  const previouslyFocused = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  if (previouslyFocused instanceof HTMLElement) {
    previouslyFocused.focus();
  }
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
