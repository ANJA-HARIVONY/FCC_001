import { isSuperadmin, type Actor } from "@fcc/domain";
import type { Prisma } from "@prisma/client";

import type { PrismaService } from "../prisma/prisma.service.ts";
import type { DataContext } from "./local-content.ts";
import { endOfDay, formatEsDate, isoDay, startOfDay } from "./period.ts";

export async function collectDataContext(
  prisma: PrismaService,
  actor: Actor,
  etat: {
    periode_debut: Date | null;
    periode_fin: Date | null;
    parametres: string | null;
  },
): Promise<DataContext> {
  try {
    const params = parseParametres(etat.parametres);
    let agenceId: number | null = null;
    let agenceLabel = "Todas las agencias";

    const where: Prisma.incidentWhereInput = {};
    const and: Prisma.incidentWhereInput[] = [];

    if (!isSuperadmin(actor.role)) {
      agenceId = actor.idAgencia;
      and.push({ operateur: { id_agencia: actor.idAgencia } });
      and.push({ client: { id_ciudad: actor.idCiudad } });
      const ag = await prisma.agencia.findUnique({ where: { id: actor.idAgencia } });
      agenceLabel = ag?.nombre ?? "Mi agencia";
    } else if (params.agence_id != null && Number.isInteger(Number(params.agence_id))) {
      agenceId = Number(params.agence_id);
      and.push({ operateur: { id_agencia: agenceId } });
      const ag = await prisma.agencia.findUnique({ where: { id: agenceId } });
      if (ag) {
        agenceLabel = ag.nombre;
      }
    }

    if (etat.periode_debut) {
      and.push({ date_heure: { gte: startOfDay(etat.periode_debut) } });
    }
    if (etat.periode_fin) {
      and.push({ date_heure: { lte: endOfDay(etat.periode_fin) } });
    }
    if (and.length) {
      where.AND = and;
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        client: { select: { id: true, categoria: true } },
        operateur: { select: { id: true, nom: true } },
      },
    });

    const total = incidents.length;
    const resolus = incidents.filter((i) => i.status === "Solucionadas").length;
    const enCours = incidents.filter((i) => i.status === "Pendiente").length;
    const bitrix = incidents.filter((i) => i.status === "Bitrix").length;
    const taux = total > 0 ? Math.round((resolus / total) * 1000) / 10 : 0;

    const incidentsParType: Record<string, number> = {};
    let incidentsCorporativo = 0;
    let incidentsParticular = 0;
    const clientsCorporativo = new Set<number>();
    const clientsParticular = new Set<number>();
    const operateursPerf: Record<string, { total: number; resolus: number }> = {};
    const activite: Record<string, { total: number; solucionadas: number; bitrix: number }> = {};
    const evolutionMap: Record<string, { count: number; solucionadas: number; bitrix: number }> = {};

    for (const incident of incidents) {
      const intitule = (incident.intitule || "").slice(0, 50);
      incidentsParType[intitule] = (incidentsParType[intitule] || 0) + 1;
      const categoria = incident.client?.categoria === "corporativo" ? "corporativo" : "particular";
      if (categoria === "corporativo") {
        incidentsCorporativo += 1;
        if (incident.id_client) {
          clientsCorporativo.add(incident.id_client);
        }
      } else {
        incidentsParticular += 1;
        if (incident.id_client) {
          clientsParticular.add(incident.id_client);
        }
      }
      if (incident.operateur) {
        const nom = incident.operateur.nom;
        if (!operateursPerf[nom]) {
          operateursPerf[nom] = { total: 0, resolus: 0 };
        }
        operateursPerf[nom].total += 1;
        if (incident.status === "Solucionadas") {
          operateursPerf[nom].resolus += 1;
        }
        if (!activite[nom]) {
          activite[nom] = { total: 0, solucionadas: 0, bitrix: 0 };
        }
        activite[nom].total += 1;
        if (incident.status === "Solucionadas") {
          activite[nom].solucionadas += 1;
        }
        if (incident.status === "Bitrix") {
          activite[nom].bitrix += 1;
        }
      }
      const dayKey = isoDay(incident.date_heure);
      if (!evolutionMap[dayKey]) {
        evolutionMap[dayKey] = { count: 0, solucionadas: 0, bitrix: 0 };
      }
      evolutionMap[dayKey].count += 1;
      if (incident.status === "Solucionadas") {
        evolutionMap[dayKey].solucionadas += 1;
      }
      if (incident.status === "Bitrix") {
        evolutionMap[dayKey].bitrix += 1;
      }
    }

    const notasWhere: Prisma.apreciacion_diaWhereInput = {};
    if (!isSuperadmin(actor.role)) {
      notasWhere.id_ciudad = actor.idCiudad;
      notasWhere.id_agencia = actor.idAgencia;
    } else {
      if (params.ciudad_id != null && Number.isInteger(Number(params.ciudad_id))) {
        notasWhere.id_ciudad = Number(params.ciudad_id);
      }
      if (agenceId != null) {
        notasWhere.id_agencia = agenceId;
      }
    }
    if (etat.periode_debut) {
      notasWhere.fecha = { ...(notasWhere.fecha as object), gte: startOfDay(etat.periode_debut) };
    }
    if (etat.periode_fin) {
      notasWhere.fecha = { ...(notasWhere.fecha as object), lte: startOfDay(etat.periode_fin) };
    } else {
      notasWhere.fecha = { ...(notasWhere.fecha as object), lte: startOfDay(new Date()) };
    }

    const notasRows = await prisma.apreciacion_dia.findMany({
      where: notasWhere,
      include: { ciudad: true, agencia: true },
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
    });

    const notasDelDia: DataContext["notas_del_dia"] = [];
    const rowsByIso = new Map<string, typeof notasRows>();
    for (const row of notasRows) {
      const fechaIso = isoDay(row.fecha);
      notasDelDia.push({
        fecha: formatEsDate(row.fecha),
        fecha_iso: fechaIso,
        texto: row.texto,
        ciudad: row.ciudad?.nombre ?? "",
        agencia: row.agencia?.nombre ?? "",
      });
      const bucket = rowsByIso.get(fechaIso) ?? [];
      bucket.push(row);
      rowsByIso.set(fechaIso, bucket);
    }

    const notesByIso = new Map<string, string>();
    for (const [fechaIso, rows] of rowsByIso) {
      notesByIso.set(fechaIso, joinApreciacionesTexto(rows));
    }

    const evolution = Object.keys(evolutionMap)
      .sort()
      .map((day) => ({
        label: day,
        count: evolutionMap[day].count,
        solucionadas: evolutionMap[day].solucionadas,
        bitrix: evolutionMap[day].bitrix,
        apreciacion: notesByIso.get(day) ?? null,
      }));

    let periodeStr = "Período personalizado";
    if (etat.periode_debut && etat.periode_fin) {
      periodeStr = `${formatEsDate(etat.periode_debut)} - ${formatEsDate(etat.periode_fin)}`;
    } else if (etat.periode_debut) {
      periodeStr = `Desde el ${formatEsDate(etat.periode_debut)}`;
    }

    const topTypes = Object.fromEntries(Object.entries(incidentsParType).slice(0, 10));

    return {
      periode: periodeStr,
      total_incidents: total,
      incidents_resolus: resolus,
      incidents_en_cours: enCours,
      incidents_bitrix: bitrix,
      taux_resolution: taux,
      incidents_par_type: topTypes,
      operateurs_performance: operateursPerf,
      nombre_clients_impactes: new Set(incidents.map((i) => i.id_client)).size,
      nombre_operateurs_actifs: new Set(
        incidents.filter((i) => i.id_operateur).map((i) => i.id_operateur),
      ).size,
      agence_id: agenceId,
      agence_label: agenceLabel,
      clientes_categoria: {
        incidents_corporativo: incidentsCorporativo,
        incidents_particular: incidentsParticular,
        clientes_corporativo: clientsCorporativo.size,
        clientes_particular: clientsParticular.size,
      },
      notas_del_dia: notasDelDia,
      evolution,
      activite_utilisateurs: Object.entries(activite)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([usuario, stats]) => ({
          usuario,
          total: stats.total,
          solucionadas: stats.solucionadas,
          bitrix: stats.bitrix,
        })),
    };
  } catch (err) {
    return {
      periode: "Error de recopilación",
      total_incidents: 0,
      incidents_resolus: 0,
      incidents_en_cours: 0,
      incidents_bitrix: 0,
      taux_resolution: 0,
      incidents_par_type: {},
      operateurs_performance: {},
      nombre_clients_impactes: 0,
      nombre_operateurs_actifs: 0,
      agence_id: null,
      agence_label: "",
      clientes_categoria: {
        incidents_corporativo: 0,
        incidents_particular: 0,
        clientes_corporativo: 0,
        clientes_particular: 0,
      },
      notas_del_dia: [],
      evolution: [],
      activite_utilisateurs: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function parseParametres(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Miroir de `json.dumps(..., ensure_ascii=False)` Python (séparateurs `, ` / `: `).
 * Requis pour `etatVisible` qui cherche `"agence_id": N` avec espace.
 */
export function dumpParametres(obj: Record<string, unknown>): string {
  const parts = Object.entries(obj).map(([key, value]) => `"${key}": ${JSON.stringify(value)}`);
  return `{${parts.join(", ")}}`;
}

function joinApreciacionesTexto(
  rows: Array<{
    texto: string;
    ciudad: { nombre: string } | null;
    agencia: { nombre: string } | null;
  }>,
): string {
  if (!rows.length) {
    return "";
  }
  if (rows.length === 1) {
    return rows[0].texto;
  }
  return rows
    .map((row) => {
      const where = [row.ciudad?.nombre, row.agencia?.nombre].filter(Boolean).join(" · ");
      return where ? `${where}: ${row.texto}` : row.texto;
    })
    .join(" | ");
}
