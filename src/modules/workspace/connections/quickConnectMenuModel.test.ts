import {
  elevatedLocalShellAction,
  findMatchingConnection,
  truncateQuickConnectRecentLabel,
} from "./quickConnectMenuModel";
import type { Connection } from "../../../types";

const exactForty = "1234567890123456789012345678901234567890";
const longerThanForty = "12345678901234567890123456789012345678901";

if (truncateQuickConnectRecentLabel(exactForty) !== exactForty) {
  throw new Error("Quick Connect recent labels at 40 characters should not be truncated");
}

if (truncateQuickConnectRecentLabel(longerThanForty) !== "1234567890123456789012345678901234567...") {
  throw new Error("Quick Connect recent labels longer than 40 characters should be truncated with ...");
}

const elevatedPowerShell = elevatedLocalShellAction({
  adminLabel: "Admin",
  isAppElevated: true,
  option: { label: "PowerShell", value: "powershell.exe" },
});

if (elevatedPowerShell.mode !== "embedded") {
  throw new Error("Quick Connect Admin should embed the shell when KKTerm is already elevated");
}

if (elevatedPowerShell.name !== "PowerShell (Admin)") {
  throw new Error("Embedded elevated local shells should be labelled as elevated");
}

const unelevatedPowerShell = elevatedLocalShellAction({
  adminLabel: "Admin",
  isAppElevated: false,
  option: { label: "PowerShell", value: "powershell.exe" },
});

if (unelevatedPowerShell.mode !== "external") {
  throw new Error("Quick Connect Admin should keep external UAC launch when KKTerm is not elevated");
}

function conn(partial: Partial<Connection>): Connection {
  return {
    id: partial.id ?? "id",
    name: partial.name ?? "name",
    host: partial.host ?? "",
    user: partial.user ?? "",
    type: partial.type ?? "ssh",
    status: "idle",
    ...partial,
  };
}

const sshSaved = conn({ id: "saved-1", type: "ssh", host: "h1", user: "u1", port: 22 });
const localSaved = conn({ id: "saved-2", type: "local", host: "localhost", user: "local", localShell: "powershell.exe" });

// SSH match by host+user+port (default 22 when unset).
if (findMatchingConnection([sshSaved], conn({ id: "x", type: "ssh", host: "h1", user: "u1" }))?.id !== "saved-1") {
  throw new Error("SSH candidate with default port should match a saved port-22 connection");
}
// SSH no-match on different user.
if (findMatchingConnection([sshSaved], conn({ id: "x", type: "ssh", host: "h1", user: "u2", port: 22 }))) {
  throw new Error("SSH candidate with a different user should not match");
}
// SSH no-match on different port.
if (findMatchingConnection([sshSaved], conn({ id: "x", type: "ssh", host: "h1", user: "u1", port: 2222 }))) {
  throw new Error("SSH candidate with a different port should not match");
}
// Local match by shell.
if (findMatchingConnection([localSaved], conn({ id: "x", type: "local", host: "localhost", user: "local", localShell: "powershell.exe" }))?.id !== "saved-2") {
  throw new Error("Local candidate should match a saved connection with the same shell");
}
// Local no-match on different shell.
if (findMatchingConnection([localSaved], conn({ id: "x", type: "local", localShell: "cmd.exe" }))) {
  throw new Error("Local candidate with a different shell should not match");
}
// Other types never match (always create).
if (findMatchingConnection([conn({ id: "r", type: "rdp", host: "h1" })], conn({ id: "x", type: "rdp", host: "h1" }))) {
  throw new Error("Non-ssh/local types should never reuse");
}
