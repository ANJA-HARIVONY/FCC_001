import { isAdmin, isSuperadmin } from "@fcc/domain";

import { usePageMeta } from "../layout/Shell";

const SECTIONS = [
  { id: "inicio", title: "Dashboard", level: "all" },
  { id: "incidencias", title: "Incidencias", level: "all" },
  { id: "clientes", title: "Clientes", level: "all" },
  { id: "informes", title: "Informes", level: "all" },
  { id: "materiales", title: "Materiales", level: "admin" },
  { id: "instalaciones", title: "Instalaciones", level: "admin" },
  { id: "usuarios", title: "Usuarios", level: "superadmin" },
  { id: "trazabilidad", title: "Trazabilidad", level: "superadmin" },
  { id: "base-de-datos", title: "Base de datos", level: "superadmin" },
  { id: "cuenta", title: "Cuenta", level: "all" },
] as const;

function visible(role: string, level: (typeof SECTIONS)[number]["level"]): boolean {
  if (level === "admin") {
    return isAdmin(role);
  }
  if (level === "superadmin") {
    return isSuperadmin(role);
  }
  return true;
}

export function AyudaPage({ role }: { role: string }) {
  usePageMeta({
    title: "Ayuda",
    icon: <i className="fas fa-question-circle" aria-hidden="true" />,
    subtitle: "Centro de ayuda",
  });
  const sections = SECTIONS.filter((section) => visible(role, section.level));
  const toc = (
    <ul className="list-unstyled mb-0">
      {sections.map((section) => (
        <li key={section.id} className="mb-1">
          <a href={`#${section.id}`}>{section.title}</a>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="container-fluid px-0">
      <div className="row g-3">
        <nav id="aide-toc" className="col-lg-3 d-none d-lg-block" aria-label="Sumario">
          <div className="card shadow-sm border-0 content-card">
            <div className="card-body">{toc}</div>
          </div>
        </nav>
        <div className="col-lg-9">
          <details id="aide-toc-mobile" className="d-lg-none mb-3 card shadow-sm border-0 content-card">
            <summary className="card-header">Contenido</summary>
            <div className="card-body">{toc}</div>
          </details>
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="card shadow-sm border-0 content-card mb-3"
              data-aide-keywords={section.title}
            >
              <div className="card-body">
                <h2 className="h5">{section.title}</h2>
                <p className="mb-0 text-muted">
                  Pantalla prevista en la nueva aplicación. El detalle operativo sigue el de la aplicación actual.
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
