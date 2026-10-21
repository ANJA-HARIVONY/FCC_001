import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";

import { SessionTimeoutModal } from "../components/SessionTimeoutModal";
import { PendienteToasts } from "./PendienteToasts";
import { useSession } from "../auth/session";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export interface PageMeta {
  icon?: ReactNode;
  title?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}

interface ShellOutlet {
  setPageMeta: (meta: PageMeta) => void;
}

const PageMetaContext = createContext<ShellOutlet>({ setPageMeta: () => undefined });

export function usePageMeta(meta: PageMeta): void {
  const { setPageMeta } = useContext(PageMetaContext);
  useEffect(() => {
    setPageMeta(meta);
    return () => setPageMeta({});
  }, [setPageMeta, meta.icon, meta.title, meta.subtitle, meta.actions]);
}

export function Shell() {
  const session = useSession();
  const user = session.user;
  const [pageMeta, setPageMeta] = useState<PageMeta>({});
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const outlet = useMemo(() => ({ setPageMeta }), []);

  useEffect(() => {
    document.body.classList.add("has-sidebar", "app-layout-v2", "app-theme-connexia", "fixed-sidebar", "fixed-header");
    document.body.classList.remove("login-page");
    return () => {
      document.body.classList.remove("has-sidebar", "closed-sidebar", "sidebar-mobile-open");
    };
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 992px)").matches;
    document.body.classList.toggle("closed-sidebar", collapsed && desktop);
    document.body.classList.toggle("sidebar-mobile-open", mobileOpen && !desktop);
    localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed, mobileOpen]);

  if (!user) {
    return null;
  }

  function toggleSidebar() {
    if (window.matchMedia("(min-width: 992px)").matches) {
      setCollapsed((value) => !value);
    } else {
      setMobileOpen((value) => !value);
    }
  }

  return (
    <div className="app-container">
      <Header user={user} onToggleSidebar={toggleSidebar} onLogout={() => void session.logout()} />
      <div className="app-main">
        <Sidebar role={user.role} onLogout={() => void session.logout()} />
        <div className="app-main__outer">
          <div className="app-main__inner">
            <div className="app-page-title">
              <div className="page-title-wrapper">
                <div className="page-title-heading">
                  <div className="page-title-icon">{pageMeta.icon}</div>
                  <div className="page-title-copy">
                    <div className="page-title-text">{pageMeta.title}</div>
                    <div className="page-title-subheading">{pageMeta.subtitle}</div>
                  </div>
                </div>
                <div className="page-title-actions">{pageMeta.actions}</div>
              </div>
            </div>
            <main className="app-main__content page-enter">
              <PageMetaContext.Provider value={outlet}>
                <Outlet />
              </PageMetaContext.Provider>
            </main>
          </div>
          <Footer />
        </div>
      </div>
      <div className="sidebar-mobile-overlay" aria-hidden="true" onClick={() => setMobileOpen(false)} />
      <PendienteToasts />
      <SessionTimeoutModal
        remainingMs={session.remainingMs}
        onStay={() => void session.stay()}
        onLogout={() => void session.logout()}
      />
    </div>
  );
}
