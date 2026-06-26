import { useEffect, useState } from "react";
import { Waypoints } from "lucide-react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { technicalInputProps } from "../../lib/inputBehavior";
import { useWorkspaceStore } from "../../store";
import type { ProxyMode } from "../../types";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";

type ProxyProtocol = "http" | "https" | "socks5";

function explicitPortFromProxyValue(value: string): string {
  const authority = value.split("://", 2)[1]?.split(/[/?#]/, 1)[0] ?? "";
  if (!authority) {
    return "";
  }
  if (authority.startsWith("[")) {
    return authority.match(/^\[[^\]]+\]:(\d+)$/)?.[1] ?? "";
  }
  return authority.match(/:(\d+)$/)?.[1] ?? "";
}

/** Split a stored `<scheme>://host:port` app proxy into editable parts. */
function splitAppProxy(value?: string): { protocol: ProxyProtocol; host: string; port: string } {
  if (value?.trim()) {
    try {
      const parsed = new URL(value);
      const scheme = parsed.protocol.replace(/:$/, "");
      if ((scheme === "http" || scheme === "https" || scheme === "socks5") && parsed.hostname) {
        return {
          protocol: scheme,
          host: parsed.hostname.replace(/^\[|\]$/g, ""),
          port: explicitPortFromProxyValue(value),
        };
      }
    } catch {
      // Invalid persisted values fall back to the manual defaults below.
    }
  }
  return { protocol: "socks5", host: "", port: "" };
}

/** Assemble editable parts back into a `<scheme>://host:port` app proxy URL. */
function assembleAppProxy(protocol: ProxyProtocol, host: string, port: string): string {
  const trimmedHost = host.trim();
  if (!trimmedHost) {
    return "";
  }
  const bracketedHost =
    trimmedHost.includes(":") && !trimmedHost.startsWith("[") ? `[${trimmedHost}]` : trimmedHost;
  const trimmedPort = port.trim();
  return trimmedPort
    ? `${protocol}://${bracketedHost}:${trimmedPort}`
    : `${protocol}://${bracketedHost}`;
}

export function ProxySettings() {
  const { t } = useTranslation();
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const setGeneralSettings = useWorkspaceStore((state) => state.setGeneralSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const initialProxyParts = splitAppProxy(generalSettings.proxyUrl);
  const [proxyMode, setProxyMode] = useState<ProxyMode>(generalSettings.proxyMode);
  const [proxyProtocol, setProxyProtocol] = useState<ProxyProtocol>(initialProxyParts.protocol);
  const [proxyHost, setProxyHost] = useState(initialProxyParts.host);
  const [proxyPort, setProxyPort] = useState(initialProxyParts.port);

  const composedProxyUrl =
    proxyMode === "manual" ? assembleAppProxy(proxyProtocol, proxyHost, proxyPort) : "";
  const hasChanges =
    proxyMode !== generalSettings.proxyMode ||
    composedProxyUrl !== (generalSettings.proxyUrl ?? "");

  useEffect(() => {
    setProxyMode(generalSettings.proxyMode);
    const parts = splitAppProxy(generalSettings.proxyUrl);
    setProxyProtocol(parts.protocol);
    setProxyHost(parts.host);
    setProxyPort(parts.port);
  }, [generalSettings]);

  async function handleSave() {
    try {
      const currentSettings = useWorkspaceStore.getState().generalSettings;
      const request = {
        ...currentSettings,
        proxyMode,
        proxyUrl: composedProxyUrl,
      };
      const saved = isTauriRuntime()
        ? await invokeCommand("update_general_settings", { request })
        : request;
      setGeneralSettings(saved);
      showStatusBarNotice(t("settings.proxySettingsSaved"), { tone: "success" });
    } catch (saveError) {
      showStatusBarNotice(saveError instanceof Error ? saveError.message : String(saveError), {
        tone: "error",
      });
    }
  }

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  return (
    <section className="settings-card settings-section" data-tutorial-id="settings.proxy">
      <SettingsSectionHeader
        icon={<Waypoints size={18} />}
        label={t("settings.proxy")}
        title={t("settings.proxy")}
      />

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.proxy")}</legend>
        <div>
          <p className="field-hint">{t("settings.proxyHint")}</p>
        </div>
        <div className="form-grid general-settings-grid">
          <label>
            <span>{t("settings.proxyMode")}</span>
            <select
              value={proxyMode}
              onChange={(event) => setProxyMode(event.currentTarget.value as ProxyMode)}
            >
              <option value="system">{t("settings.proxyModeSystem")}</option>
              <option value="none">{t("settings.proxyModeNone")}</option>
              <option value="manual">{t("settings.proxyModeManual")}</option>
            </select>
            <small className="field-hint">{t("settings.proxyPlatformHint")}</small>
          </label>
        </div>
        {proxyMode === "manual" ? (
          <div className="form-grid three-columns settings-merged-block">
            <label>
              <span>{t("settings.proxyProtocol")}</span>
              <select
                value={proxyProtocol}
                onChange={(event) =>
                  setProxyProtocol(event.currentTarget.value as ProxyProtocol)
                }
              >
                <option value="http">{t("settings.proxyHttp")}</option>
                <option value="https">{t("settings.proxyHttps")}</option>
                <option value="socks5">{t("settings.proxySocks5")}</option>
              </select>
            </label>
            <label>
              <span>{t("settings.proxyHost")}</span>
              <input
                {...technicalInputProps}
                onChange={(event) => setProxyHost(event.currentTarget.value)}
                placeholder={t("settings.proxyHostPlaceholder")}
                required
                value={proxyHost}
              />
            </label>
            <label>
              <span>{t("settings.proxyPort")}</span>
              <input
                {...technicalInputProps}
                inputMode="numeric"
                max={65535}
                min={1}
                onChange={(event) => setProxyPort(event.currentTarget.value)}
                placeholder={proxyProtocol === "socks5" ? "1080" : "3128"}
                required
                type="number"
                value={proxyPort}
              />
            </label>
          </div>
        ) : null}
      </fieldset>
    </section>
  );
}
