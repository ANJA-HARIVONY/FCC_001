import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { api, resetCsrfCache } from "./api/client";
import { SessionBanner } from "./components/SessionBanner";
import { ListPagination } from "./components/ListPagination";
import { parsePo } from "../scripts/po-to-json.mjs";
import type { SessionUser } from "./auth/session";

const usuario: SessionUser = { userId: 1, nom: "Ana", role: "usuario", idCiudad: 1, idAgencia: 1 };
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
  it("masque Materiales y Administración a un usuario", () => {
    renderApp(usuario);
    expect(screen.getByRole("link", { name: "Incidencias" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Materiales" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Instalaciones" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Operadores" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
  });

  it("montre Materiales à l'admin et Usuarios au superadmin", () => {
    const { unmount } = renderApp(admin);
    expect(screen.getAllByRole("link", { name: "Materiales" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    unmount();
    renderApp(superadmin);
    expect(screen.getAllByRole("link", { name: "Usuarios" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Trazabilidad" }).length).toBeGreaterThan(0);
  });

  it("répond 403 si un usuario ouvre Usuarios", () => {
    renderApp(usuario, "/usuarios");
    expect(screen.getByRole("heading", { name: "403" })).toBeInTheDocument();
  });

  it("affiche les deux sommaires d'aide sans l'administration pour un usuario", () => {
    renderApp(usuario, "/ayuda");
    expect(document.getElementById("aide-toc")).not.toBeNull();
    expect(document.getElementById("aide-toc-mobile")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Trazabilidad" })).not.toBeInTheDocument();
  });
});

describe("liste et session", () => {
  it("change per_page dans l'URL", async () => {
    renderApp(usuario, "/incidencias");
    await userEvent.selectOptions(screen.getByLabelText("Por página"), "100");
    expect(screen.getByLabelText("Por página")).toHaveValue("100");
  });

  it("n'alerte que dans les deux dernières minutes", () => {
    const { rerender } = render(<SessionBanner remainingMs={60_000} onStay={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Su sesión expirará");
    rerender(<SessionBanner remainingMs={10 * 60_000} onStay={() => {}} />);
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
