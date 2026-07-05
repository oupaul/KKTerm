import { RefreshCw } from "../../../../../lib/reicon";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BuiltInWidgetBodyProps } from "../../../registry/builtInRegistry";
import { useWidgetConfig } from "../../widgetLocalStorage";
import { useCopyFeedback } from "../../useCopyFeedback";
import {
  DIGITS,
  SYMBOLS,
  UPPERCASE,
  generatePassphrase,
  generatePassword,
  passphraseEntropyBits,
  passwordEntropyBits,
  strengthTier,
} from "./passwordGen";

type GeneratorMode = "password" | "passphrase";

interface PasswordConfig {
  mode: GeneratorMode;
  length: number;
  words: number;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
}

const DEFAULT_CONFIG: PasswordConfig = {
  mode: "password",
  length: 20,
  words: 5,
  uppercase: true,
  digits: true,
  symbols: true,
};

function storageKey(instanceId: string) {
  return `kkterm.dashboard.passwordGenerator.${instanceId}.v1`;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeConfig(value: unknown): PasswordConfig {
  if (!value || typeof value !== "object") return DEFAULT_CONFIG;
  const candidate = value as Partial<PasswordConfig>;
  return {
    mode: candidate.mode === "passphrase" ? "passphrase" : "password",
    length: clampInt(candidate.length, 8, 64, DEFAULT_CONFIG.length),
    words: clampInt(candidate.words, 3, 9, DEFAULT_CONFIG.words),
    uppercase: candidate.uppercase !== false,
    digits: candidate.digits !== false,
    symbols: candidate.symbols !== false,
  };
}

function classifyChar(char: string): "upper" | "digit" | "symbol" | "lower" {
  if (UPPERCASE.includes(char)) return "upper";
  if (DIGITS.includes(char)) return "digit";
  if (SYMBOLS.includes(char)) return "symbol";
  return "lower";
}

function generate(config: PasswordConfig): string {
  return config.mode === "passphrase"
    ? generatePassphrase(config.words)
    : generatePassword(config);
}

export function PasswordGeneratorBody({ instance }: BuiltInWidgetBodyProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useWidgetConfig(
    storageKey(instance.id),
    DEFAULT_CONFIG,
    normalizeConfig,
  );
  const { copiedKey, copy } = useCopyFeedback();
  const [seed, setSeed] = useState(0);
  // The secret itself is never persisted; it only lives in this render state.
  // `seed` exists purely to force a re-roll from the refresh button.
  const secret = useMemo(() => {
    void seed;
    return generate(config);
  }, [config, seed]);
  const bits =
    config.mode === "passphrase"
      ? passphraseEntropyBits(config.words)
      : passwordEntropyBits(config);
  const tier = strengthTier(bits);

  function update(patch: Partial<PasswordConfig>) {
    setConfig({ ...config, ...patch });
  }

  return (
    <div className="dw-password">
      <div className="dw-password-output-row">
        <button
          type="button"
          className={`dw-password-output${copiedKey === "secret" ? " is-copied" : ""}`}
          title={t("dashboard.widgetCopyValue")}
          onClick={() => copy("secret", secret)}
          key={secret}
        >
          {copiedKey === "secret"
            ? t("dashboard.widgetCopied")
            : Array.from(secret, (char, index) => (
                <span key={index} className={`dw-password-char dw-password-char--${classifyChar(char)}`}>
                  {char}
                </span>
              ))}
        </button>
        <button
          type="button"
          className="dashboard-widget-icon-button dw-password-refresh"
          aria-label={t("dashboard.passwordRegenerate")}
          title={t("dashboard.passwordRegenerate")}
          onClick={() => setSeed((value) => value + 1)}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="dw-password-strength" aria-hidden="true">
        <div
          className={`dw-password-strength-fill dw-password-strength--${tier}`}
          style={{ width: `${Math.min(100, Math.round((bits / 110) * 100))}%` }}
        />
      </div>
      <div className="dw-password-strength-caption">
        <span>{t(`dashboard.passwordStrength.${tier}`)}</span>
        <span>{t("dashboard.passwordEntropyBits", { bits })}</span>
      </div>
      <div className="dw-password-modes" role="radiogroup" aria-label={t("dashboard.passwordTitle")}>
        {(["password", "passphrase"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={config.mode === mode}
            className={`dw-password-mode${config.mode === mode ? " is-active" : ""}`}
            onClick={() => update({ mode })}
          >
            {mode === "password"
              ? t("dashboard.passwordModePassword")
              : t("dashboard.passwordModePassphrase")}
          </button>
        ))}
      </div>
      {config.mode === "password" ? (
        <>
          <label className="dw-password-slider">
            <span className="dw-password-slider-label">
              {t("dashboard.passwordLength", { length: config.length })}
            </span>
            <input
              type="range"
              min={8}
              max={64}
              value={config.length}
              onChange={(event) => update({ length: Number(event.target.value) })}
            />
          </label>
          <div className="dw-password-toggles">
            {(
              [
                ["uppercase", "A-Z"],
                ["digits", "0-9"],
                ["symbols", "#!&"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={config[key]}
                aria-label={t(`dashboard.passwordToggle.${key}`)}
                className={`dw-password-toggle${config[key] ? " is-active" : ""}`}
                onClick={() => update({ [key]: !config[key] })}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <label className="dw-password-slider">
          <span className="dw-password-slider-label">
            {t("dashboard.passwordWords", { words: config.words })}
          </span>
          <input
            type="range"
            min={3}
            max={9}
            value={config.words}
            onChange={(event) => update({ words: Number(event.target.value) })}
          />
        </label>
      )}
    </div>
  );
}
