import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../App";
import { resetCsrfCache } from "../../api/client";
import type { SessionUser } from "../../auth/session";
import type { InstalacionDetail } from "./types";

const admin: SessionUser = {
  userId: 1,
  nom: "Ana",
  role: "admin",
  idCiudad: 1,
  idAgencia: 1,
  ciudadNombre: "Malabo",
  agenciaNombre: "Afrimal",
  avatarUrl: null,
};

function detail(overrides: Partial<InstalacionDetail> = {}): InstalacionDetail {
  return {
    id: 299,
    fecha: "2026-10-21",
    tipo: "nueva",
    tipo_label: "Nueva",
    estado: "en_curso",
    estado_label: "En curso",
    tecnico: { id: 4, nom: "Luis Taller" },
    client: { id: 7, nom: "Cliente Norte", telephone: "555", adresse: "Calle 1", ville: "Centro" },
    materiales: "Router x1",
    materiales_lineas: ["Router x1"],
    can_delete: true,
    observaciones: "Revisar antena",
    id_sitio: 3,
    id_sitio_origen: null,
    fecha_registro: "2026-10-21T09:15:00.000Z",
    fecha_modificacion: null,
    terminada_le: null,
    registrado_por: { id: 1, nom: "Ana" },
    modificado_por: null,
    terminada_por: null,
    sitio: {
      id: 3,
      adresse: "Calle 1",
      ville: "Centro",
      activo: true,
      google_maps_url: "https://www.google.com/maps?q=3.75,8.78",
    },
    sitio_origen: null,
    salidas: [
      {
        id: 40,
        fecha: "2026-10-21",
        tecnico: { id: 4, nom: "Luis Taller" },
        lineas: [{ id: 1, id_material: 3, cantidad: 1, material: { nombre: "Router", modelo: "X1" } }],
      },
    ],
    traslado_lineas: [],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderFiche(path = "/instalaciones/299") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App initialUser={admin} now={1_000} />
    </MemoryRouter>,
  );
}

describe("Fiche instalación", () => {
  beforeEach(() => {
    resetCsrfCache();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/incidents-pendientes")) {
        return jsonResponse({ success: true, notifications: [] });
      }
      if (url.endsWith("/api/instalaciones/299")) {
        return jsonResponse({ ok: true, item: detail() });
      }
      return jsonResponse({ ok: false, error: "no mock" }, 500);
    });
  });

  it("affiche la date, le lien Maps et la salida", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    renderFiche();
    expect(await screen.findByRole("heading", { name: "Información general" })).toBeInTheDocument();
    expect(screen.getAllByText("21/10/2026").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Cliente Norte" })).toHaveAttribute("href", "/clientes/7");
    expect(screen.getByRole("link", { name: /Ver en Google Maps/ })).toHaveAttribute(
      "href",
      "https://www.google.com/maps?q=3.75,8.78",
    );
    expect(screen.getByText("Revisar antena")).toBeInTheDocument();
    expect(screen.getByText(/Router x1/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute("href", "/materiales/salidas/40");

    await user.click(await screen.findByRole("button", { name: /Copiar información/ }));
    expect(writeText).toHaveBeenCalledWith("Cliente Norte\nRouter x1\nLuis Taller");
    expect(await screen.findByRole("status")).toHaveTextContent("copiada al portapapeles");

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Las salidas de material vinculadas también se eliminarán.");
    expect(screen.getByText("Esta acción es irreversible.")).toBeInTheDocument();
  });

  it("masque Eliminar pour un traslado et montre le matériel existant", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/incidents-pendientes")) {
        return jsonResponse({ success: true, notifications: [] });
      }
      return jsonResponse({
        ok: true,
        item: detail({
          tipo: "traslado",
          tipo_label: "Traslado",
          can_delete: false,
          salidas: [],
          sitio_origen: { id: 2, adresse: "Calle vieja", ville: "Norte" },
          traslado_lineas: [
            { id: 8, id_material: 3, cantidad: 2, accion: "reutilizado", material: { nombre: "Router", modelo: null } },
          ],
        }),
      });
    });
    renderFiche();
    expect(await screen.findByText("Dirección de origen:")).toBeInTheDocument();
    expect(screen.getByText("Calle vieja — Norte")).toBeInTheDocument();
    expect(screen.getByText("Reutilizado")).toBeInTheDocument();
    expect(screen.getByText("No hay salidas de material para esta instalación.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Terminar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });
});
