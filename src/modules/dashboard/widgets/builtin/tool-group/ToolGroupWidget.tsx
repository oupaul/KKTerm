import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import { CronBuilderBody } from "../cron-builder/CronBuilderWidget";
import { DnsLookupBody } from "../dns-lookup/DnsLookupWidget";
import { HashWorkbenchBody } from "../hash-workbench/HashWorkbenchWidget";
import { PasswordGeneratorBody } from "../password-generator/PasswordGeneratorWidget";
import { QrCodeBody } from "../qr-code/QrCodeWidget";
import { SpeedtestBody } from "../speedtest/SpeedtestWidget";
import { SubnetCalculatorBody } from "../subnet-calculator/SubnetCalculatorWidget";
import { TimeConverterBody } from "../time-converter/TimeConverterWidget";

interface ToolDefinition {
  id: string;
  labelKey: string;
  titleKey: string;
  Body: ComponentType<BuiltInWidgetBodyProps>;
}

const NETWORK_TOOLS: ToolDefinition[] = [
  {
    id: "subnet",
    labelKey: "dashboard.networkToolsTab.subnet",
    titleKey: "dashboard.subnetTitle",
    Body: SubnetCalculatorBody,
  },
  {
    id: "dns",
    labelKey: "dashboard.networkToolsTab.dns",
    titleKey: "dashboard.dnsTitle",
    Body: DnsLookupBody,
  },
  {
    id: "speedtest",
    labelKey: "dashboard.networkToolsTab.speedtest",
    titleKey: "dashboard.speedtestTitle",
    Body: SpeedtestBody,
  },
];

const GENERATOR_TOOLS: ToolDefinition[] = [
  {
    id: "qr",
    labelKey: "dashboard.generatorToolsTab.qr",
    titleKey: "dashboard.qrTitle",
    Body: QrCodeBody,
  },
  {
    id: "cron",
    labelKey: "dashboard.generatorToolsTab.cron",
    titleKey: "dashboard.cronTitle",
    Body: CronBuilderBody,
  },
  {
    id: "password",
    labelKey: "dashboard.generatorToolsTab.password",
    titleKey: "dashboard.passwordTitle",
    Body: PasswordGeneratorBody,
  },
  {
    id: "time",
    labelKey: "dashboard.generatorToolsTab.time",
    titleKey: "dashboard.timeTitle",
    Body: TimeConverterBody,
  },
  {
    id: "hash",
    labelKey: "dashboard.generatorToolsTab.hash",
    titleKey: "dashboard.hashTitle",
    Body: HashWorkbenchBody,
  },
];

interface ToolGroupConfig {
  activeTool: string;
}

function normalizeConfigFor(tools: ToolDefinition[]) {
  return (value: unknown): ToolGroupConfig => {
    const fallback = { activeTool: tools[0].id };
    if (!value || typeof value !== "object") return fallback;
    const candidate = value as Partial<ToolGroupConfig>;
    return tools.some((tool) => tool.id === candidate.activeTool)
      ? { activeTool: candidate.activeTool as string }
      : fallback;
  };
}

function ToolGroupBody({
  groupKey,
  tools,
  groupLabelKey,
  ...bodyProps
}: BuiltInWidgetBodyProps & {
  groupKey: string;
  tools: ToolDefinition[];
  groupLabelKey: string;
}) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    `kkterm.dashboard.${groupKey}.${bodyProps.instance.id}.v1`,
    { activeTool: tools[0].id },
    normalizeConfigFor(tools),
  );
  const active = tools.find((tool) => tool.id === config.activeTool) ?? tools[0];
  const ActiveBody = active.Body;

  return (
    <div className="dw-toolgroup">
      <div className="dw-toolgroup-tabs" role="tablist" aria-label={t(groupLabelKey)}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            role="tab"
            aria-selected={tool.id === active.id}
            className={`dw-toolgroup-tab${tool.id === active.id ? " is-active" : ""}`}
            title={t(tool.titleKey)}
            onClick={() => setConfig({ activeTool: tool.id })}
          >
            {t(tool.labelKey)}
          </button>
        ))}
      </div>
      <div className="dw-toolgroup-body" key={active.id}>
        <ActiveBody {...bodyProps} />
      </div>
    </div>
  );
}

export function NetworkToolsBody(props: BuiltInWidgetBodyProps) {
  return (
    <ToolGroupBody
      {...props}
      groupKey="networkTools"
      groupLabelKey="dashboard.networkToolsTitle"
      tools={NETWORK_TOOLS}
    />
  );
}

export function GeneratorToolsBody(props: BuiltInWidgetBodyProps) {
  return (
    <ToolGroupBody
      {...props}
      groupKey="generatorTools"
      groupLabelKey="dashboard.generatorToolsTitle"
      tools={GENERATOR_TOOLS}
    />
  );
}
