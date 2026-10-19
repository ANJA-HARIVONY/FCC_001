import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { api, resetCsrfCache } from "./api/client";
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
    expect(screen.getByRole("link", { name: /Incidencias/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Materiales/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Instalaciones/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Usuarios$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Operadores")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Salir/i }).length).toBeGreaterThan(0);
  });

  it("montre Materiales à l'admin et Usuarios au superadmin", () => {
    const { unmount } = renderApp(admin);
    expect(screen.getAllByRole("link", { name: /Materiales/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /^Usuarios$/i })).not.toBeInTheDocument();
    unmount();
    renderApp(superadmin);
    expect(screen.getAllByRole("link", { name: /^Usuarios$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Trazabilidad/i }).length).toBeGreaterThan(0);
  });

  it("répond 403 si un usuario ouvre Usuarios", () => {
    renderApp(usuario, "/usuarios");
    expect(screen.getByRole("heading", { name: "403" })).toBeInTheDocument();
  });

  it("affiche les deux sommaires d'aide sans l'administration pour un usuario", () => {
    renderApp(usuario, "/ayuda");
    expect(document.getElementById("aide-toc")).not.toBeNull();
    expect(document.getElementById("aide-toc-mobile")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /^Trazabilidad$/i })).not.toBeInTheDocument();
  });
});

describe("liste et session", () => {
  it("change per_page dans l'URL", async () => {
    renderApp(usuario, "/incidencias");
    await userEvent.selectOptions(screen.getByLabelText("Por página"), "100");
    expect(screen.getByLabelText("Por página")).toHaveValue("100");
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

  it("garde la pagination sur une liste vide", () => {
    render(<ListPagination page={1} perPage={75} total={0} onPage={() => {}} onPerPage={() => {}} />);
    expect(screen.getByText("Mostrando 0 a 0 de 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Por página")).toHaveValue("50");
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
