import { useTranslation } from "react-i18next";

import { APP_LANGUAGES, appLanguage, setAppLanguage } from "../i18n";

export function LanguageSwitch() {
  const { i18n, t } = useTranslation();
  const current = appLanguage(i18n.resolvedLanguage ?? i18n.language);

  return (
    <select
      className="lang-select"
      aria-label={t("Idioma")}
      value={current}
      onChange={(event) => void setAppLanguage(event.target.value)}
    >
      {APP_LANGUAGES.map((language) => (
        <option key={language} value={language}>
          {language.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
