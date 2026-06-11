import type { DashboardWidgetInstance } from "../types";
import { BUILT_IN_WIDGETS, type BuiltInWidgetBodyProps } from "../registry/builtInRegistry";
import type { Connection, WorkspaceTab } from "../../../types";
import { createConnectionWidgetTab } from "./ConnectionWidgetBody";

const instance: DashboardWidgetInstance = {
  id: "inst-test",
  viewId: "view-test",
  kind: "builtIn",
  sourceId: "connectionPane",
  preset: "panel",
  accentName: "teal",
  iconName: "Server",
  customTitle: null,
  settingsValuesJson: "{}",
  gridX: 0,
  gridY: 0,
  gridW: 8,
  gridH: 5,
  sortOrder: 0,
};

const connection: Connection = {
  id: "conn-test",
  name: "Bastion",
  host: "bastion.local",
  user: "ops",
  type: "ssh",
  status: "idle",
};

const bodyProps: BuiltInWidgetBodyProps = {
  instance,
  isViewActive: true,
  suppressNativeWebviews: false,
};
const connectionTab: WorkspaceTab = createConnectionWidgetTab(instance.id, connection);
const builtInIds = BUILT_IN_WIDGETS.map((entry) => entry.id);

const defaultAccent: DashboardWidgetInstance["accentName"] = "default";

if (!builtInIds.includes("connectionPane")) {
  throw new Error("Dashboard built-in registry is missing the Connection Pane widget.");
}

if (!builtInIds.includes("aiCodingUsage")) {
  throw new Error("Dashboard built-in registry is missing the AI Coding Usage widget.");
}

// Utility widgets shipped as built-ins. Keep this list in sync with
// builtInRegistry.ts so a dropped registration fails loudly.
const requiredUtilityIds = ["networkTools", "generatorTools"];
for (const requiredId of requiredUtilityIds) {
  if (!builtInIds.includes(requiredId)) {
    throw new Error(`Dashboard built-in registry is missing the ${requiredId} widget.`);
  }
}

// Every built-in must point at a translatable title/summary and a real Body.
for (const entry of BUILT_IN_WIDGETS) {
  if (!entry.titleKey.startsWith("dashboard.") && !entry.titleKey.includes(".")) {
    throw new Error(`Built-in widget ${entry.id} has a non-namespaced titleKey.`);
  }
  if (typeof entry.Body !== "function") {
    throw new Error(`Built-in widget ${entry.id} has no Body component.`);
  }
}

void bodyProps;
void connectionTab;
void defaultAccent;
