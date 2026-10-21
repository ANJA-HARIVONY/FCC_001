import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, api } from "../../api/client";
import { usePageMeta } from "../../layout/Shell";

interface PingResult {
  success: boolean;
  ip: string | null;
  error?: string;
  packets_sent: number;
  packets_received: number;
  packets_lost: number;
  packet_loss: number;
  min_time: number;
  avg_time: number;
  max_time: number;
}

interface VerifyResponse {
  client: { id: number; nom: string; adresse: string; ville: string };
  resultado_antena: PingResult;
  resultado_router: PingResult;
}

export function ClientVerifyPage() {
  const { id } = useParams();
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const icon = useMemo(() => <i className="fas fa-network-wired" aria-hidden="true" />, []);

  const actions = useMemo(() => {
    if (!data) {
      return undefined;
    }
    return (
      <>
        <Link to={`/clientes/${data.client.id}`} className="btn btn-secondary btn-sm">
          <i className="fas fa-arrow-left me-1" aria-hidden="true" />
          Volver
        </Link>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
          <i className="fas fa-sync-alt me-1" aria-hidden="true" />
          Verificar de Nuevo
        </button>
      </>
    );
  }, [data]);

  usePageMeta({
    title: "Verificación de Conectividad",
    icon,
    subtitle: data?.client.nom ?? "",
    actions,
  });

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    api<VerifyResponse>(`/api/clients/${id}/verificar`)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }
  if (loading || !data) {
    return <p>Comprobando conectividad…</p>;
  }

  const antena = data.resultado_antena;
  const router = data.resultado_router;
  return (
    <div className="container-fluid px-0">
      <div className="card shadow mb-4 content-card">
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <strong>
                <i className="fas fa-user" aria-hidden="true" /> Nombre:
              </strong>{" "}
              {data.client.nom}
            </div>
            <div className="col-md-4">
              <strong>
                <i className="fas fa-map-marker-alt" aria-hidden="true" /> Dirección:
              </strong>{" "}
              {data.client.adresse}
            </div>
            <div className="col-md-4">
              <strong>
                <i className="fas fa-city" aria-hidden="true" /> Barrio:
              </strong>{" "}
              {data.client.ville || "N/A"}
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <PingCard title="ANTENA" icon="fa-broadcast-tower" result={antena} />
        <PingCard title="ROUTER" icon="fa-network-wired" result={router} />
      </div>
      <Diagnosis antena={antena} router={router} />
    </div>
  );
}

function PingCard({ title, icon, result }: { title: string; icon: string; result: PingResult }) {
  return (
    <div className="col-lg-6 mb-4">
      <div className="card shadow h-100">
        <div className={`card-header ${result.success ? "bg-success" : "bg-danger"} text-white text-center py-2`}>
          <h6 className="mb-0">
            <i className={`fas ${icon} me-1`} aria-hidden="true" /> {title}
          </h6>
        </div>
        <div className="card-body">
          <p className="text-center mb-2">
            {result.success ? "CONECTADO" : "SIN CONEXIÓN"}
            {result.ip ? <span className="d-block small text-muted">{result.ip}</span> : null}
          </p>
          {result.error ? <p className="text-danger text-center small">{result.error}</p> : null}
          <div className="row text-center">
            <Metric label="Enviados" value={result.packets_sent} tone="text-primary" />
            <Metric label="Recibidos" value={result.packets_received} tone="text-success" />
            <Metric label="Perdidos" value={result.packets_lost} tone="text-danger" />
            <Metric label="Pérdida" value={`${result.packet_loss}%`} tone="text-warning" />
          </div>
          <div className="row text-center mt-3">
            <Metric label="Mín" value={result.min_time} tone="text-info" />
            <Metric label="Media" value={result.avg_time} tone="" />
            <Metric label="Máx" value={result.max_time} tone="text-warning" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="col-3">
      <div className="small text-muted">{label}</div>
      <h6 className={`mb-0 ${tone}`}>{value}</h6>
    </div>
  );
}

function Diagnosis({ antena, router }: { antena: PingResult; router: PingResult }) {
  let body: { title: string; text: string; items: string[]; tone: string };
  if (!router.success && !antena.success) {
    body = {
      tone: "danger",
      title: "PROBLEMA CRÍTICO",
      text: "Ni el router ni la antena responden al ping.",
      items: [
        "Cliente completamente desconectado",
        "Problema de alimentación eléctrica",
        "IPs configuradas incorrectamente",
        "Firewall bloqueando ICMP (ping)",
      ],
    };
  } else if (!router.success) {
    body = {
      tone: "warning",
      title: "PROBLEMA EN EL ROUTER",
      text: "El router no responde, pero la antena funciona correctamente.",
      items: [
        "Conexión física del router (cables Ethernet)",
        "Alimentación eléctrica del router",
        `Configuración de IP: ${router.ip || "No configurada"}`,
        "Reiniciar el router si es necesario",
      ],
    };
  } else if (!antena.success) {
    body = {
      tone: "warning",
      title: "PROBLEMA EN LA ANTENA",
      text: "La antena no responde, pero el router funciona correctamente.",
      items: [
        "Conexión física de la antena",
        "Alimentación PoE (Power over Ethernet)",
        `Configuración de IP: ${antena.ip || "No configurada"}`,
        "Alineación y obstrucciones de la señal",
      ],
    };
  } else if (router.packet_loss > 10 || antena.packet_loss > 10) {
    body = {
      tone: "warning",
      title: "CONEXIÓN INESTABLE",
      text: "Alta pérdida de paquetes detectada.",
      items: [
        antena.packet_loss > 10 ? `Antena: pérdida ${antena.packet_loss}%` : "",
        router.packet_loss > 10 ? `Router: pérdida ${router.packet_loss}%` : "",
      ].filter(Boolean),
    };
  } else {
    body = {
      tone: "success",
      title: "CONEXIÓN CORRECTA",
      text: "La antena y el router responden al ping.",
      items: [],
    };
  }
  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3 bg-info text-white">
        <h5 className="mb-0">
          <i className="fas fa-stethoscope" aria-hidden="true" /> Diagnóstico y Recomendaciones
        </h5>
      </div>
      <div className="card-body">
        <div className={`alert alert-${body.tone} mb-0`}>
          <h5 className="alert-heading">{body.title}</h5>
          <p className="mb-2">{body.text}</p>
          {body.items.length ? (
            <ul className="mb-0">
              {body.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
