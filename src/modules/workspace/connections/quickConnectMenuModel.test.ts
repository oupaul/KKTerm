import { truncateQuickConnectRecentLabel } from "./quickConnectMenuModel";

const exactForty = "1234567890123456789012345678901234567890";
const longerThanForty = "12345678901234567890123456789012345678901";

if (truncateQuickConnectRecentLabel(exactForty) !== exactForty) {
  throw new Error("Quick Connect recent labels at 40 characters should not be truncated");
}

if (truncateQuickConnectRecentLabel(longerThanForty) !== "1234567890123456789012345678901234567...") {
  throw new Error("Quick Connect recent labels longer than 40 characters should be truncated with ...");
}
