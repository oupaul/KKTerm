import {
  elevatedLocalShellAction,
  truncateQuickConnectRecentLabel,
} from "./quickConnectMenuModel";

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
