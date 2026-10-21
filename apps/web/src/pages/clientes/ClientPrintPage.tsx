import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { formatIncidentDate } from "../incidencias/types";
import type { ClientFichaResponse } from "./types";

export function ClientPrintPage() {
  const { id } = useParams();
  const [data, setData] = useState<ClientFichaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.body.className;
    document.body.className = "bg-white";
    return () => {
      document.body.className = previous;
    };
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    api<ClientFichaResponse>(`/api/clients/${id}/ficha`)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return <p className="p-4">{error}</p>;
  }
  if (!data) {
    return <p className="p-4">Cargando…</p>;
  }
  const item = data.item;
  return (
    <main className="container py-4 ficha-print">
      <div className="d-flex justify-content-between mb-3 d-print-none">
        <Link to={`/clientes/${item.id}`} className="btn btn-secondary btn-sm">
          Volver
        </Link>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
          <i className="fas fa-print me-1" aria-hidden="true" />
          Imprimir
        </button>
      </div>
      <header className="text-center border-bottom pb-3 mb-4">
        <h1 className="h3 text-primary">Ficha de cliente</h1>
        <p className="text-muted mb-0">{item.nom}</p>
      </header>
      <section className="mb-4">
        <h2 className="h6 bg-light border-start border-4 border-primary p-2">Información del cliente</h2>
        <table className="table table-sm">
          <tbody>
            <tr>
              <th>Nombre</th>
              <td>{item.nom}</td>
            </tr>
            <tr>
              <th>Teléfono</th>
              <td>{item.telephone}</td>
            </tr>
            <tr>
              <th>Dirección</th>
              <td>{item.adresse}</td>
            </tr>
            <tr>
              <th>Barrio</th>
              <td>{item.ville}</td>
            </tr>
            <tr>
              <th>Ciudad</th>
              <td>{item.ciudad?.nombre ?? "N/A"}</td>
            </tr>
            <tr>
              <th>IP Router</th>
              <td>{item.ip_router ?? "—"}</td>
            </tr>
            <tr>
              <th>IP Antena</th>
              <td>{item.ip_antea ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="h6 bg-light border-start border-4 border-primary p-2">Historial de las Incidencias</h2>
        {data.incidencias.length ? (
          <table className="table table-sm table-bordered">
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Asunto</th>
                <th>Estado</th>
                <th>Operador</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {data.incidencias.map((incident) => (
                <tr key={incident.id}>
                  <td>{formatIncidentDate(incident.date_heure)}</td>
                  <td>{incident.intitule}</td>
                  <td>{incident.status === "Pendiente" ? "Pendientes" : incident.status}</td>
                  <td>{incident.operateur}</td>
                  <td>{incident.observations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">No hay incidencias registradas para este cliente.</p>
        )}
      </section>
    </main>
  );
}
