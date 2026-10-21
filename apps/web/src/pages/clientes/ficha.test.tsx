import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetCsrfCache } from "../../api/client";
import { SessionProvider, type SessionUser } from "../../auth/session";
import { Shell } from "../../layout/Shell";
import { ClientDetailPage } from "./ClientDetailPage";
import type { ClientFichaResponse } from "./types";

const user: SessionUser = {
  userId: 1,
  nom: "Ana",
  role: "usuario",
  idCiudad: 1,
  idAgencia: 1,
  ciudadNombre: "Malabo",
  agenciaNombre: "Afrimal",
  avatarUrl: null,
};

const ficha: ClientFichaResponse = {
  ok: true,
  radius_enabled: true,
  max_fotos: 10,
  item: {
    id: 7,
    nom: "014000 YOSYP",
    telephone: "222",
    adresse: "Calle 1",
    ville: "Centro",
    ip_router: "10.0.0.1",
    ip_antea: "10.0.0.2",
    username_radius: "014000",
    id_ciudad: 1,
    categoria: "corporativo",
    latitud: 3.75,
    longitud: 8.78,
    ciudad: { id: 1, nombre: "Malabo" },
    incidencias: 1,
    sitio_activo_id: 3,
    cree_par: "Ana",
    modifie_par: null,
    modifie_le: null,
    gps_actualizado_le: null,
    gps_actualizado_por: null,
  },
  stats: { total: 1, solucionadas: 0, pendientes: 1, bitrix: 0 },
  incidencias: [
    {
      id: 9,
      intitule: "Sin internet",
      observations: "Revisar antena",
      status: "Pendiente",
      ref_bitrix: null,
      date_heure: "2026-10-20T10:00:00",
      operateur: "Ana",
    },
  ],
  fotos: [],
  sitios_anteriores: [],
  instalaciones: [],
  materiales: [],
  radius: {
    status: "ok",
    from_cache: true,
    cache_age_minutes: 2,
    data: {
      account_status: "enabled",
      account_status_label: "Enabled / Activo",
      connection_status: "offline",
      connection_status_label: "Offline / Desconectado",
      online: false,
      expiry: "31/12/2026",
      days_remaining: 72,
      srvname: "Prepago 2Mbps",
    },
  },
};

function renderFicha(role: string) {
  return render(
    <MemoryRouter initialEntries={["/clientes/7"]}>
      <SessionProvider initialUser={{ ...user, role }} now={1_000}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/clientes/:id" element={<ClientDetailPage />} />
          </Route>
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe("ficha del cliente", () => {
  beforeEach(() => {
    resetCsrfCache();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const body = url.includes("/ficha") ? ficha : { ok: true, unread: 0, items: [] };
      return { ok: true, status: 200, json: async () => body } as Response;
    });
  });

  it("affiche l'historique, RADIUS et Verificar", async () => {
    renderFicha("usuario");
    expect(await screen.findByText("Historial de las Incidencias")).toBeInTheDocument();
    expect(screen.getAllByText("Sin internet").length).toBeGreaterThan(0);
    expect(screen.getByText("Información RADIUS")).toBeInTheDocument();
    expect(screen.queryByText("Monitoreo Zabbix")).not.toBeInTheDocument();
    expect(screen.getByText("Prepago 2Mbps")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Verificar/i })).toHaveAttribute("href", "/clientes/7/verificar");
    expect(screen.getByRole("link", { name: /Imprimir PDF/i })).toHaveAttribute("href", "/clientes/7/imprimir");
    expect(screen.queryByRole("button", { name: /Guardar GPS/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Nueva instalación")).not.toBeInTheDocument();
  });

  it("montre GPS, fotos et instalaciones à l'admin", async () => {
    renderFicha("admin");
    expect(await screen.findByRole("button", { name: /Guardar GPS/i })).toBeInTheDocument();
    expect(screen.getByText(/Hasta 10 fotos/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nueva instalación/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Traslado/i })).toBeInTheDocument();
  });
});
