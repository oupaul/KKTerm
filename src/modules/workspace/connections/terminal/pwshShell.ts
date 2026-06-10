// Pure predicate for recognizing PowerShell 7 (pwsh) shell strings. Kept free
// of Tauri/runtime imports so it can be unit-tested in isolation; the install
// flow that consumes it lives in `pwshPreflight.ts`.

/** Whether the given shell string refers to PowerShell 7 (pwsh), in any
 * casing or absolute-path form. */
export function isPwshShell(shell: string | undefined): boolean {
  if (!shell) return false;
  const normalized = shell.trim().replace(/\//g, "\\").toLowerCase();
  return (
    normalized === "pwsh" ||
    normalized === "pwsh.exe" ||
    normalized.endsWith("\\pwsh.exe")
  );
}
