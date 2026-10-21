import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

export const APP_LANGUAGES = ["es", "fr", "en"] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export function appLanguage(value: string | null | undefined): AppLanguage {
  const code = (value ?? "").slice(0, 2);
  return code === "fr" || code === "en" ? code : "es";
}

const initial = appLanguage(window.localStorage.getItem("fcc_lang"));
document.documentElement.lang = initial;

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

export async function setAppLanguage(language: string): Promise<void> {
  const next = appLanguage(language);
  window.localStorage.setItem("fcc_lang", next);
  document.documentElement.lang = next;
  await i18n.changeLanguage(next);
}

export default i18n;
