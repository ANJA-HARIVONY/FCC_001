import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { isSuperadmin } from "@fcc/domain";

import type { SessionRecord } from "../auth/session-store.ts";
import {
  buildFichaWorkbook,
  buildStatusDelayRows,
  fichaExportFilename,
  paginateRows,
  parseFichaFilters,
  type DelayHistorial,
} from "./ficha-retraso.ts";
import { PrismaService } from "../prisma/prisma.service.ts";
import {
  backupFilename,
  buildSqlDump,
  databaseLabel,
  publicExportError,
  quoteIdent,
  type DumpTable,
} from "./sql-export.ts";

@Injectable()
export class AdminOpsService {
  constructor(private readonly prisma: PrismaService) {}

  async audit(query: Record<string, string | undefined>, user: SessionRecord) {
    this.assert(user);
    const page = Math.max(1, Number(query.page) || 1);
    const where = auditWhere(query);
    const [total, rows, users] = await Promise.all([
      this.prisma.audit_log.count({ where }),
      this.prisma.audit_log.findMany({
        where,
        include: { operateur: true },
        orderBy: { date_heure: "desc" },
        skip: (page - 1) * 50,
        take: 50,
      }),
      this.prisma.operateur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        detail: r.detail,
        ip: r.ip_address,
        date_heure: r.date_heure.toISOString(),
        usuario: r.operateur?.nom ?? "N/A",
      })),
      page,
      pages: Math.max(1, Math.ceil(total / 50)),
      total,
      users,
    };
  }

  async auditText(query: Record<string, string | undefined>, user: SessionRecord) {
    this.assert(user);
    const rows = await this.prisma.audit_log.findMany({
      where: auditWhere(query),
      include: { operateur: true },
      orderBy: { date_heure: "desc" },
    });
    const lines = [
      "TRAZABILIDAD FCC_001",
      `Generado: ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
      `Filtros: user_id=${query.user_id || "ALL"} | desde=${query.date_from || "N/A"} | hasta=${query.date_to || "N/A"}`,
      "-".repeat(80),
    ];
    for (const row of rows) {
      const name = row.operateur?.nom ?? "N/A";
      lines.push(
        `${row.date_heure.toISOString().slice(0, 19).replace("T", " ")} | ${name} | ${row.action} | IP=${row.ip_address || "-"} | ${row.detail || ""}`,
      );
    }
    return `${lines.join("\n")}\n`;
  }

  async verificar(user: SessionRecord) {
    this.assert(user);
    await this.prisma.$queryRawUnsafe("SELECT 1");
    const tables = await this.prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name",
    );
    const counts: Record<string, number> = {};
    let errors = 0;
    for (const table of tables) {
      const name = table.table_name;
      try {
        const rows = await this.prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
          `SELECT COUNT(*) AS c FROM \`${name.replace(/`/g, "")}\``,
        );
        counts[name] = Number(rows[0]?.c ?? 0);
      } catch {
        counts[name] = -1;
        errors += 1;
      }
    }
    return {
      connection: { ok: true, message: "Conexión exitosa" },
      counts,
      summary: {
        status: errors ? "ERROR" : "OK",
        tables: tables.length,
        errors,
      },
    };
  }

  async exportSql(user: SessionRecord) {
    this.assert(user);
    const label = databaseLabel();
    const started = new Date();
    try {
      const listed = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>("SHOW TABLES");
      const names = listed.map((row) => String(Object.values(row)[0] ?? "")).filter(Boolean);
      const tables: DumpTable[] = [];
      for (const name of names) {
        const ident = quoteIdent(name);
        const created = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SHOW CREATE TABLE ${ident}`,
        );
        const createSql = String(Object.values(created[0] ?? {})[1] ?? "");
        if (!createSql) {
          throw new Error(`No se pudo leer la estructura de ${name}.`);
        }
        const columns = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SHOW COLUMNS FROM ${ident}`,
        );
        const columnNames = columns.map((row) => String(row.Field ?? row.field ?? Object.values(row)[0] ?? ""));
        const data = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM ${ident}`);
        tables.push({
          name,
          createSql,
          columns: columnNames,
          rows: data.map((row) => columnNames.map((column) => row[column])),
        });
      }
      const sql = buildSqlDump({ ...label, exportedAt: started, tables });
      return { buffer: Buffer.from(sql, "utf8"), filename: backupFilename(started) };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        { ok: false, error: `Error al exportar la base de datos: ${publicExportError(err)}` },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async ficha(userId: number, query: Record<string, string | undefined>, user: SessionRecord) {
    if (!isSuperadmin(user.role) && user.role !== "admin") {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    const usuario = await this.prisma.operateur.findUnique({ where: { id: userId } });
    if (!usuario || usuario.categoria !== "atencion_cliente") {
      throw new HttpException(
        { ok: false, error: "Este usuario no es de Atención al cliente." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const filters = parseFichaFilters(query);
    const built = await this.delayRows(userId, filters);
    const page = paginateRows(built.rows, Number(query.page) || 1, Number(query.per_page) || 50);
    return {
      usuario: { id: usuario.id, nom: usuario.nom, categoria: usuario.categoria },
      umbral: filters.umbral,
      date_from: filters.date_from,
      date_to: filters.date_to,
      estado_destino: filters.estado_destino,
      ...page,
      kpis: built.kpis,
    };
  }

  async fichaXlsx(userId: number, query: Record<string, string | undefined>, user: SessionRecord) {
    const payload = await this.ficha(userId, query, user);
    const filters = parseFichaFilters(query);
    const built = await this.delayRows(userId, filters);
    const buffer = await buildFichaWorkbook(payload.usuario.nom, built.rows, filters, built.kpis);
    return { buffer, filename: fichaExportFilename(payload.usuario.nom) };
  }

  private async delayRows(userId: number, filters: ReturnType<typeof parseFichaFilters>) {
    const historial = await this.prisma.incident_estado_historial.findMany({
      where: { id_operateur: userId },
      orderBy: { cambiado_en: "desc" },
    });
    const incidentIds = [...new Set(historial.map((row) => row.id_incident))];
    const [incidents, history, comments] = await Promise.all([
      incidentIds.length
        ? this.prisma.incident.findMany({ where: { id: { in: incidentIds } }, include: { client: true } })
        : Promise.resolve([]),
      incidentIds.length
        ? this.prisma.incident_estado_historial.findMany({
            where: { id_incident: { in: incidentIds } },
            orderBy: [{ id_incident: "asc" }, { cambiado_en: "asc" }, { id: "asc" }],
          })
        : Promise.resolve([]),
      incidentIds.length
        ? this.prisma.incident_comentario.findMany({
            where: { id_incident: { in: incidentIds } },
            orderBy: { creado_en: "asc" },
          })
        : Promise.resolve([]),
    ]);
    const asHist = (row: (typeof historial)[number]): DelayHistorial => ({
      id: row.id,
      id_incident: row.id_incident,
      estado_anterior: row.estado_anterior,
      estado_nuevo: row.estado_nuevo,
      cambiado_en: row.cambiado_en,
      ref_bitrix: row.ref_bitrix,
    });
    return buildStatusDelayRows(
      historial.map(asHist),
      incidents.map((row) => ({
        id: row.id,
        intitule: row.intitule,
        date_heure: row.date_heure,
        observations: row.observations,
        ref_bitrix: row.ref_bitrix,
        client: row.client ? { nom: row.client.nom, ville: row.client.ville, categoria: row.client.categoria } : null,
      })),
      history.map(asHist),
      comments.map((row) => ({ id_incident: row.id_incident, contenido: row.contenido, creado_en: row.creado_en })),
      filters,
    );
  }

  private assert(user: SessionRecord) {
    if (!isSuperadmin(user.role)) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
  }
}

function auditWhere(query: Record<string, string | undefined>) {
  const where: { id_operateur?: number; date_heure?: { gte?: Date; lte?: Date } } = {};
  const userId = Number(query.user_id);
  if (Number.isInteger(userId) && userId > 0) where.id_operateur = userId;
  const dateHeure: { gte?: Date; lte?: Date } = {};
  if (query.date_from && /^\d{4}-\d{2}-\d{2}$/.test(query.date_from)) {
    dateHeure.gte = new Date(`${query.date_from}T00:00:00`);
  }
  if (query.date_to && /^\d{4}-\d{2}-\d{2}$/.test(query.date_to)) {
    dateHeure.lte = new Date(`${query.date_to}T23:59:59`);
  }
  if (!query.date_from && !query.date_to) {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    dateHeure.gte = from;
  }
  if (dateHeure.gte || dateHeure.lte) where.date_heure = dateHeure;
  return where;
}
