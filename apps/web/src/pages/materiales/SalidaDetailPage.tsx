import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";
import { SALIDA_TIPO_BADGE, type SalidaDetail } from "./types";

export function SalidaDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<SalidaDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: item ? `Salida #${item.id}` : "Salida",
    icon: <i className="fas fa-box" aria-hidden="true" />,
    subtitle: item?.tipo_label ?? "",
    actions: item ? (
      <>
        <Link to="/materiales/salidas" className="btn btn-secondary btn-sm">
          Volver
        </Link>
        <Link to={`/materiales/salidas/${item.id}/editar`} className="btn btn-warning btn-sm">
          Modificar
        </Link>
      </>
    ) : null,
  });

  useEffect(() => {
    let cancelled = false;
    api<{ item: SalidaDetail }>(`/api/materiales/salidas/${id}`)
      .then((payload) => {
        if (!cancelled) {
          setItem(payload.item);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }
  if (!item) {
    return <p className="p-3">Cargando…</p>;
  }

  return (
    <div className="container-fluid px-0">
      <div className="card content-card">
        <div className="card-body">
          <p>
            <strong>Fecha:</strong> {item.fecha}
          </p>
          <p>
            <strong>Tipo:</strong>{" "}
            <span className={`badge ${SALIDA_TIPO_BADGE[item.tipo_salida] ?? "bg-secondary"}`}>{item.tipo_label}</span>
          </p>
          <p>
            <strong>Técnico:</strong> {item.tecnico.nom}
          </p>
          <p>
            <strong>Cliente:</strong> {item.client?.nom ?? "— (uso interno)"}
          </p>
          <p>
            <strong>Observaciones:</strong> {item.observaciones || "—"}
          </p>
          <h6 className="mt-3">Materiales</h6>
          <ul>
            {item.lineas.map((linea) => (
              <li key={linea.id}>
                {linea.material?.nombre ?? `#${linea.id_material}`}
                {linea.material?.modelo ? ` (${linea.material.modelo})` : ""} × {linea.cantidad}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
