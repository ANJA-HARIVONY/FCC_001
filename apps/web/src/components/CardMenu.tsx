import { useState, type ReactNode } from "react";

export function CardMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`dropdown mobile-list-card__menu${open ? " show" : ""}`}>
      <button
        className="btn btn-sm btn-outline-secondary mobile-list-card__menu-btn"
        type="button"
        aria-expanded={open}
        aria-label="Acciones"
        onClick={() => setOpen((value) => !value)}
      >
        <i className="fas fa-ellipsis-v" aria-hidden="true" />
      </button>
      <ul className={`dropdown-menu dropdown-menu-end${open ? " show" : ""}`} onClick={() => setOpen(false)}>
        {children}
      </ul>
    </div>
  );
}
