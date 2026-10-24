import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../App";
import { resetCsrfCache } from "../../api/client";
import type { SessionUser } from "../../auth/session";

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

const options = {
  ok: true,
  tecnicos: [
    { id: 4, nom: "Luis Taller", telephone: "222111", agencia: "Afrimal", ciudad: "Malabo" },
  ],
  clients: [
    {
      id: 7,
      nom: "Cliente Norte",
      telephone: "555000",
      ville: "Centro",
      adresse: "Calle 1",
      categoria: "particular",
    },
  ],
  materiales: [{ id: 3, nombre: "Router", modelo: "X1", tipo: "material_cliente" }],
};

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderForm(path = "/instalaciones/nueva") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App initialUser={admin} now={1_000} />
    </MemoryRouter>,
  );
}

describe("Nueva instalación", () => {
  beforeEach(() => {
    resetCsrfCache();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      if (url.includes("/api/auth/csrf")) {
        return jsonResponse({ token: "csrf" });
      }
      if (url.includes("/api/incidents-pendientes")) {
        return jsonResponse({ success: true, notifications: [] });
      }
      if (url.includes("/api/instalaciones/options")) {
        return jsonResponse(options);
      }
      if (method === "POST" && url.endsWith("/api/instalaciones")) {
        return jsonResponse({ ok: true, item: { id: 90 } });
      }
      if (url.includes("/api/instalaciones/12")) {
        return jsonResponse({
          ok: true,
          item: {
            id: 12,
            fecha: "2026-10-21",
            tipo: "nueva",
            tipo_label: "Nueva",
            estado: "en_curso",
            estado_label: "En curso",
            tecnico: { id: 4, nom: "Luis Taller" },
            client: { id: 7, nom: "Cliente Norte", telephone: "555000", adresse: "Calle 1", ville: "Centro" },
            observaciones: "Nota",
            materiales: "—",
            materiales_lineas: [],
            can_delete: true,
            id_sitio: 1,
            id_sitio_origen: null,
            terminada_le: null,
            sitio: null,
            salidas: [],
            traslado_lineas: [],
          },
        });
      }
      return jsonResponse({ ok: false, error: "no mock" }, 500);
    });
  });

  it("exige un técnico et ignore une ligne sans matériel", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(await screen.findByRole("heading", { name: "Nueva instalación" })).toBeInTheDocument();
    expect(screen.getByText(/Material entregado/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Material" })).toBeInTheDocument();
    expect(screen.getByText(/Para un cambio de dirección use/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Seleccione un técnico.");

    await user.type(screen.getByLabelText(/Técnico/), "Lu");
    await user.click(await screen.findByRole("button", { name: /Luis Taller/ }));
    await user.type(screen.getByLabelText(/^Cliente/), "Cl");
    await user.click(await screen.findByRole("button", { name: /Cliente Norte/ }));

    await user.click(screen.getByRole("button", { name: "Añadir línea" }));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("combobox", { name: "Material" })).toHaveLength(2);
    await user.click(within(table).getAllByRole("button", { name: "Quitar" })[0]!);
    expect(within(table).getAllByRole("combobox", { name: "Material" })).toHaveLength(1);
    await user.click(within(table).getByRole("button", { name: "Quitar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Debe haber al menos una línea.");

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const post = vi.mocked(fetch).mock.calls.find((call) => {
      const init = call[1];
      return String(call[0]).endsWith("/api/instalaciones") && (init?.method ?? "").toUpperCase() === "POST";
    });
    expect(post).toBeTruthy();
    const body = JSON.parse(String(post?.[1]?.body)) as { lineas: unknown[]; id_tecnico: number; id_client: number };
    expect(body.id_tecnico).toBe(4);
    expect(body.id_client).toBe(7);
    expect(body.lineas).toEqual([]);
  });

  it("fige le client à l'édition et masque le matériel", async () => {
    renderForm("/instalaciones/12/editar");
    expect(await screen.findByRole("heading", { name: "Modificar instalación #12" })).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.getByText("(no modificable)")).toBeInTheDocument();
    expect(screen.queryByText(/Material entregado/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Cliente/)).not.toBeInTheDocument();
  });
});
