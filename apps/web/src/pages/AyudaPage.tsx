import { isAdmin, isSuperadmin } from "@fcc/domain";

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
  const sections = SECTIONS.filter((section) => visible(role, section.level));
  const toc = (
    <ul>
      {sections.map((section) => (
        <li key={section.id}>
          <a href={`#${section.id}`}>{section.title}</a>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="row">
      <nav id="aide-toc" className="col-lg-3 d-none d-lg-block" aria-label="Sumario">
        {toc}
      </nav>
      <div className="col-lg-9">
        <details id="aide-toc-mobile" className="d-lg-none mb-3">
          <summary>Contenido</summary>
          <ul>{sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}</ul>
        </details>
        <h1 className="h4">Ayuda</h1>
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="mb-4" data-aide-keywords={section.title}>
            <h2 className="h5">{section.title}</h2>
            <p>Pantalla prevista en la nueva aplicación. El detalle operativo sigue el de la aplicación actual.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
