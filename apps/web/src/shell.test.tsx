import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { api, resetCsrfCache } from "./api/client";
import { setAppLanguage } from "./i18n";
import { SessionTimeoutModal } from "./components/SessionTimeoutModal";
import { ListPagination } from "./components/ListPagination";
import { parsePo } from "../scripts/po-to-json.mjs";
import type { SessionUser } from "./auth/session";

const usuario: SessionUser = {
  userId: 1,
  nom: "Ana",
  role: "usuario",
  idCiudad: 1,
  idAgencia: 1,
  ciudadNombre: "Malabo",
  agenciaNombre: "Afrimal",
  avatarUrl: null,
};
const admin: SessionUser = { ...usuario, role: "admin" };
const superadmin: SessionUser = { ...usuario, role: "superadmin" };

function renderApp(user: SessionUser, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App initialUser={user} now={1_000} />
    </MemoryRouter>,
  );
}

describe("navigation", () => {
  it("masque Materiales y Administración a un usuario et reprend le shell Flask", () => {
    renderApp(usuario);
    expect(screen.getByLabelText("Navegación principal")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent("Registro de Atención al cliente");
    expect(screen.getByRole("banner")).toHaveTextContent("Afrimal / Malabo");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("CONNEXIA");
    expect(within(screen.getByLabelText("Navegación principal")).getByRole("link", { name: /Incidencias/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Período:")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Semana en curso" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Todos los datos" })).toBeInTheDocument();
    expect(screen.getByText("Total de Registrados")).toBeInTheDocument();
    expect(screen.getByText("Evolución de las incidencias")).toBeInTheDocument();
    expect(screen.getByText("Instalaciones del día")).toBeInTheDocument();
    expect(screen.getByText("5 Clientes Recurrentes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nota del día/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Filtrar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Materiales/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Instalaciones/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Usuarios$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Operadores")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Salir/i }).length).toBeGreaterThan(0);
  });

  it("montre Materiales à l'admin et Usuarios au superadmin", () => {
    const { unmount } = renderApp(admin);
    expect(screen.getByRole("button", { name: /Nota del día/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Materiales/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /^Usuarios$/i })).not.toBeInTheDocument();
    unmount();
    renderApp(superadmin);
    expect(screen.getByRole("button", { name: /^Filtrar$/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Usuarios$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Trazabilidad/i }).length).toBeGreaterThan(0);
  });

  it("ouvre le hub Materiales pour un admin", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, total_materiales: 3, total_salidas: 5 }),
    } as Response);
    renderApp(admin, "/materiales");
    expect(await screen.findByText("Catálogo")).toBeInTheDocument();
    expect(screen.getByText(/3 materiales en el catálogo/)).toBeInTheDocument();
  });

  it("ouvre le hub Informes pour un usuario", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        items: [],
        total: 0,
        hoy: 0,
        types: [
          {
            id: "summary",
            nom: "Estado General",
            description: "Totales",
            icon: "fa-chart-line",
            kpi: "registered",
          },
        ],
      }),
    } as Response);
    renderApp(usuario, "/informes");
    expect(await screen.findByText("Informes Recientes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nuevo Informe/i })).toBeInTheDocument();
  });

  it("ouvre la liste Instalaciones pour un admin", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        items: [],
        page: 1,
        pages: 1,
        per_page: 50,
        total: 0,
        filters: { search: "", tecnico: "", estado: "", tipo: "", date_from: "", date_to: "" },
        meta: { tecnicos: [], estados: [], tipos: [] },
      }),
    } as Response);
    renderApp(admin, "/instalaciones");
    expect(await screen.findByText("Lista de instalaciones")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nueva instalación/i })).toBeInTheDocument();
  });

  it("répond 403 si un usuario ouvre Usuarios", () => {
    renderApp(usuario, "/usuarios");
    expect(screen.getByRole("heading", { name: "403" })).toBeInTheDocument();
  });

  it("répond 403 si un usuario ouvre l'informe de materiales ou la ficha técnico", () => {
    const { unmount } = renderApp(usuario, "/materiales/informe");
    expect(screen.getByRole("heading", { name: "403" })).toBeInTheDocument();
    unmount();
    renderApp(usuario, "/tecnicos/4/ficha");
    expect(screen.getByRole("heading", { name: "403" })).toBeInTheDocument();
  });

  it("autorise les sous-routes Clientes au usuario", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [{ id: 1, nombre: "Malabo" }] }),
    } as Response);
    renderApp(usuario, "/clientes/nuevo");
    expect(screen.queryByRole("heading", { name: "403" })).not.toBeInTheDocument();
    expect(await screen.findByText("Datos del Cliente")).toBeInTheDocument();
  });

  it("affiche les deux sommaires d'aide sans l'administration pour un usuario", () => {
    renderApp(usuario, "/ayuda");
    expect(document.getElementById("aide-toc")).not.toBeNull();
    expect(document.getElementById("aide-toc-mobile")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /^Trazabilidad$/i })).not.toBeInTheDocument();
  });
});

describe("liste et session", () => {
  it("charge la liste Incidencias avec filtres Flask", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        items: [],
        page: 1,
        pages: 1,
        per_page: 50,
        total: 0,
        counts: { corporativo: 0, particular: 0 },
        filters: { search: "", status: "", bitrix_status: "", operateur: "", ciudad: "", agencia: "", date_from: "", date_to: "", sort: "fecha", order: "desc" },
        meta: { operateurs: [], ciudades: [{ id: 1, nombre: "Malabo" }], agencias: [{ id: 1, nombre: "Afrimal", id_ciudad: 1 }] },
      }),
    } as Response);
    renderApp(usuario, "/incidencias");
    expect(await screen.findByText("Filtros de búsqueda")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nueva Incidencia/i })).toBeInTheDocument();
  });

  it("ouvre la modale de session dans les deux dernières minutes", () => {
    const { rerender } = render(
      <SessionTimeoutModal remainingMs={60_000} onStay={() => {}} onLogout={() => {}} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Su sesión expirará en 2 minutos");
    expect(screen.getByRole("button", { name: "Seguir conectado" })).toBeInTheDocument();
    rerender(<SessionTimeoutModal remainingMs={10 * 60_000} onStay={() => {}} onLogout={() => {}} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("numérote les pages comme Flask et masque une seule page", () => {
    const { rerender } = render(
      <ListPagination page={1} perPage={50} total={0} noun="clientes" onPage={() => {}} />,
    );
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
    rerender(<ListPagination page={5} perPage={50} total={5450} noun="clientes" onPage={() => {}} />);
    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("109")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 201 a 250 de 5450 clientes")).toBeInTheDocument();
    rerender(<ListPagination page={2} perPage={50} total={120} variant="compact" onPage={() => {}} />);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });
});

describe("langue", () => {
  it("garde l'espagnol au départ, passe la coquille en français et conserve le choix", async () => {
    localStorage.removeItem("fcc_lang");
    await setAppLanguage("es");
    const user = userEvent.setup();
    renderApp(usuario);
    expect(screen.getByRole("banner")).toHaveTextContent("Registro de Atención al cliente");
    expect(screen.getAllByText("Pendientes").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Solucionadas/).length).toBeGreaterThan(0);
    expect(screen.queryByText("En attente")).not.toBeInTheDocument();
    expect(screen.queryByText("Résolues")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Idioma" }), "fr");
    expect(localStorage.getItem("fcc_lang")).toBe("fr");
    expect(screen.getByRole("banner")).toHaveTextContent("Registre du service client");
    expect(screen.getAllByRole("link", { name: /Quitter/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pendientes").length).toBeGreaterThan(0);
    expect(screen.queryByText("En attente")).not.toBeInTheDocument();
    expect(screen.queryByText("Résolues")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Langue" }), "es");
    expect(screen.getByRole("banner")).toHaveTextContent("Registro de Atención al cliente");
    expect(screen.getAllByRole("link", { name: /^Salir$/i }).length).toBeGreaterThan(0);
    await setAppLanguage("es");
  });
});

describe("client HTTP et catalogues", () => {
  it("envoie le cookie et le jeton CSRF, et remonte l'erreur espagnole", async () => {
    resetCsrfCache();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/csrf")) {
        return new Response(JSON.stringify({ token: "abc" }), { status: 200 });
      }
      expect(init?.credentials).toBe("include");
      expect(new Headers(init?.headers).get("X-CSRFToken")).toBe("abc");
      return new Response(JSON.stringify({ error: "Cuenta desactivada." }), { status: 403 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(api("/api/auth/login", { method: "POST", body: "{}" })).rejects.toThrow("Cuenta desactivada.");
    vi.unstubAllGlobals();
  });

  it("reprend le msgid espagnol quand msgstr est vide", () => {
    const catalog = parsePo('msgid "Cuenta desactivada."\nmsgstr ""\n');
    expect(catalog["Cuenta desactivada."]).toBe("Cuenta desactivada.");
  });
});
