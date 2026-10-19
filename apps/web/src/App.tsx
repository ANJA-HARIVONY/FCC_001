import { Component, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { SessionProvider, useSession, type SessionUser } from "./auth/session";
import { Shell } from "./layout/Shell";
import { AyudaPage } from "./pages/AyudaPage";
import { IncidenciasPage, PlaceholderPage } from "./pages/PlaceholderPage";
import { LoginPage } from "./pages/LoginPage";
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from "./pages/StatusPages";
import { canAccessPath } from "./routes";

export function App({ initialUser = null, now }: { initialUser?: SessionUser | null; now?: number }) {
  return (
    <SessionProvider initialUser={initialUser} now={now}>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Shell />}>
              <Route element={<RequireRole />}>
                <Route path="/" element={<PlaceholderPage title="Dashboard" />} />
                <Route path="/incidencias" element={<IncidenciasPage />} />
                <Route path="/clientes" element={<PlaceholderPage title="Clientes" />} />
                <Route path="/informes" element={<PlaceholderPage title="Informes" />} />
                <Route path="/materiales" element={<PlaceholderPage title="Materiales" />} />
                <Route path="/instalaciones" element={<PlaceholderPage title="Instalaciones" />} />
                <Route path="/usuarios" element={<PlaceholderPage title="Usuarios" />} />
                <Route path="/trazabilidad" element={<PlaceholderPage title="Trazabilidad" />} />
                <Route path="/base-de-datos" element={<PlaceholderPage title="Base de datos" />} />
                <Route path="/perfil" element={<PlaceholderPage title="Perfil" />} />
                <Route path="/ayuda" element={<AyudaRoute />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </SessionProvider>
  );
}

function RequireAuth() {
  const session = useSession();
  const location = useLocation();
  if (session.loading) {
    return <p className="p-3">Cargando…</p>;
  }
  if (!session.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

function RequireRole() {
  const session = useSession();
  const { pathname } = useLocation();
  if (!session.user || !canAccessPath(session.user.role, pathname)) {
    return <ForbiddenPage />;
  }
  return <Outlet />;
}

function AyudaRoute() {
  const session = useSession();
  return <AyudaPage role={session.user?.role ?? "usuario"} />;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <ServerErrorPage />;
    }
    return this.props.children;
  }
}
