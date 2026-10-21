import { useEffect, useState } from "react";

import { api } from "../../api/client";
import { ListPagination } from "../../components/ListPagination";
import { usePageMeta } from "../../layout/Shell";

interface AuditItem {
  id: number;
  action: string;
  detail: string | null;
  ip: string | null;
  date_heure: string;
  usuario: string;
}

export function TrazabilidadPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [users, setUsers] = useState<{ id: number; nom: string }[]>([]);
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  usePageMeta({
    title: "Trazabilidad",
    icon: <i className="fas fa-clipboard-list" aria-hidden="true" />,
    subtitle: "Últimos 30 días",
  });

  useEffect(() => {
    void (async () => {
      const payload = await api<{
        items: AuditItem[];
        users: { id: number; nom: string }[];
        total: number;
      }>(`/api/audit?user_id=${userId}&page=${page}`);
      setItems(payload.items);
      setUsers(payload.users);
      setTotal(payload.total);
    })();
  }, [userId, page]);

  async function exportTxt() {
    const response = await fetch(`/api/audit/export?user_id=${userId}`, { credentials: "include" });
    const text = await response.text();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_log.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <select
          className="form-select w-auto"
          value={userId}
          onChange={(event) => {
            setUserId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nom}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void exportTxt()}>
          Exportar texto
        </button>
      </div>
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>{row.date_heure.replace("T", " ").slice(0, 19)}</td>
              <td>{row.usuario}</td>
              <td>{row.action}</td>
              <td>{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ListPagination page={page} perPage={50} total={total} variant="compact" onPage={setPage} label="Paginación de la trazabilidad" />
    </div>
  );
}

export function DatabasePage() {
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: "Base de datos",
    icon: <i className="fas fa-database" aria-hidden="true" />,
    subtitle: "Verificación y exportación",
  });

  async function verificar() {
    setError(null);
    try {
      const payload = await api<{ data: { summary: { status: string; tables: number; errors: number } } }>(
        "/api/database/verificar",
        { method: "POST" },
      );
      setReport(
        `${payload.data.summary.status} · ${payload.data.summary.tables} tablas · ${payload.data.summary.errors} errores`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <p>Comprueba la conexión y descarga un archivo .sql compatible con HeidiSQL.</p>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void verificar()}>
            Verificar
          </button>
          <a className="btn btn-outline-primary btn-sm" href="/api/database/exportar">
            <i className="fas fa-download me-1" aria-hidden="true" />
            Descargar archivo .sql
          </a>
        </div>
        {report ? <div className="alert alert-info mt-3 mb-0">{report}</div> : null}
        {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}
      </div>
    </div>
  );
}
