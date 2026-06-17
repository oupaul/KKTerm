import i18next from "../../../../i18n/config";
import { confirmNativeDialog, invokeCommand } from "../../../../lib/tauri";
import { isWindowsPlatform } from "../../../../lib/platform";
import { installRecipeAndWait } from "../../../installer/progress";
import { isPwshShell } from "./pwshShell";

const PWSH_TOOL_ID = "powershell-7";
const PWSH_SHELL = "pwsh.exe";
const POWERSHELL_5_SHELL = "powershell.exe";

/** A minimal terminal sink — just the `writeln` we use from xterm. */
export interface TerminalLineSink {
  writeln(line: string): void;
}

/**
 * Resolve the shell to actually spawn for a local terminal launch.
 *
 * When the requested shell is pwsh on Windows but pwsh is not installed, this
 * prompts the user (translated native dialog). On accept it installs
 * PowerShell 7 via the Install Helper engine, streaming progress into the
 * terminal pane, then returns `pwsh.exe` on success. On decline or any
 * failure it returns `powershell.exe` so the pane always opens a usable shell.
 * For every other shell (or non-Windows), it returns the input unchanged.
 */
export async function resolveLocalShellForLaunch(
  shell: string | undefined,
  terminal: TerminalLineSink,
): Promise<string | undefined> {
  if (!isWindowsPlatform() || !isPwshShell(shell)) {
    return shell;
  }
  if (await invokeCommand("local_shell_available", { shell: PWSH_SHELL })) {
    return shell;
  }

  const shouldInstall = await confirmNativeDialog(
    i18next.t("installer.powerShell7.installPrompt"),
    { title: i18next.t("installer.powerShell7.installTitle") },
  );
  if (shouldInstall !== true) {
    return POWERSHELL_5_SHELL;
  }

  try {
    await invokeCommand("installer_load_catalog", {});
    terminal.writeln(i18next.t("installer.powerShell7.installing"));
    const result = await installRecipeAndWait(PWSH_TOOL_ID, undefined, (event) => {
      if (event.kind === "step") {
        terminal.writeln(event.message);
      } else if (event.kind === "stdout" || event.kind === "stderr") {
        terminal.writeln(event.line);
      }
    });
    if (
      result.kind === "completed" &&
      (await invokeCommand("local_shell_available", { shell: PWSH_SHELL }))
    ) {
      return PWSH_SHELL;
    }
    const message =
      result.kind === "failed"
        ? result.message
        : i18next.t("installer.powerShell7.installTitle");
    terminal.writeln(i18next.t("installer.powerShell7.installFailed", { message }));
    return POWERSHELL_5_SHELL;
  } catch (error) {
    terminal.writeln(
      i18next.t("installer.powerShell7.installFailed", { message: String(error) }),
    );
    return POWERSHELL_5_SHELL;
  }
}
