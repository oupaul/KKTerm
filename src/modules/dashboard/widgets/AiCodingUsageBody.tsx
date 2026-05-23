import { AiCodingUsageWidget } from "./builtin/ai-coding-usage/AiCodingUsageWidget";
import type { BuiltInWidgetBodyProps } from "../registry/builtInRegistry";

export function AiCodingUsageBody({ instance }: BuiltInWidgetBodyProps) {
  return <AiCodingUsageWidget instance={instance} />;
}
