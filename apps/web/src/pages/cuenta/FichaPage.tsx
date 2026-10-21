import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { ListPagination } from "../../components/ListPagination";
import { usePageMeta } from "../../layout/Shell";

interface FichaItem {
  historial_id: number;
  incident_id: number;
  asunto: string;
  cliente: string;
  estado_inicial: string;
  estado_destino: string;
  retraso_min: number;
  retraso_label: string;
  fecha_cambio: string;
}

interface FichaPayload {
  usuario: { nom: string };
  umbral: number;
  date_from: string;
  date_to: string;
  estado_destino: string;
  total: number;
  page: number;
  per_page: number;
  kpis: {
    total: number;
    retraso_medio: number;
    retraso_max: number;
    pct_bitrix: number;
    pct_solucionadas: number;
  };
  items: FichaItem[];
}

export function FichaPage() {
  const { id } = useParams();
  const [data, setData] = useState<FichaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [destino, setDestino] = useState("");
  const [umbral, setUmbral] = useState("30");
  const [query, setQuery] = useState("");

  usePageMeta({
    title: "Ficha atención al cliente",
    icon: <i className="fas fa-id-card" aria-hidden="true" />,
    subtitle: data?.usuario.nom,
    actions: data ? (
      <a className="btn btn-outline-success btn-sm" href={`/api/ficha/${id}/export.xlsx?${query}`}>
        <i className="fas fa-file-excel me-1" aria-hidden="true" />
        Exportar Excel
      </a>
    ) : null,
  });

  useEffect(() => {
    const params = new URLSearchParams({ per_page: "50", page: String(page) });
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (destino) params.set("estado_destino", destino);
    if (umbral) params.set("umbral", umbral);
    const next = params.toString();
    setQuery(next);
    void (async () => {
      try {
        const payload = await api<FichaPayload>(`/api/ficha/${id}?${next}`);
        setData(payload);
        setError(null);
        if (!dateFrom) setDateFrom(payload.date_from);
        if (!dateTo) setDateTo(payload.date_to);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Error");
      }
    })();
  }, [id, page, dateFrom, dateTo, destino, umbral]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    setPage(1);
  }

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <p>Cargando…</p>;

  return (
    <div>
      <form className="row g-2 align-items-end mb-3" onSubmit={onFilter}>
        <div className="col-auto">
          <label className="form-label" htmlFor="date_from">Desde</label>
          <input id="date_from" type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="col-auto">
          <label className="form-label" htmlFor="date_to">Hasta</label>
          <input id="date_to" type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="col-auto">
          <label className="form-label" htmlFor="estado_destino">Estado destino</label>
          <select id="estado_destino" className="form-select" value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Todos</option>
            <option value="Bitrix">Bitrix</option>
            <option value="Solucionadas">Solucionadas</option>
          </select>
        </div>
        <div className="col-auto">
          <label className="form-label" htmlFor="umbral">Umbral (min)</label>
          <input id="umbral" type="number" min={1} max={1440} className="form-control" value={umbral} onChange={(e) => setUmbral(e.target.value)} />
        </div>
      </form>
      <p>
        Con retraso: {data.kpis.total} · Medio: {data.kpis.retraso_medio} min · Máximo: {data.kpis.retraso_max} min ·
        Bitrix: {data.kpis.pct_bitrix}% · Solucionadas: {data.kpis.pct_solucionadas}% · Umbral: {data.umbral} min
      </p>
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Incidencia</th>
            <th>Cliente</th>
            <th>De</th>
            <th>A</th>
            <th>Retraso</th>
            <th>Cambio</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((row) => (
            <tr key={row.historial_id} className="table-warning">
              <td>{row.asunto}</td>
              <td>{row.cliente}</td>
              <td>{row.estado_inicial}</td>
              <td>{row.estado_destino}</td>
              <td>{row.retraso_label}</td>
              <td>{row.fecha_cambio}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="d-flex justify-content-end">
        <ListPagination
          page={data.page || page}
          perPage={data.per_page || 50}
          total={data.total}
          variant="compact"
          align="end"
          label="Paginación de la ficha"
          onPage={setPage}
        />
      </div>
    </div>
  );
}
