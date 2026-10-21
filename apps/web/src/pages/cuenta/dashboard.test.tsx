import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../App";
import type { SessionUser } from "../../auth/session";

const admin: SessionUser = {
  userId: 1,
  nom: "Ana",
  role: "admin",
  idCiudad: 100,
  idAgencia: 10,
  ciudadNombre: "Malabo",
  agenciaNombre: "Afrimal",
  avatarUrl: null,
};
const usuario: SessionUser = { ...admin, role: "usuario" };
const superadmin: SessionUser = { ...admin, userId: 2, role: "superadmin" };

const instalacion = {
  id: 7,
  fecha: "20/10/2026",
  tipo: "nueva",
  tipo_label: "Nueva",
  estado: "en_curso",
  estado_label: "En curso",
  tecnico: { id: 5, nom: "Luis", avatar_url: null },
  client: { id: 3, nom: "Empresa", adresse: "Calle 1", categoria: "corporativo" },
  direccion: "Calle sitio",
  materiales: "Router x2",
  lineas: [{ nombre: "Router", cantidad: 2 }],
};

function payload(role: SessionUser["role"], instalaciones: unknown[] = [instalacion]) {
  return {
    ok: true,
    period: "current_week",
    period_date_from: "2026-10-01",
    period_date_to: "2026-10-20",
    total: 4,
    solucionadas: 2,
    pendiente: 1,
    bitrix: 1,
    instalaciones_dia: instalaciones,
    por_operador: [{ id: 5, nom: "Luis", count: 3 }],
    clientes: [
      { id: 3, nom: "Empresa", adresse: "Calle 1", categoria: "corporativo", count: 4, intitule: "Sin señal" },
    ],
    apreciacion: { id: 4, texto: "Día normal", fecha: "2026-10-20", ciudad: "Malabo", agencia: "Afrimal" },
    can_edit_apreciacion: role !== "usuario",
    is_admin: role !== "usuario",
    is_superadmin: role === "superadmin",
    ciudades: role === "superadmin" ? [{ id: 200, nombre: "Bata" }, { id: 100, nombre: "Malabo" }] : [],
    agencias: role === "superadmin" ? [{ id: 20, nombre: "Bata Centro", id_ciudad: 200 }] : [],
  };
}

const calls: { url: string; method: string; body: string | null }[] = [];

function mockApi(role: SessionUser["role"], instalaciones?: unknown[]) {
  calls.length = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const body = typeof init?.body === "string" ? init.body : null;
    calls.push({ url, method, body });
    if (url.startsWith("/api/auth/csrf")) {
      return json({ token: "csrf" });
    }
    if (url.startsWith("/api/notificaciones")) {
      return json({ ok: true, unread: 0, items: [] });
    }
    if (url.startsWith("/api/dashboard/serie")) {
      return json({
        ok: true,
        items: [
          {
            date: "20/10",
            fecha: "2026-10-20",
            count: 4,
            solucionadas: 2,
            bitrix: 1,
            apreciacion: "Día normal",
            apreciaciones: [{ texto: "Día normal", ciudad: "Malabo", agencia: "Afrimal" }],
          },
        ],
      });
    }
    if (url.startsWith("/api/dashboard")) {
      return json(payload(role, instalaciones));
    }
    if (url.startsWith("/api/apreciaciones") && method === "GET") {
      return json({ ok: true, id: 4, texto: "Día normal", ciudad: "Malabo", agencia: "Afrimal" });
    }
    if (url.startsWith("/api/apreciaciones") && method === "PUT") {
      return json({ ok: true, id: 4, texto: "Caída de sector", ciudad: "Malabo", agencia: "Afrimal" });
    }
    if (url.startsWith("/api/apreciaciones") && method === "DELETE") {
      return json({ ok: true, fecha: "2026-10-20", texto: null });
    }
    return json({ ok: false, error: "ruta no simulada" }, 404);
  });
}

function json(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

function renderDash(user: SessionUser, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App initialUser={user} now={1_000} />
    </MemoryRouter>,
  );
}

describe("dashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = "dashboard_filters_v1=; path=/; max-age=0";
  });

  it("affiche les KPI, le tableau du jour et les clients, avec les liens de période", async () => {
    mockApi("admin");
    renderDash(admin);
    expect(await screen.findByText("Router x2")).toBeInTheDocument();
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sin señal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Luis").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Calle sitio").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("Cliente corporativo").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Ver todas las incidencias del período" })).toHaveAttribute(
      "href",
      "/incidencias?date_from=2026-10-01&date_to=2026-10-20",
    );
    expect(screen.getByRole("link", { name: "Ver incidencias solucionadas del período" })).toHaveAttribute(
      "href",
      "/incidencias?date_from=2026-10-01&date_to=2026-10-20&status=Solucionadas",
    );
    const clientLinks = screen.getAllByRole("link", { name: "4" });
    expect(clientLinks.length).toBeGreaterThan(0);
    for (const link of clientLinks) {
      expect(link).toHaveAttribute("href", "/incidencias?date_from=2026-10-01&date_to=2026-10-20&search=Empresa");
    }
    expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute("href", "/instalaciones/7");
    expect(screen.queryByRole("button", { name: /^Filtrar$/ })).not.toBeInTheDocument();
  });

  it("un usuario ne voit ni la note ni la création d'installation", async () => {
    mockApi("usuario", []);
    renderDash(usuario);
    expect(await screen.findByText("No hay instalaciones registradas hoy")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Nueva instalación/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nota del día/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver lista" })).not.toBeInTheDocument();
  });

  it("change la période et la vue du graphique", async () => {
    mockApi("admin");
    const user = userEvent.setup();
    renderDash(admin);
    await screen.findByText("Router x2");
    await user.selectOptions(screen.getByLabelText("Período:"), "all_data");
    await waitFor(() => {
      expect(calls.some((call) => call.url.includes("/api/dashboard?") && call.url.includes("period=all_data"))).toBe(true);
    });
    await user.click(screen.getByRole("button", { name: "Por mes" }));
    await waitFor(() => {
      expect(calls.some((call) => call.url.includes("/api/dashboard/serie") && call.url.includes("type=month"))).toBe(true);
    });
    await user.click(screen.getByRole("button", { name: /Barras/ }));
    expect(screen.getByRole("button", { name: /Barras/ })).toHaveClass("active");
  });

  it("ouvre la note du jour, l'enregistre et peut la supprimer", async () => {
    mockApi("admin");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderDash(admin);
    await screen.findByText("Router x2");
    await user.click(screen.getByRole("button", { name: /Nota del día/i }));
    const dialog = await screen.findByRole("dialog");
    const fecha = (within(dialog).getByLabelText("Fecha") as HTMLInputElement).value;
    expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await within(dialog).findByText(/Se guarda en Malabo · Afrimal/)).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText("Nota"));
    await user.type(within(dialog).getByLabelText("Nota"), "Caída de sector");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => {
      const put = calls.find((call) => call.method === "PUT" && call.url.startsWith("/api/apreciaciones"));
      expect(put?.body).toContain("Caída de sector");
    });
    await user.click(screen.getByRole("button", { name: /Nota del día/i }));
    const again = await screen.findByRole("dialog");
    await user.click(within(again).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => {
      expect(calls.some((call) => call.method === "DELETE" && call.url.includes(`fecha=${fecha}`))).toBe(true);
    });
  });

  it("le superadmin applique le filtre ciudad et agencia", async () => {
    mockApi("superadmin");
    const user = userEvent.setup();
    renderDash(superadmin);
    await screen.findByRole("button", { name: /^Filtrar$/ });
    await user.click(screen.getByRole("button", { name: /^Filtrar$/ }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText("Ciudad"), "200");
    await user.selectOptions(within(dialog).getByLabelText("Agencia"), "20");
    await user.click(within(dialog).getByRole("button", { name: "Aplicar" }));
    await waitFor(() => {
      expect(
        calls.some(
          (call) =>
            call.url.includes("/api/dashboard?") &&
            call.url.includes("ciudad=200") &&
            call.url.includes("agencia=20"),
        ),
      ).toBe(true);
    });
    expect(await screen.findByText("Bata · Bata Centro")).toBeInTheDocument();
  });
});
