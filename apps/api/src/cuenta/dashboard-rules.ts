import { HttpException, HttpStatus } from "@nestjs/common";
import { APRECIACION_TEXTO_MAX, isSuperadmin } from "@fcc/domain";
import type { Prisma } from "@prisma/client";

import { endOfDay, getDateRangeForPeriod, isoDay } from "../informes/period.ts";

export interface ScopeIds {
  ciudadId: number | null;
  agenciaId: number | null;
}

export interface SeriePoint {
  date: string;
  fecha: string;
  count: number;
  solucionadas: number;
  bitrix: number;
  apreciacion: string | null;
  apreciaciones: { texto: string; ciudad: string; agencia: string }[];
}

/** Superadmin sans filtre : tout. Sinon agencia du créateur et ciudad du client. */
export function movementScope(
  query: Record<string, string | undefined>,
  user: { role: string; idCiudad: number; idAgencia: number },
): ScopeIds {
  if (!isSuperadmin(user.role)) {
    return { ciudadId: user.idCiudad, agenciaId: user.idAgencia };
  }
  const ciudadId = Number(query.ciudad);
  const agenciaId = Number(query.agencia);
  return {
    ciudadId: Number.isInteger(ciudadId) && ciudadId > 0 ? ciudadId : null,
    agenciaId: Number.isInteger(agenciaId) && agenciaId > 0 ? agenciaId : null,
  };
}

export function incidentWhere(
  query: Record<string, string | undefined>,
  user: { role: string; idCiudad: number; idAgencia: number },
): Prisma.incidentWhereInput {
  const range = getDateRangeForPeriod(query.period || "current_week");
  const scope = movementScope(query, user);
  const and: Prisma.incidentWhereInput[] = [];
  if (scope.ciudadId) and.push({ client: { id_ciudad: scope.ciudadId } });
  if (scope.agenciaId) and.push({ operateur: { id_agencia: scope.agenciaId } });
  if (range.debut) and.push({ date_heure: { gte: range.debut } });
  if (range.fin) and.push({ date_heure: { lte: endOfDay(range.fin) } });
  return and.length ? { AND: and } : {};
}

export function notaWhere(
  query: Record<string, string | undefined>,
  user: { role: string; idCiudad: number; idAgencia: number },
): Prisma.apreciacion_diaWhereInput {
  if (!isSuperadmin(user.role)) {
    return { id_ciudad: user.idCiudad, id_agencia: user.idAgencia };
  }
  const scope = movementScope(query, user);
  const where: Prisma.apreciacion_diaWhereInput = {};
  if (scope.ciudadId) where.id_ciudad = scope.ciudadId;
  if (scope.agenciaId) where.id_agencia = scope.agenciaId;
  return where;
}

export function summarizeIncidents(
  incidents: {
    status: string;
    intitule: string | null;
    id_client: number;
    id_operateur: number;
    client: { nom: string; adresse: string; categoria: string } | null;
    operateur: { nom: string } | null;
  }[],
) {
  const byOp = new Map<number, { nom: string; count: number }>();
  const byClient = new Map<number, { nom: string; adresse: string; categoria: string; count: number; intitule: string }>();
  for (const row of incidents) {
    const op = byOp.get(row.id_operateur) ?? { nom: row.operateur?.nom ?? "", count: 0 };
    op.count += 1;
    byOp.set(row.id_operateur, op);
    const cl = byClient.get(row.id_client) ?? {
      nom: row.client?.nom ?? "",
      adresse: row.client?.adresse ?? "",
      categoria: row.client?.categoria ?? "particular",
      count: 0,
      intitule: "",
    };
    cl.count += 1;
    const titre = row.intitule ?? "";
    if (titre > cl.intitule) cl.intitule = titre;
    byClient.set(row.id_client, cl);
  }
  return {
    total: incidents.length,
    solucionadas: incidents.filter((i) => i.status === "Solucionadas").length,
    pendiente: incidents.filter((i) => i.status === "Pendiente").length,
    bitrix: incidents.filter((i) => i.status === "Bitrix").length,
    por_operador: [...byOp.entries()]
      .map(([id, v]) => ({ id, nom: v.nom, count: v.count }))
      .sort((a, b) => b.count - a.count || a.nom.localeCompare(b.nom)),
    clientes: [...byClient.entries()]
      .map(([id, v]) => ({
        id,
        nom: v.nom,
        adresse: v.adresse,
        categoria: v.categoria,
        count: v.count,
        intitule: v.intitule,
      }))
      .sort((a, b) => b.count - a.count || a.nom.localeCompare(b.nom))
      .slice(0, 5),
  };
}

export function buildSerie(
  rows: { date_heure: Date; status: string }[],
  view: string,
): SeriePoint[] {
  const kind = view === "month" || view === "year" ? view : "date";
  const buckets = new Map<string, SeriePoint>();
  for (const row of rows) {
    const key = serieKey(row.date_heure, kind);
    const point = buckets.get(key.fecha) ?? {
      date: key.label,
      fecha: key.fecha,
      count: 0,
      solucionadas: 0,
      bitrix: 0,
      apreciacion: null,
      apreciaciones: [],
    };
    point.count += 1;
    if (row.status === "Solucionadas") point.solucionadas += 1;
    if (row.status === "Bitrix") point.bitrix += 1;
    buckets.set(key.fecha, point);
  }
  return [...buckets.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function applyNotas(
  items: SeriePoint[],
  notes: { id: number; texto: string; fecha: Date; ciudad: string; agencia: string }[],
) {
  const byDay = new Map<string, { texto: string; ciudad: string; agencia: string; id: number }[]>();
  for (const note of notes) {
    const key = isoDay(note.fecha);
    const list = byDay.get(key) ?? [];
    list.push({ id: note.id, texto: note.texto, ciudad: note.ciudad, agencia: note.agencia });
    byDay.set(key, list);
  }
  for (const item of items) {
    const list = (byDay.get(item.fecha) ?? []).sort((a, b) => {
      const byCiudad = a.ciudad.localeCompare(b.ciudad);
      if (byCiudad) return byCiudad;
      const byAgencia = a.agencia.localeCompare(b.agencia);
      return byAgencia || a.id - b.id;
    });
    item.apreciaciones = list.map(({ texto, ciudad, agencia }) => ({ texto, ciudad, agencia }));
    item.apreciacion = joinNotas(item.apreciaciones);
  }
}

export function parseFecha(value: string | undefined): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpException({ ok: false, error: "Fecha inválida. Use YYYY-MM-DD." }, HttpStatus.BAD_REQUEST);
  }
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function normalizeApreciacionTexto(texto: string | undefined): string {
  const value = (texto ?? "").trim();
  if (!value) {
    throw new HttpException({ ok: false, error: "La apreciación no puede estar vacía." }, HttpStatus.BAD_REQUEST);
  }
  if (value.length > APRECIACION_TEXTO_MAX) {
    throw new HttpException(
      { ok: false, error: `La apreciación no puede superar ${APRECIACION_TEXTO_MAX} caracteres.` },
      HttpStatus.BAD_REQUEST,
    );
  }
  return value;
}

const TIPO_LABELS: Record<string, string> = { nueva: "Nueva", traslado: "Traslado" };
const ESTADO_LABELS: Record<string, string> = { en_curso: "En curso", terminada: "Terminada" };

export function serializeInstalacionDia(row: {
  id: number;
  fecha: Date;
  tipo: string;
  estado: string;
  client: { id: number; nom: string; adresse: string; categoria: string } | null;
  client_sitio_instalacion_id_sitioToclient_sitio: { adresse: string } | null;
  operateur_instalacion_id_tecnicoTooperateur: { id: number; nom: string; avatar_url: string | null } | null;
  material_salida: {
    material_salida_linea: { cantidad: number; material: { nombre: string } | null }[];
  }[];
}) {
  const lineas = row.material_salida.flatMap((salida) =>
    salida.material_salida_linea.map((linea) => ({
      nombre: linea.material?.nombre ?? "?",
      cantidad: linea.cantidad,
    })),
  );
  const fecha = isoDay(row.fecha);
  const [y, m, d] = fecha.split("-");
  return {
    id: row.id,
    fecha: `${d}/${m}/${y}`,
    tipo: row.tipo,
    tipo_label: TIPO_LABELS[row.tipo] ?? row.tipo,
    estado: row.estado,
    estado_label: ESTADO_LABELS[row.estado] ?? row.estado,
    tecnico: row.operateur_instalacion_id_tecnicoTooperateur
      ? {
          id: row.operateur_instalacion_id_tecnicoTooperateur.id,
          nom: row.operateur_instalacion_id_tecnicoTooperateur.nom,
          avatar_url: row.operateur_instalacion_id_tecnicoTooperateur.avatar_url,
        }
      : null,
    client: row.client
      ? {
          id: row.client.id,
          nom: row.client.nom,
          adresse: row.client.adresse,
          categoria: row.client.categoria,
        }
      : null,
    direccion: row.client_sitio_instalacion_id_sitioToclient_sitio?.adresse || row.client?.adresse || "",
    materiales: lineas.length ? lineas.map((l) => `${l.nombre} x${l.cantidad}`).join(", ") : "",
    lineas,
  };
}

function serieKey(value: Date, view: "date" | "month" | "year"): { fecha: string; label: string } {
  const y = value.getFullYear();
  const m = value.getMonth() + 1;
  const d = value.getDate();
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  if (view === "year") return { fecha: `${y}-01-01`, label: String(y) };
  if (view === "month") return { fecha: `${y}-${mm}-01`, label: `${mm}/${y}` };
  return { fecha: `${y}-${mm}-${dd}`, label: `${dd}/${mm}` };
}

function joinNotas(rows: { texto: string; ciudad: string; agencia: string }[]): string | null {
  if (!rows.length) return null;
  if (rows.length === 1) return rows[0].texto;
  return rows
    .map((row) => {
      const where = [row.ciudad, row.agencia].filter(Boolean).join(" · ");
      return where ? `${where}: ${row.texto}` : row.texto;
    })
    .join(" | ");
}
