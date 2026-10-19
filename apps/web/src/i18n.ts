import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: window.localStorage.getItem("fcc_lang") ?? "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

export default i18n;
