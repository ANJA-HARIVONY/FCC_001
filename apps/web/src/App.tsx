import { Component, useEffect, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { SessionProvider, useSession, type SessionUser } from "./auth/session";
import { Shell } from "./layout/Shell";
import { AyudaPage } from "./pages/AyudaPage";
import { ClientCreatePage, ClientEditPage } from "./pages/clientes/ClientFormPage";
import { ClientDetailPage } from "./pages/clientes/ClientDetailPage";
import { ClientPrintPage } from "./pages/clientes/ClientPrintPage";
import { ClientVerifyPage } from "./pages/clientes/ClientVerifyPage";
import { ClientsListPage } from "./pages/clientes/ClientsListPage";
import { IncidentCreatePage, IncidentEditPage } from "./pages/incidencias/IncidentFormPage";
import { IncidentDetailPage } from "./pages/incidencias/IncidentDetailPage";
import { IncidentsListPage } from "./pages/incidencias/IncidentsListPage";
import { InstalacionCreatePage, InstalacionEditPage } from "./pages/instalaciones/InstalacionFormPage";
import { InstalacionDetailPage } from "./pages/instalaciones/InstalacionDetailPage";
import { InstalacionesListPage } from "./pages/instalaciones/InstalacionesListPage";
import { TrasladoPage } from "./pages/instalaciones/TrasladoPage";
import { CatalogoPage } from "./pages/materiales/CatalogoPage";
import { MaterialInformePage } from "./pages/materiales/MaterialInformePage";
import { MaterialesHubPage } from "./pages/materiales/MaterialesHubPage";
import { SalidaCreatePage, SalidaEditPage } from "./pages/materiales/SalidaFormPage";
import { SalidaDetailPage } from "./pages/materiales/SalidaDetailPage";
import { SalidasListPage } from "./pages/materiales/SalidasListPage";
import { TecnicoFichaPage } from "./pages/materiales/TecnicoFichaPage";
import { InformeDetailPage } from "./pages/informes/InformeDetailPage";
import { InformeGeneratePage } from "./pages/informes/InformeGeneratePage";
import { InformesHubPage } from "./pages/informes/InformesHubPage";
import { DatabasePage, TrazabilidadPage } from "./pages/cuenta/AdminPages";
import { BusquedaPage } from "./pages/cuenta/BusquedaPage";
import { DashboardPage } from "./pages/cuenta/DashboardPage";
import { FichaPage } from "./pages/cuenta/FichaPage";
import { PerfilPage } from "./pages/cuenta/PerfilPage";
import { UsuarioFormPage, UsuariosListPage } from "./pages/cuenta/UsuariosPage";
import { LoginPage } from "./pages/LoginPage";
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from "./pages/StatusPages";
import { canAccessPath } from "./routes";
import { isAdmin } from "@fcc/domain";

export function App({ initialUser = null, now }: { initialUser?: SessionUser | null; now?: number }) {
  return (
    <SessionProvider initialUser={initialUser} now={now}>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<RequireAuth />}>
            <Route path="/clientes/:id/imprimir" element={<ClientPrintPage />} />
            <Route element={<Shell />}>
              <Route element={<RequireRole />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/incidencias" element={<IncidentsListPage />} />
                <Route path="/incidencias/nueva" element={<IncidentCreatePage />} />
                <Route path="/incidencias/:id" element={<IncidentDetailPage />} />
                <Route path="/incidencias/:id/editar" element={<IncidentEditPage />} />
                <Route path="/clientes" element={<ClientsListPage />} />
                <Route path="/clientes/nuevo" element={<ClientCreatePage />} />
                <Route path="/clientes/:id" element={<ClientDetailPage />} />
                <Route path="/clientes/:id/verificar" element={<ClientVerifyPage />} />
                <Route path="/clientes/:id/editar" element={<ClientEditPage />} />
                <Route path="/clientes/:id/traslado" element={<AdminOnlyTraslado />} />
                <Route path="/informes" element={<InformesHubPage />} />
                <Route path="/informes/nuevo" element={<InformeGeneratePage />} />
                <Route path="/informes/:id" element={<InformeDetailPage />} />
                <Route path="/materiales" element={<MaterialesHubPage />} />
                <Route path="/materiales/informe" element={<MaterialInformePage />} />
                <Route path="/materiales/catalogo" element={<CatalogoPage />} />
                <Route path="/materiales/salidas" element={<SalidasListPage />} />
                <Route path="/materiales/salidas/nueva" element={<SalidaCreatePage />} />
                <Route path="/materiales/salidas/:id" element={<SalidaDetailPage />} />
                <Route path="/materiales/salidas/:id/editar" element={<SalidaEditPage />} />
                <Route path="/instalaciones" element={<InstalacionesListPage />} />
                <Route path="/instalaciones/nueva" element={<InstalacionCreatePage />} />
                <Route path="/instalaciones/:id" element={<InstalacionDetailPage />} />
                <Route path="/instalaciones/:id/editar" element={<InstalacionEditPage />} />
                <Route path="/usuarios" element={<UsuariosListPage />} />
                <Route path="/usuarios/nuevo" element={<UsuarioFormPage />} />
                <Route path="/usuarios/:id/editar" element={<UsuarioFormPage />} />
                <Route path="/atencion-cliente/:id/ficha" element={<FichaPage />} />
                <Route path="/tecnicos/:id/ficha" element={<TecnicoFichaPage />} />
                <Route path="/trazabilidad" element={<TrazabilidadPage />} />
                <Route path="/base-de-datos" element={<DatabasePage />} />
                <Route path="/perfil" element={<PerfilPage />} />
                <Route path="/buscar" element={<BusquedaPage />} />
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

function LoginRoute() {
  useEffect(() => {
    document.body.className = "login-page";
    return () => {
      document.body.className = "app-layout-v2 app-theme-connexia fixed-sidebar fixed-header";
    };
  }, []);
  return <LoginPage />;
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

function AdminOnlyTraslado() {
  const session = useSession();
  if (!isAdmin(session.user?.role)) {
    return <ForbiddenPage />;
  }
  return <TrasladoPage />;
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
