// Preview-only provider for /design-sync cards. Initializes react-i18next with
// the app's real English locale so components that call useTranslation
// (ConfirmSheet, ColorPalettePicker) render real copy instead of raw keys.
// Bundled via cfg.extraEntries and applied via cfg.provider. Not app code.
import i18next from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";
import en from "../src/i18n/locales/en.json";

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
}

export function PreviewI18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}
