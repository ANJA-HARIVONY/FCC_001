import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { INCIDENT_STATUS_DEFAULT, normalizeIncidentStatus, type IncidentStatus } from "@fcc/domain";

import { ApiError, api } from "../../api/client";
import { useSession } from "../../auth/session";
import { usePageMeta } from "../../layout/Shell";
import { STATUS_OPTIONS, type IncidentDetail, type MovementClient } from "./types";

export function IncidentCreatePage() {
  return <IncidentForm mode="create" />;
}

export function IncidentEditPage() {
  const { id } = useParams();
  return <IncidentForm mode="edit" incidentId={Number(id)} />;
}

function IncidentForm({ mode, incidentId }: { mode: "create" | "edit"; incidentId?: number }) {
  const session = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get("next") || "/incidencias";
  const preselected = searchParams.get("client") || searchParams.get("id_client");
  const [clients, setClients] = useState<MovementClient[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    id_client: number;
    intitule: string;
    observations: string;
    status: IncidentStatus;
    ref_bitrix: string;
  }>({
    id_client: preselected ? Number(preselected) : 0,
    intitule: "",
    observations: "",
    status: INCIDENT_STATUS_DEFAULT,
    ref_bitrix: "",
  });

  usePageMeta({
    title: mode === "create" ? "Nueva Incidencia" : "Modificar Incidencia",
    icon: <i className={mode === "create" ? "fas fa-plus-circle" : "fas fa-edit"} aria-hidden="true" />,
    subtitle: mode === "create" ? "Añadir una nueva incidencia al sistema" : form.intitule || "Modificar incidencia",
    actions: (
      <Link to="/incidencias" className="btn btn-outline-secondary btn-sm">
        <i className="fas fa-arrow-left me-1" aria-hidden="true" />
        Volver
      </Link>
    ),
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const clientsPayload = await api<{ items: MovementClient[] }>("/api/incidents/clients");
        if (cancelled) {
          return;
        }
        setClients(clientsPayload.items);
        if (mode === "edit" && incidentId) {
          const payload = await api<{ item: IncidentDetail }>(`/api/incidents/${incidentId}`);
          if (cancelled) {
            return;
          }
          const item = payload.item;
          setForm({
            id_client: item.client.id,
            intitule: item.intitule,
            observations: item.observations ?? "",
            status: normalizeIncidentStatus(item.status),
            ref_bitrix: item.ref_bitrix ?? "",
          });
          setClientQuery(item.client.nom);
        } else if (preselected) {
          const match = clientsPayload.items.find((row) => row.id === Number(preselected));
          if (match) {
            setClientQuery(match.nom);
            setForm((prev) => ({ ...prev, id_client: match.id }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, incidentId, preselected]);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q || form.id_client) {
      return [];
    }
    return clients
      .filter(
        (row) =>
          row.nom.toLowerCase().includes(q) ||
          row.telephone.toLowerCase().includes(q) ||
          row.ville.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [clients, clientQuery, form.id_client]);

  const selectedClient = clients.find((row) => row.id === form.id_client) ?? null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.id_client) {
      setError("Seleccione un cliente.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        id_client: form.id_client,
        intitule: form.intitule,
        observations: form.observations,
        status: form.status,
        ref_bitrix: form.status === "Bitrix" ? form.ref_bitrix : null,
      };
      if (mode === "create") {
        await api("/api/incidents", { method: "POST", body: JSON.stringify(body) });
        navigate("/incidencias");
      } else if (incidentId) {
        await api(`/api/incidents/${incidentId}`, { method: "PUT", body: JSON.stringify(body) });
        navigate(nextUrl.startsWith("/") ? nextUrl : "/incidencias");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-3">Cargando…</p>;
  }

  return (
    <div className="container-fluid px-0">
      <nav aria-label="breadcrumb" className="app-breadcrumb page-title-breadcrumb mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/incidencias">Incidencias</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {mode === "create" ? "Nueva Incidencia" : "Modificar Incidencia"}
          </li>
        </ol>
      </nav>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card content-card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-info-circle me-2" aria-hidden="true" />
                Detalles de la Incidencia
              </h5>
            </div>
            <div className="card-body">
              {error ? (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              ) : null}
              <form onSubmit={(event) => void onSubmit(event)}>
                <div className="mb-3">
                  <label htmlFor="client_search" className="form-label">
                    Cliente <span className="text-danger">*</span>
                  </label>
                  {selectedClient ? (
                    <div className="alert alert-info py-2 mb-0">
                      <i className="fas fa-user me-2" aria-hidden="true" />
                      <strong>Cliente seleccionado:</strong> {selectedClient.nom} — {selectedClient.telephone}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary ms-2"
                        onClick={() => {
                          setForm({ ...form, id_client: 0 });
                          setClientQuery("");
                        }}
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="position-relative">
                      <input
                        id="client_search"
                        className="form-control"
                        placeholder="Buscar cliente por nombre, teléfono o ciudad..."
                        autoComplete="off"
                        value={clientQuery}
                        onChange={(event) => setClientQuery(event.target.value)}
                      />
                      {filteredClients.length > 0 ? (
                        <div className="dropdown-menu show w-100" style={{ maxHeight: 300, overflowY: "auto" }}>
                          {filteredClients.map((row) => (
                            <button
                              key={row.id}
                              type="button"
                              className="dropdown-item"
                              onClick={() => {
                                setForm({ ...form, id_client: row.id });
                                setClientQuery(row.nom);
                              }}
                            >
                              {row.nom} — {row.telephone} ({row.ville})
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="form-text">Escriba para buscar entre {clients.length} clientes</div>
                    </div>
                  )}
                </div>
                <p className="small text-muted mb-3">
                  <i className="fas fa-user me-1" aria-hidden="true" />
                  Usuario: <strong>{session.user?.nom}</strong>
                </p>
                <div className="mb-3">
                  <label htmlFor="intitule" className="form-label">
                    Asunto de la incidencia <span className="text-danger">*</span>
                  </label>
                  <input
                    id="intitule"
                    className="form-control"
                    required
                    value={form.intitule}
                    onChange={(event) => setForm({ ...form, intitule: event.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="status" className="form-label">
                    Estado <span className="text-danger">*</span>
                  </label>
                  <select
                    id="status"
                    className="form-select"
                    required
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: normalizeIncidentStatus(event.target.value) })}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {form.status === "Bitrix" ? (
                  <div className="mb-3">
                    <label htmlFor="ref_bitrix" className="form-label">
                      Referencia Bitrix
                    </label>
                    <input
                      id="ref_bitrix"
                      className="form-control"
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]{1,10}"
                      placeholder="Ej: 8225512345"
                      value={form.ref_bitrix}
                      onChange={(event) => setForm({ ...form, ref_bitrix: event.target.value })}
                    />
                    <small className="form-text text-muted">Aqui se pone la referencia de Bitrix</small>
                  </div>
                ) : null}
                <div className="mb-3">
                  <label htmlFor="observations" className="form-label">
                    Observaciones
                  </label>
                  <textarea
                    id="observations"
                    className="form-control"
                    rows={4}
                    value={form.observations}
                    onChange={(event) => setForm({ ...form, observations: event.target.value })}
                  />
                </div>
                <div className="d-flex justify-content-between mt-4">
                  <Link to={mode === "edit" ? nextUrl : "/incidencias"} className="btn btn-secondary">
                    <i className="fas fa-arrow-left me-1" aria-hidden="true" />
                    Volver
                  </Link>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="fas fa-save me-1" aria-hidden="true" />
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
