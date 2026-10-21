import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  COMMENT_MAX,
  canAccessIncident,
  canDeleteIncident,
  canModifyIncident,
  clientInMovementCiudad,
  clampListPerPage,
  isSuperadmin,
  normalizeIncidentStatus,
  normalizeRefBitrix,
  seesAllMovements,
  type Actor,
} from "@fcc/domain";
import type { Prisma } from "@prisma/client";

import type { AuditWriter } from "../auth/auth.contracts.ts";
import { AUDIT_WRITER } from "../auth/auth.service.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { PrismaService } from "../prisma/prisma.service.ts";
import {
  BITRIX_ERROR_DISABLED,
  applyBitrixCache,
  bitrixApiEnabled,
  bitrixStatusChoices,
  buildBitrixExtras,
  fetchBitrixTask,
  normalizeBitrixStatusFilter,
  shouldFetchBitrix,
  type BitrixTaskInfo,
} from "./bitrix.ts";
import { buildIncidentsWorkbook, incidentsExportFilename } from "./export-xlsx.ts";
import { selectPendientes } from "./pendientes.ts";

export interface IncidentListQuery {
  page?: string | number;
  per_page?: string | number;
  search?: string;
  status?: string;
  bitrix_status?: string;
  operateur?: string;
  ciudad?: string;
  agencia?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  order?: string;
}

export interface IncidentWriteInput {
  id_client: number;
  intitule: string;
  observations?: string | null;
  status: string;
  ref_bitrix?: string | null;
}

@Injectable()
export class IncidenciasService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async list(query: IncidentListQuery, user: SessionRecord) {
    const page = Math.max(1, Number(query.page) || 1);
    const perPage = clampListPerPage(query.per_page);
    const search = (query.search ?? "").trim();
    const statusFilter = normalizeOptionalStatus(query.status);
    const bitrixStatus = normalizeBitrixStatusFilter(statusFilter, query.bitrix_status);
    const sort = normalizeIncidentSort(query.sort, statusFilter);
    const order = query.order === "asc" ? "asc" : "desc";
    const actor = actorFrom(user);

    const { ciudadId, agenciaId, ciudadFilter, agenciaFilter } = await this.normalizeCiudadAgencia(
      user,
      query.ciudad,
      query.agencia,
    );

    let operateurId: number | null = null;
    let operateurFilter = (query.operateur ?? "").trim();
    if (operateurFilter) {
      const parsed = Number(operateurFilter);
      if (Number.isInteger(parsed)) {
        if (!seesAllMovements(actor)) {
          const allowed = await this.prisma.operateur.findFirst({
            where: {
              id: parsed,
              id_agencia: user.idAgencia,
              id_ciudad: user.idCiudad,
              actif: true,
            },
          });
          if (!allowed) {
            operateurFilter = "";
          } else {
            operateurId = parsed;
          }
        } else {
          operateurId = parsed;
        }
      } else {
        operateurFilter = "";
      }
    }

    const and: Prisma.incidentWhereInput[] = [visibilityWhere(user)];
    if (statusFilter) {
      and.push({ status: statusFilter });
      if (bitrixStatus === "_none") {
        and.push({ bitrix_task_status: null });
      } else if (bitrixStatus) {
        and.push({ bitrix_task_status: bitrixStatus });
      }
    }
    if (operateurId != null) {
      and.push({ id_operateur: operateurId });
    }
    if (ciudadId != null) {
      and.push({ client: { id_ciudad: ciudadId } });
    }
    if (agenciaId != null) {
      and.push({ operateur: { id_agencia: agenciaId } });
    }
    if (search) {
      and.push({
        OR: [
          { intitule: { contains: search } },
          { observations: { contains: search } },
          { client: { nom: { contains: search } } },
        ],
      });
    }
    const dateFrom = parseDateStart(query.date_from);
    const dateTo = parseDateEnd(query.date_to);
    if (dateFrom || dateTo) {
      and.push({
        date_heure: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      });
    }
    const where: Prisma.incidentWhereInput = { AND: and };

    const orderBy = orderByIncidents(sort, order, statusFilter === "Bitrix");
    const [total, rows, corporativo, particular, meta] = await Promise.all([
      this.prisma.incident.count({ where }),
      this.prisma.incident.findMany({
        where,
        include: {
          client: true,
          operateur: true,
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.incident.count({
        where: { AND: [where, { client: { categoria: "corporativo" } }] },
      }),
      this.prisma.incident.count({
        where: { AND: [where, { client: { categoria: "particular" } }] },
      }),
      this.filterMeta(user),
    ]);

    return {
      items: rows.map((row) => serializeListItem(row, actor)),
      page,
      pages: Math.max(1, Math.ceil(total / perPage)),
      per_page: perPage,
      total,
      counts: { corporativo, particular },
      filters: {
        search,
        status: statusFilter,
        bitrix_status: bitrixStatus,
        operateur: operateurFilter,
        ciudad: ciudadFilter,
        agencia: agenciaFilter,
        date_from: (query.date_from ?? "").trim(),
        date_to: (query.date_to ?? "").trim(),
        sort,
        order,
      },
      meta,
    };
  }

  async exportXlsx(query: IncidentListQuery, user: SessionRecord) {
    const payload = await this.list(query, user);
    const buffer = await buildIncidentsWorkbook(payload.items);
    return { buffer, filename: incidentsExportFilename() };
  }

  async bitrixInfo(id: number, user: SessionRecord, force: boolean) {
    const row = await this.loadIncident(id);
    if (!row) {
      throw new HttpException({ ok: false, error: "Incidencia no encontrada." }, HttpStatus.NOT_FOUND);
    }
    const actor = actorFrom(user);
    if (!canAccessIncident(actor, toAccess(row))) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    if (row.status !== "Bitrix" || !row.ref_bitrix?.trim()) {
      throw new HttpException(
        { ok: false, error: "Incidencia no Bitrix o sin ref_bitrix." },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!bitrixApiEnabled()) {
      return { ok: false as const, error: BITRIX_ERROR_DISABLED };
    }
    const cached = publicBitrix(row);
    if (!shouldFetchBitrix(row, { force })) {
      if (!cached) {
        return { ok: false as const, error: "BITRIX24_API no configurada" };
      }
      return { ok: true as const, data: cached, cached: true };
    }
    const info = await fetchBitrixTask(process.env.BITRIX24_API ?? "", row.ref_bitrix);
    if ("error" in info) {
      if (cached) {
        return { ok: true as const, data: cached, cached: true };
      }
      return { ok: false as const, error: info.error };
    }
    await this.prisma.incident.update({
      where: { id: row.id },
      data: applyBitrixCache(row.bitrix_changed_at, info),
    });
    return { ok: true as const, data: publicFromFetch(info), cached: false };
  }

  async get(id: number, user: SessionRecord) {
    const row = await this.loadIncident(id);
    if (!row) {
      throw new HttpException({ ok: false, error: "Incidencia no encontrada." }, HttpStatus.NOT_FOUND);
    }
    const actor = actorFrom(user);
    const access = toAccess(row);
    if (!canAccessIncident(actor, access)) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    await this.prisma.incident_notification.updateMany({
      where: { id_incident: id, id_destinataire: user.userId, lue: false },
      data: { lue: true, lue_le: new Date() },
    });
    let bitrixError: string | null = null;
    if (shouldFetchBitrix(row) && row.ref_bitrix) {
      const info = await fetchBitrixTask(process.env.BITRIX24_API ?? "", row.ref_bitrix);
      if ("error" in info) {
        if (!row.bitrix_task_status) {
          bitrixError = info.error;
        }
      } else {
        const cached = applyBitrixCache(row.bitrix_changed_at, info);
        await this.prisma.incident.update({ where: { id: row.id }, data: cached });
        Object.assign(row, cached);
      }
    }
    const [comentarios, historial, modifiePar] = await Promise.all([
      this.prisma.incident_comentario.findMany({
        where: { id_incident: id },
        include: { operateur: true },
        orderBy: { creado_en: "asc" },
      }),
      this.prisma.incident_estado_historial.findMany({
        where: { id_incident: id },
        include: { operateur: true },
        orderBy: { cambiado_en: "asc" },
      }),
      row.id_operateur_modificacion
        ? this.prisma.operateur.findUnique({ where: { id: row.id_operateur_modificacion } })
        : null,
    ]);
    return {
      ...serializeDetail(row, actor, modifiePar?.nom ?? null),
      bitrix_api_enabled: bitrixApiEnabled(),
      bitrix_error: bitrixError,
      bitrix_extras: buildBitrixExtras(row),
      comentarios: comentarios.map((c) => ({
        id: c.id,
        contenido: c.contenido,
        creado_en: c.creado_en.toISOString(),
        operateur: c.operateur
          ? { id: c.operateur.id, nom: c.operateur.nom, avatar_url: c.operateur.avatar_url ?? null }
          : null,
      })),
      historial: historial.map((h) => ({
        id: h.id,
        estado_anterior: h.estado_anterior,
        estado_nuevo: h.estado_nuevo,
        ref_bitrix: h.ref_bitrix,
        cambiado_en: h.cambiado_en.toISOString(),
        operateur: h.operateur ? { id: h.operateur.id, nom: h.operateur.nom } : null,
      })),
    };
  }

  async create(input: IncidentWriteInput, user: SessionRecord) {
    const actor = actorFrom(user);
    const client = await this.prisma.client.findUnique({ where: { id: Number(input.id_client) } });
    if (!client) {
      throw new HttpException({ ok: false, error: "Cliente no encontrado." }, HttpStatus.BAD_REQUEST);
    }
    if (!clientInMovementCiudad(actor, { idCiudad: client.id_ciudad })) {
      throw new HttpException(
        { ok: false, error: "Solo puede registrar una incidencia de un cliente de su ciudad." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const status = normalizeIncidentStatus(input.status);
    const observations = (input.observations ?? "").trim() || null;
    let ref = normalizeRefBitrix(status, input.ref_bitrix);
    if (status === "Bitrix" && !ref) {
      ref = normalizeRefBitrix(status, extractRefBitrix(observations));
    }
    const intitule = (input.intitule ?? "").trim();
    if (!intitule) {
      throw new HttpException({ ok: false, error: "El asunto es obligatorio." }, HttpStatus.BAD_REQUEST);
    }
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const incident = await tx.incident.create({
        data: {
          id_client: client.id,
          intitule,
          observations,
          status,
          ref_bitrix: ref,
          id_operateur: user.userId,
          date_heure: now,
        },
      });
      await tx.incident_estado_historial.create({
        data: {
          id_incident: incident.id,
          estado_anterior: null,
          estado_nuevo: status,
          id_operateur: user.userId,
          cambiado_en: now,
          ref_bitrix: ref,
        },
      });
      return incident;
    });
    await this.audit.write("CREATE_INCIDENT", user.userId, `incident_id=${created.id},status=${status}`);
    return this.get(created.id, user);
  }

  async update(id: number, input: IncidentWriteInput, user: SessionRecord) {
    const existing = await this.loadIncident(id);
    if (!existing) {
      throw new HttpException({ ok: false, error: "Incidencia no encontrada." }, HttpStatus.NOT_FOUND);
    }
    const actor = actorFrom(user);
    if (!canModifyIncident(actor, toAccess(existing))) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    const client = await this.prisma.client.findUnique({ where: { id: Number(input.id_client) } });
    if (!client) {
      throw new HttpException({ ok: false, error: "Cliente no encontrado." }, HttpStatus.BAD_REQUEST);
    }
    if (!clientInMovementCiudad(actor, { idCiudad: client.id_ciudad })) {
      throw new HttpException(
        { ok: false, error: "Solo puede registrar una incidencia de un cliente de su ciudad." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const oldStatus = existing.status;
    const oldRef = existing.ref_bitrix;
    const status = normalizeIncidentStatus(input.status, normalizeIncidentStatus(oldStatus));
    const observations = (input.observations ?? "").trim() || null;
    let ref = normalizeRefBitrix(status, input.ref_bitrix);
    if (status === "Bitrix" && !ref) {
      ref = normalizeRefBitrix(status, extractRefBitrix(observations));
    }
    const intitule = (input.intitule ?? "").trim();
    if (!intitule) {
      throw new HttpException({ ok: false, error: "El asunto es obligatorio." }, HttpStatus.BAD_REQUEST);
    }
    const statusChanged = oldStatus !== status;
    const clearCache = status !== "Bitrix" || ref !== oldRef || statusChanged;
    const data: Prisma.incidentUncheckedUpdateInput = {
      id_client: client.id,
      intitule,
      observations,
      status,
      ref_bitrix: ref,
      id_operateur_modificacion: user.userId,
      modifie_le: new Date(),
    };
    if (clearCache) {
      Object.assign(data, clearedBitrixFields());
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({ where: { id }, data });
      if (statusChanged) {
        await tx.incident_estado_historial.create({
          data: {
            id_incident: id,
            estado_anterior: oldStatus,
            estado_nuevo: status,
            id_operateur: user.userId,
            cambiado_en: new Date(),
            ref_bitrix: ref,
          },
        });
      }
    });
    const detail = statusChanged ? `incident_id=${id},${oldStatus}→${status}` : `incident_id=${id}`;
    await this.audit.write("UPDATE_INCIDENT", user.userId, detail);
    return this.get(id, user);
  }

  async remove(id: number, user: SessionRecord) {
    const existing = await this.prisma.incident.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ ok: false, error: "Incidencia no encontrada." }, HttpStatus.NOT_FOUND);
    }
    const actor = actorFrom(user);
    if (!canDeleteIncident(actor, { creatorId: existing.id_operateur })) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    await this.prisma.incident.delete({ where: { id } });
    await this.audit.write("DELETE_INCIDENT", user.userId, `incident_id=${id}`);
    return { ok: true };
  }

  async addComment(id: number, contenidoRaw: string, user: SessionRecord) {
    const existing = await this.loadIncident(id);
    if (!existing) {
      throw new HttpException({ ok: false, error: "Incidencia no encontrada." }, HttpStatus.NOT_FOUND);
    }
    const actor = actorFrom(user);
    if (!canAccessIncident(actor, toAccess(existing))) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    const contenido = (contenidoRaw ?? "").trim();
    if (!contenido) {
      throw new HttpException({ ok: false, error: "El comentario no puede estar vacío." }, HttpStatus.BAD_REQUEST);
    }
    if (contenido.length > COMMENT_MAX) {
      throw new HttpException(
        { ok: false, error: "El comentario no puede superar 1000 caracteres." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const recipientIds = new Set<number>();
    if (existing.id_operateur !== user.userId) {
      recipientIds.add(existing.id_operateur);
    }
    const previous = await this.prisma.incident_comentario.findMany({
      where: {
        id_incident: id,
        id_operateur: { not: null },
        NOT: { id_operateur: user.userId },
      },
      select: { id_operateur: true },
      distinct: ["id_operateur"],
    });
    for (const row of previous) {
      if (row.id_operateur != null) {
        recipientIds.add(row.id_operateur);
      }
    }
    const clientName = existing.client.nom;
    const message = `El usuario ${user.nom} ha comentado su incidencia del cliente ${clientName}.`;
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.incident_comentario.create({
        data: {
          id_incident: id,
          id_operateur: user.userId,
          contenido,
          creado_en: now,
        },
      });
      if (recipientIds.size > 0) {
        await tx.incident_notification.createMany({
          data: [...recipientIds].map((destinataire) => ({
            id_incident: id,
            id_destinataire: destinataire,
            id_auteur: user.userId,
            message: message.slice(0, 255),
            lue: false,
            cree_le: now,
          })),
        });
      }
    });
    await this.audit.write("COMMENT_INCIDENT", user.userId, `incident_id=${id}`);
    return this.get(id, user);
  }

  async clientsForMovement(user: SessionRecord) {
    const actor = actorFrom(user);
    const where: Prisma.clientWhereInput = {};
    if (!seesAllMovements(actor)) {
      where.id_ciudad = user.idCiudad;
    }
    const rows = await this.prisma.client.findMany({
      where,
      orderBy: { nom: "asc" },
      select: {
        id: true,
        nom: true,
        telephone: true,
        ville: true,
        adresse: true,
        id_ciudad: true,
        categoria: true,
        ip_router: true,
        ip_antea: true,
      },
    });
    return rows;
  }

  private async filterMeta(user: SessionRecord) {
    const actor = actorFrom(user);
    const operateursWhere: Prisma.operateurWhereInput = { actif: true };
    if (!seesAllMovements(actor)) {
      operateursWhere.id_agencia = user.idAgencia;
      operateursWhere.id_ciudad = user.idCiudad;
    }
    const [operateurs, ciudades, agencias] = await Promise.all([
      this.prisma.operateur.findMany({
        where: operateursWhere,
        orderBy: { nom: "asc" },
        select: { id: true, nom: true },
      }),
      this.prisma.ciudad.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
      this.prisma.agencia.findMany({
        where: seesAllMovements(actor) ? undefined : { id: user.idAgencia },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, id_ciudad: true },
      }),
    ]);
    return {
      operateurs,
      ciudades,
      agencias,
      bitrix_status_choices: bitrixStatusChoices(),
      bitrix_api_enabled: bitrixApiEnabled(),
    };
  }

  async pendientes(user: SessionRecord, now = new Date()) {
    const limite = new Date(now.getTime() - 30 * 60 * 1000);
    const rows = await this.prisma.incident.findMany({
      where: {
        status: "Pendiente",
        date_heure: { lte: limite },
        ...visibilityWhere(user),
      },
      include: { client: true, operateur: true },
      orderBy: { date_heure: "asc" },
    });
    const notifications = selectPendientes(
      rows.map((incident) => ({
        id: incident.id,
        intitule: incident.intitule,
        date_heure: incident.date_heure,
        client_nom: incident.client.nom,
        client_ville: incident.client.ville ?? "",
        operateur_nom: incident.operateur.nom,
        creatorAgenciaId: incident.operateur.id_agencia ?? 0,
        clientCiudadId: incident.client.id_ciudad,
      })),
      actorFrom(user),
      now,
    );
    return { success: true, count: notifications.length, notifications };
  }

  private async normalizeCiudadAgencia(user: SessionRecord, ciudadRaw?: string, agenciaRaw?: string) {
    const actor = actorFrom(user);
    let ciudadFilter = (ciudadRaw ?? "").trim();
    let agenciaFilter = (agenciaRaw ?? "").trim();
    let ciudadId: number | null = null;
    let agenciaId: number | null = null;
    if (ciudadFilter) {
      const parsed = Number(ciudadFilter);
      if (Number.isInteger(parsed)) {
        const exists = await this.prisma.ciudad.findUnique({ where: { id: parsed } });
        if (exists) {
          ciudadId = parsed;
        } else {
          ciudadFilter = "";
        }
      } else {
        ciudadFilter = "";
      }
    }
    if (agenciaFilter) {
      const parsed = Number(agenciaFilter);
      if (Number.isInteger(parsed)) {
        const agencia = await this.prisma.agencia.findUnique({ where: { id: parsed } });
        if (!agencia) {
          agenciaFilter = "";
        } else if (ciudadId && agencia.id_ciudad !== ciudadId) {
          agenciaFilter = "";
        } else if (!seesAllMovements(actor) && parsed !== user.idAgencia) {
          agenciaFilter = "";
        } else {
          agenciaId = parsed;
        }
      } else {
        agenciaFilter = "";
      }
    }
    if (!seesAllMovements(actor) && ciudadId && ciudadId !== user.idCiudad) {
      ciudadFilter = "";
      ciudadId = null;
    }
    return { ciudadId, agenciaId, ciudadFilter, agenciaFilter };
  }

  private loadIncident(id: number) {
    return this.prisma.incident.findUnique({
      where: { id },
      include: { client: true, operateur: true },
    });
  }
}

function actorFrom(user: SessionRecord): Actor {
  return {
    id: user.userId,
    role: user.role,
    idAgencia: user.idAgencia,
    idCiudad: user.idCiudad,
    authenticated: true,
  };
}

function visibilityWhere(user: SessionRecord): Prisma.incidentWhereInput {
  if (isSuperadmin(user.role)) {
    return {};
  }
  return {
    operateur: { id_agencia: user.idAgencia },
    client: { id_ciudad: user.idCiudad },
  };
}

function toAccess(row: {
  id_operateur: number;
  operateur: { id_agencia: number | null };
  client: { id_ciudad: number | null };
}) {
  return {
    creatorId: row.id_operateur,
    creatorAgenciaId: row.operateur.id_agencia ?? 0,
    clientCiudadId: row.client.id_ciudad,
  };
}

function normalizeOptionalStatus(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) {
    return "";
  }
  return normalizeIncidentStatus(value, "Pendiente") === value ? value : "";
}

function extractRefBitrix(observations: string | null): string | null {
  if (!observations?.trim()) {
    return null;
  }
  const obs = observations.trim();
  if (/^(\d{5,10})$/.test(obs)) {
    return obs;
  }
  const matches = obs.match(/\b(\d{5,10})\b/g);
  return matches?.at(-1) ?? null;
}

function clearedBitrixFields(): Prisma.incidentUncheckedUpdateInput {
  return {
    bitrix_task_status: null,
    bitrix_status_label: null,
    bitrix_status_emoji: null,
    bitrix_responsible: null,
    bitrix_fetched_at: null,
    bitrix_fetch_locked: false,
    bitrix_deadline: null,
    bitrix_created_at: null,
    bitrix_closed_at: null,
    bitrix_changed_at: null,
    bitrix_priority: null,
    bitrix_moved_at: null,
  };
}

function parseDateStart(raw?: string): Date | null {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(raw?: string): Date | null {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const INCIDENT_SORTS = new Set(["client", "asunto", "operador", "fecha", "tecnico"]);

function normalizeIncidentSort(raw: string | undefined, statusFilter: string): string {
  const sort = (raw ?? "fecha").trim() || "fecha";
  if (!INCIDENT_SORTS.has(sort)) {
    return "fecha";
  }
  if (sort === "tecnico" && statusFilter !== "Bitrix") {
    return "fecha";
  }
  return sort;
}

function orderByIncidents(
  sort: string,
  order: "asc" | "desc",
  bitrixList: boolean,
): Prisma.incidentOrderByWithRelationInput | Prisma.incidentOrderByWithRelationInput[] {
  if (sort === "client") {
    return { client: { nom: order } };
  }
  if (sort === "asunto") {
    return { intitule: order };
  }
  if (sort === "operador") {
    return { operateur: { nom: order } };
  }
  if (sort === "tecnico" && bitrixList) {
    return [{ bitrix_responsible: { sort: order, nulls: "first" } }, { date_heure: "desc" }];
  }
  return { date_heure: order };
}

function publicBitrix(row: {
  bitrix_fetched_at: Date | null;
  bitrix_task_status: string | null;
  bitrix_status_label: string | null;
  bitrix_status_emoji: string | null;
  bitrix_responsible: string | null;
}) {
  if (!row.bitrix_fetched_at || !row.bitrix_task_status) {
    return null;
  }
  return {
    task_status: row.bitrix_task_status,
    status_label: row.bitrix_status_label ?? "",
    status_emoji: row.bitrix_status_emoji || "📋",
    responsible_name: row.bitrix_responsible ?? "",
  };
}

function publicFromFetch(info: BitrixTaskInfo) {
  return {
    task_status: info.task_status,
    status_label: info.status_label,
    status_emoji: info.status_emoji,
    responsible_name: info.responsible_name,
  };
}

function serializeListItem(
  row: {
    id: number;
    intitule: string;
    observations: string | null;
    status: string;
    ref_bitrix: string | null;
    date_heure: Date;
    bitrix_task_status: string | null;
    bitrix_status_label: string | null;
    bitrix_status_emoji: string | null;
    bitrix_responsible: string | null;
    bitrix_fetched_at: Date | null;
    bitrix_fetch_locked: boolean;
    client: {
      id: number;
      nom: string;
      adresse: string;
      categoria: string;
      telephone: string;
      ville: string;
      ip_router: string | null;
      ip_antea: string | null;
      username_radius: string | null;
    };
    operateur: { id: number; nom: string; avatar_url?: string | null };
    id_operateur: number;
  },
  actor: Actor,
) {
  return {
    id: row.id,
    intitule: row.intitule,
    observations: row.observations,
    status: row.status,
    ref_bitrix: row.ref_bitrix,
    date_heure: row.date_heure.toISOString(),
    bitrix_task_status: row.bitrix_task_status,
    bitrix_status_label: row.bitrix_status_label,
    bitrix_status_emoji: row.bitrix_status_emoji,
    bitrix_responsible: row.bitrix_responsible,
    bitrix_auto_load: shouldFetchBitrix(row),
    client: {
      id: row.client.id,
      nom: row.client.nom,
      adresse: row.client.adresse,
      categoria: row.client.categoria,
      telephone: row.client.telephone,
      ville: row.client.ville,
      ip_router: row.client.ip_router,
      ip_antea: row.client.ip_antea,
      username_radius: row.client.username_radius,
    },
    operateur: { id: row.operateur.id, nom: row.operateur.nom, avatar_url: row.operateur.avatar_url ?? null },
    can_delete: canDeleteIncident(actor, { creatorId: row.id_operateur }),
    can_modify: true,
  };
}

function serializeDetail(
  row: {
    id: number;
    intitule: string;
    observations: string | null;
    status: string;
    ref_bitrix: string | null;
    date_heure: Date;
    modifie_le: Date | null;
    id_operateur: number;
    bitrix_task_status: string | null;
    bitrix_status_label: string | null;
    bitrix_status_emoji: string | null;
    bitrix_responsible: string | null;
    bitrix_fetch_locked: boolean;
    client: {
      id: number;
      nom: string;
      telephone: string;
      adresse: string;
      ville: string;
      ip_router: string | null;
      ip_antea: string | null;
      username_radius: string | null;
      categoria: string;
      id_ciudad: number | null;
    };
    operateur: { id: number; nom: string; id_agencia: number | null };
  },
  actor: Actor,
  modifieParNom: string | null,
) {
  const access = toAccess(row);
  return {
    id: row.id,
    intitule: row.intitule,
    observations: row.observations,
    status: row.status,
    ref_bitrix: row.ref_bitrix,
    date_heure: row.date_heure.toISOString(),
    modifie_le: row.modifie_le?.toISOString() ?? null,
    modifie_par_nom: modifieParNom,
    bitrix_task_status: row.bitrix_task_status,
    bitrix_status_label: row.bitrix_status_label,
    bitrix_status_emoji: row.bitrix_status_emoji,
    bitrix_responsible: row.bitrix_responsible,
    bitrix_fetch_locked: row.bitrix_fetch_locked,
    client: row.client,
    operateur: { id: row.operateur.id, nom: row.operateur.nom },
    can_modify: canModifyIncident(actor, access),
    can_delete: canDeleteIncident(actor, { creatorId: row.id_operateur }),
  };
}
