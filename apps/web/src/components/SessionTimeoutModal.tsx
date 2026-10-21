import { SESSION_WARNING_MS } from "@fcc/domain";
import { useTranslation } from "react-i18next";

export function SessionTimeoutModal({
  remainingMs,
  onStay,
  onLogout,
}: {
  remainingMs: number;
  onStay: () => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const open = remainingMs > 0 && remainingMs <= SESSION_WARNING_MS;
  if (!open) {
    return null;
  }
  return (
    <div className="modal fade show d-block" id="session-timeout-modal" tabIndex={-1} role="dialog" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t("Sesión a punto de expirar")}</h5>
          </div>
          <div className="modal-body" role="alert">
            {t("Su sesión expirará en 2 minutos por inactividad.")}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" id="session-logout-now" onClick={onLogout}>
              {t("Cerrar sesión")}
            </button>
            <button type="button" className="btn btn-primary" id="session-stay-connected" onClick={onStay}>
              {t("Seguir conectado")}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </div>
  );
}
