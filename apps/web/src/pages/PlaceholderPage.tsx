import { useSearchParams } from "react-router-dom";
import { clampListPerPage } from "@fcc/domain";

import { ListPagination } from "../components/ListPagination";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="h4">{title}</h1>
      <p className="text-secondary">Esta pantalla se conectará en una fase siguiente.</p>
    </section>
  );
}

export function IncidenciasPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const perPage = clampListPerPage(params.get("per_page"));
  function update(next: { page?: number; perPage?: number }) {
    const query = new URLSearchParams(params);
    query.set("page", String(next.page ?? page));
    query.set("per_page", String(next.perPage ?? perPage));
    setParams(query);
  }
  return (
    <section>
      <h1 className="h4">Incidencias</h1>
      <div className="text-center text-secondary py-5">Sin incidencias en esta vista.</div>
      <ListPagination
        page={page}
        perPage={perPage}
        total={0}
        onPage={(value) => update({ page: value })}
        onPerPage={(value) => update({ perPage: value, page: 1 })}
      />
    </section>
  );
}
