import {
  activePageFromStoredValue,
  baseModulePageForPersistence,
  shouldExpandConnectionPanelOnLaunch,
} from "./appNavigationPersistence.ts";

if (activePageFromStoredValue("dashboard") !== "dashboard") {
  throw new Error("Dashboard should restore as the active launch Module.");
}

if (activePageFromStoredValue("installer") !== "installer") {
  throw new Error("Installer Helper should restore as the active launch Module.");
}

if (activePageFromStoredValue("settings") !== "workspace") {
  throw new Error("Settings should not restore as a launch Module.");
}

if (activePageFromStoredValue("unknown") !== "workspace") {
  throw new Error("Unknown stored pages should fall back to Workspace.");
}

if (baseModulePageForPersistence("settings", "dashboard") !== "dashboard") {
  throw new Error("Settings should persist the previous base Module.");
}

if (!shouldExpandConnectionPanelOnLaunch("workspace")) {
  throw new Error("A Workspace launch should show the Connection Tree.");
}

if (shouldExpandConnectionPanelOnLaunch("dashboard")) {
  throw new Error("A Dashboard launch should preserve the stored Connection Tree layout.");
}
