import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";

interface SearchPayload {
  clients: { id: number; nom: string; telephone: string; ville: string }[];
  incidents: { id: number; intitule: string; status: string; client: string }[];
}

export function BusquedaPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [data, setData] = useState<SearchPayload | null>(null);

  usePageMeta({
    title: "Búsqueda",
    icon: <i className="fas fa-search" aria-hidden="true" />,
  });

  async function run(event?: FormEvent) {
    event?.preventDefault();
    setParams({ q: draft });
    const payload = await api<SearchPayload>(`/api/busqueda?q=${encodeURIComponent(draft)}`);
    setData(payload);
  }

  return (
    <div>
      <form className="d-flex gap-2 mb-3" onSubmit={(e) => void run(e)}>
        <input className="form-control" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Cliente o incidencia" />
        <button className="btn btn-primary btn-sm" type="submit">
          Buscar
        </button>
      </form>
      {data ? (
        <div className="row g-3">
          <div className="col-md-6">
            <h2 className="h6">Clientes</h2>
            <ul>
              {data.clients.map((c) => (
                <li key={c.id}>
                  <Link to={`/clientes/${c.id}`}>{c.nom}</Link> · {c.ville}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-6">
            <h2 className="h6">Incidencias</h2>
            <ul>
              {data.incidents.map((i) => (
                <li key={i.id}>
                  <Link to={`/incidencias/${i.id}`}>{i.intitule}</Link> · {i.status}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
