import { useSearchParams } from "react-router-dom";
import { clampListPerPage } from "@fcc/domain";

import { ListPagination } from "../components/ListPagination";
import { usePageMeta } from "../layout/Shell";

export function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  usePageMeta({
    title,
    icon: <i className={icon} aria-hidden="true" />,
    subtitle: "Pantalla en migración a la nueva aplicación.",
  });
  return (
    <div className="container-fluid px-0">
      <div className="card shadow-sm border-0 content-card">
        <div className="card-body text-center py-5 text-muted">
          <i className={`${icon} fa-3x mb-3`} aria-hidden="true" />
          <p className="mb-0">Esta pantalla se conectará en una fase siguiente.</p>
        </div>
      </div>
    </div>
  );
}

export function IncidenciasPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const perPage = clampListPerPage(params.get("per_page"));
  usePageMeta({
    title: "Incidencias",
    icon: <i className="fa fa-ticket" aria-hidden="true" />,
    subtitle: "Lista de incidencias",
  });
  function update(next: { page?: number; perPage?: number }) {
    const query = new URLSearchParams(params);
    query.set("page", String(next.page ?? page));
    query.set("per_page", String(next.perPage ?? perPage));
    setParams(query);
  }
  return (
    <div className="container-fluid px-0">
      <div className="card shadow-sm border-0 content-card">
        <div className="card-body">
          <div className="text-center text-muted py-5">
            <i className="fa fa-ticket fa-3x mb-3" aria-hidden="true" />
            <p className="mb-0">Sin incidencias en esta vista.</p>
          </div>
          <ListPagination
            page={page}
            perPage={perPage}
            total={0}
            onPage={(value) => update({ page: value })}
            onPerPage={(value) => update({ perPage: value, page: 1 })}
          />
        </div>
      </div>
    </div>
  );
}
