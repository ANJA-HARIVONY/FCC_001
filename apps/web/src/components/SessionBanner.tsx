import { SESSION_WARNING_MS } from "@fcc/domain";

export function SessionBanner({ remainingMs, onStay }: { remainingMs: number; onStay: () => void }) {
  if (remainingMs <= 0 || remainingMs > SESSION_WARNING_MS) {
    return null;
  }
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return (
    <div className="alert alert-warning mb-0 rounded-0" role="alert">
      Su sesión expirará en {minutes} min.
      <button type="button" className="btn btn-sm btn-warning ms-2" onClick={onStay}>
        Continuar
      </button>
    </div>
  );
}
