import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="app-footer" role="contentinfo">
      <div
        className="app-footer__inner"
        style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}
      >
        <p className="app-footer__copy mb-1">
          &copy; 2026 CONNEXIA - {t("Registro de Atención al cliente")} - {t("Reservados todos los derechos")}
        </p>
        <p className="app-footer__meta mb-0">
          {t("Teléfono")}: 222 304 981 · Email: anjaharivoni@gmail.com | jefe.incidencias@conexxiaeg.com
        </p>
        <p className="app-footer__version mb-0">{t("Versión")} 2.0.0</p>
      </div>
    </footer>
  );
}
