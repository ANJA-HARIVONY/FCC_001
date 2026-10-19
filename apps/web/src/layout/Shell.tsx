import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { SessionBanner } from "../components/SessionBanner";
import { useSession } from "../auth/session";
import { Sidebar } from "./Sidebar";

export function Shell() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const user = session.user;
  if (!user) {
    return null;
  }
  const remaining = session.remainingMs;
  return (
    <div className="d-flex min-vh-100">
      <aside className="d-none d-lg-block border-end bg-white p-3" style={{ width: 240 }}>
        <div className="fw-semibold mb-3">FCC_001</div>
        <Sidebar role={user.role} onLogout={() => void session.logout()} />
      </aside>
      <div className="flex-grow-1 d-flex flex-column">
        <header className="border-bottom bg-white px-3 py-2 d-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm d-lg-none" onClick={() => setOpen((value) => !value)}>
            Menú
          </button>
          <span className="ms-auto small">{user.nom}</span>
          <LanguageSelect />
        </header>
        {open ? (
          <div className="d-lg-none border-bottom bg-white p-3">
            <Sidebar role={user.role} onLogout={() => void session.logout()} onNavigate={() => setOpen(false)} />
          </div>
        ) : null}
        <SessionBanner remainingMs={remaining} onStay={() => void session.stay()} />
        <main className="container-fluid py-3 flex-grow-1">
          <Outlet />
        </main>
        <footer className="border-top small text-secondary px-3 py-2">Atención al Cliente</footer>
      </div>
    </div>
  );
}

function LanguageSelect() {
  const { i18n } = useTranslation();
  return (
    <label className="small mb-0">
      <span className="visually-hidden">Idioma</span>
      <select
        className="form-select form-select-sm"
        value={i18n.resolvedLanguage ?? "es"}
        aria-label="Idioma"
        onChange={(event) => {
          const lang = event.target.value;
          void i18n.changeLanguage(lang);
          document.documentElement.lang = lang;
          window.localStorage.setItem("fcc_lang", lang);
        }}
      >
        <option value="es">ES</option>
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
