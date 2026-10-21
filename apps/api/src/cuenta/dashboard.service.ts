import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { apreciacionWriteScope, isAdmin, isSuperadmin } from "@fcc/domain";
import type { Prisma } from "@prisma/client";

import type { SessionRecord } from "../auth/session-store.ts";
import { getDateRangeForPeriod, isoDay } from "../informes/period.ts";
import { PrismaService } from "../prisma/prisma.service.ts";
import {
  applyNotas,
  buildSerie,
  incidentWhere,
  movementScope,
  normalizeApreciacionTexto,
  notaWhere,
  parseFecha,
  serializeInstalacionDia,
  summarizeIncidents,
} from "./dashboard-rules.ts";
import { actorFrom } from "./usuarios.service.ts";

@Injectable()
export class DashboardService {
  private readonly prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async summary(query: Record<string, string | undefined>, user: SessionRecord) {
    const period = query.period || "current_week";
    const range = getDateRangeForPeriod(period);
    const actor = actorFrom(user);
    const incidents = await this.prisma.incident.findMany({
      where: incidentWhere(query, user),
      include: { client: true, operateur: true },
    });
    const stats = summarizeIncidents(incidents);

    const start = startOfToday();
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const scopeIds = movementScope(query, user);
    const instWhere: Prisma.instalacionWhereInput = { fecha: { gte: start, lt: end } };
    if (scopeIds.agenciaId) {
      instWhere.operateur_instalacion_id_tecnicoTooperateur = { id_agencia: scopeIds.agenciaId };
    }
    if (scopeIds.ciudadId) {
      instWhere.client = { id_ciudad: scopeIds.ciudadId };
    }
    const instalaciones = await this.prisma.instalacion.findMany({
      where: instWhere,
      orderBy: { id: "desc" },
      include: {
        client: true,
        client_sitio_instalacion_id_sitioToclient_sitio: true,
        operateur_instalacion_id_tecnicoTooperateur: true,
        material_salida: { include: { material_salida_linea: { include: { material: true } } } },
      },
    });

    const scope = await this.resolveScope(query, user);
    const note = await this.prisma.apreciacion_dia.findFirst({
      where: { fecha: start, id_ciudad: scope.idCiudad, id_agencia: scope.idAgencia },
    });
    const catalogo = isSuperadmin(user.role)
      ? await Promise.all([
          this.prisma.ciudad.findMany({ orderBy: { nombre: "asc" } }),
          this.prisma.agencia.findMany({ orderBy: { nombre: "asc" } }),
        ])
      : [[], []];

    return {
      period,
      period_date_from: range.debut ? isoDay(range.debut) : "",
      period_date_to: range.fin ? isoDay(range.fin) : "",
      total: stats.total,
      solucionadas: stats.solucionadas,
      pendiente: stats.pendiente,
      bitrix: stats.bitrix,
      instalaciones_dia: instalaciones.map((row) => serializeInstalacionDia(row)),
      por_operador: stats.por_operador,
      clientes: stats.clientes,
      apreciacion: {
        id: note?.id ?? null,
        texto: note?.texto ?? null,
        fecha: isoDay(start),
        ciudad: scope.ciudad,
        agencia: scope.agencia,
      },
      can_edit_apreciacion: isAdmin(actor.role),
      is_admin: isAdmin(actor.role),
      is_superadmin: isSuperadmin(user.role),
      ciudades: catalogo[0].map((c) => ({ id: c.id, nombre: c.nombre })),
      agencias: catalogo[1].map((a) => ({ id: a.id, nombre: a.nombre, id_ciudad: a.id_ciudad })),
      scope,
    };
  }

  async serie(query: Record<string, string | undefined>, user: SessionRecord) {
    const view = query.type === "month" || query.type === "year" ? query.type : "date";
    const rows = await this.prisma.incident.findMany({
      where: incidentWhere(query, user),
      select: { date_heure: true, status: true },
    });
    const items = buildSerie(rows, view);
    if (view === "date" && items.length) {
      await this.attachNotas(items, query, user);
    }
    return items;
  }

  async getApreciacion(query: Record<string, string | undefined>, user: SessionRecord) {
    const fecha = parseFecha(query.fecha);
    const scope = await this.resolveScope(query, user);
    const row = await this.prisma.apreciacion_dia.findFirst({
      where: { fecha, id_ciudad: scope.idCiudad, id_agencia: scope.idAgencia },
    });
    return {
      id: row?.id ?? null,
      fecha: query.fecha,
      texto: row?.texto ?? null,
      id_operateur: row?.id_operateur ?? null,
      ciudad: scope.ciudad,
      agencia: scope.agencia,
      id_ciudad: scope.idCiudad,
      id_agencia: scope.idAgencia,
    };
  }

  async putApreciacion(
    body: { fecha?: string; texto?: string; ciudad?: string; agencia?: string },
    user: SessionRecord,
  ) {
    if (!isAdmin(user.role)) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    const fecha = parseFecha(body.fecha);
    const texto = normalizeApreciacionTexto(body.texto);
    const scope = await this.resolveScope({ ciudad: body.ciudad, agencia: body.agencia }, user);
    const existing = await this.prisma.apreciacion_dia.findFirst({
      where: { fecha, id_ciudad: scope.idCiudad, id_agencia: scope.idAgencia },
    });
    const now = new Date();
    const row = existing
      ? await this.prisma.apreciacion_dia.update({
          where: { id: existing.id },
          data: { texto, modificado_en: now },
        })
      : await this.prisma.apreciacion_dia.create({
          data: {
            fecha,
            texto,
            id_operateur: user.userId,
            id_ciudad: scope.idCiudad,
            id_agencia: scope.idAgencia,
            creado_en: now,
            modificado_en: now,
          },
        });
    return {
      id: row.id,
      fecha: body.fecha,
      texto: row.texto,
      ciudad: scope.ciudad,
      agencia: scope.agencia,
    };
  }

  async deleteApreciacion(query: Record<string, string | undefined>, user: SessionRecord) {
    if (!isAdmin(user.role)) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    const fecha = parseFecha(query.fecha);
    const scope = await this.resolveScope(query, user);
    const row = await this.prisma.apreciacion_dia.findFirst({
      where: { fecha, id_ciudad: scope.idCiudad, id_agencia: scope.idAgencia },
    });
    if (!row) {
      throw new HttpException({ ok: false, error: "No hay apreciación para esta fecha." }, HttpStatus.NOT_FOUND);
    }
    if (row.id_operateur == null && !isSuperadmin(user.role)) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    await this.prisma.apreciacion_dia.delete({ where: { id: row.id } });
    return { fecha: query.fecha, texto: null };
  }

  async search(q: string, user: SessionRecord) {
    const query = (q ?? "").trim();
    if (!query) {
      return { clients: [], incidents: [] };
    }
    const incidentWhere: Prisma.incidentWhereInput = { intitule: { contains: query } };
    if (!isSuperadmin(user.role)) {
      incidentWhere.operateur = { id_agencia: user.idAgencia };
      incidentWhere.client = { id_ciudad: user.idCiudad };
    }
    const [clients, incidents] = await Promise.all([
      this.prisma.client.findMany({
        where: { nom: { contains: query } },
        take: 20,
        orderBy: { nom: "asc" },
      }),
      this.prisma.incident.findMany({
        where: incidentWhere,
        take: 20,
        include: { client: true },
        orderBy: { date_heure: "desc" },
      }),
    ]);
    return {
      clients: clients.map((c) => ({ id: c.id, nom: c.nom, telephone: c.telephone, ville: c.ville })),
      incidents: incidents.map((i) => ({
        id: i.id,
        intitule: i.intitule,
        status: i.status,
        client: i.client?.nom ?? "",
      })),
    };
  }

  async notifications(user: SessionRecord) {
    const rows = await this.prisma.incident_notification.findMany({
      where: { id_destinataire: user.userId },
      orderBy: { cree_le: "desc" },
      take: 20,
      include: { incident: true },
    });
    return {
      unread: rows.filter((r) => !r.lue).length,
      items: rows.map((r) => ({
        id: r.id,
        message: r.message,
        lue: r.lue,
        id_incident: r.id_incident,
        intitule: r.incident?.intitule ?? "",
        cree_le: r.cree_le.toISOString(),
      })),
    };
  }

  async markRead(id: number, user: SessionRecord) {
    const row = await this.prisma.incident_notification.findFirst({
      where: { id, id_destinataire: user.userId },
    });
    if (!row) {
      throw new HttpException({ ok: false, error: "Notificación no encontrada." }, HttpStatus.NOT_FOUND);
    }
    await this.prisma.incident_notification.update({
      where: { id },
      data: { lue: true, lue_le: new Date() },
    });
    return { ok: true };
  }

  private async attachNotas(
    items: Parameters<typeof applyNotas>[0],
    query: Record<string, string | undefined>,
    user: SessionRecord,
  ) {
    const notes = await this.prisma.apreciacion_dia.findMany({
      where: notaWhere(query, user),
      include: { ciudad: true, agencia: true },
    });
    applyNotas(
      items,
      notes.map((note) => ({
        id: note.id,
        texto: note.texto,
        fecha: note.fecha,
        ciudad: note.ciudad?.nombre ?? "",
        agencia: note.agencia?.nombre ?? "",
      })),
    );
  }

  private async resolveScope(query: Record<string, string | undefined>, user: SessionRecord) {
    const actor = actorFrom(user);
    let ciudadId = Number(query.ciudad) || null;
    let agenciaId = Number(query.agencia) || null;
    let agenciaCiudadId: number | null = null;
    if (agenciaId) {
      const ag = await this.prisma.agencia.findUnique({ where: { id: agenciaId } });
      agenciaCiudadId = ag?.id_ciudad ?? null;
      if (!ag) agenciaId = null;
    }
    if (ciudadId) {
      const c = await this.prisma.ciudad.findUnique({ where: { id: ciudadId } });
      if (!c) ciudadId = null;
    }
    const scope = apreciacionWriteScope(actor, {
      ciudadId,
      agenciaId,
      agenciaCiudadId,
    });
    const [ciudad, agencia] = await Promise.all([
      this.prisma.ciudad.findUnique({ where: { id: scope.idCiudad } }),
      this.prisma.agencia.findUnique({ where: { id: scope.idAgencia } }),
    ]);
    return {
      idCiudad: scope.idCiudad,
      idAgencia: scope.idAgencia,
      ciudad: ciudad?.nombre ?? "",
      agencia: agencia?.nombre ?? "",
    };
  }
}

function startOfToday(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}
