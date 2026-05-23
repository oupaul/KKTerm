import { AppLauncherWidget } from "./builtin/app-launcher/AppLauncherWidget";
import type { BuiltInWidgetBodyProps } from "../registry/builtInRegistry";

export function AppLauncherBody({ instance }: BuiltInWidgetBodyProps) {
  return <AppLauncherWidget instance={instance} />;
}
