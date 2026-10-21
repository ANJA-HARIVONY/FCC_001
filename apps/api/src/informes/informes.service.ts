import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { etatVisible, isSuperadmin, type Actor } from "@fcc/domain";

import type { SessionRecord } from "../auth/session-store.ts";
import { PrismaService } from "../prisma/prisma.service.ts";
import { TYPE_ETATS, TYPE_TITLE, isTypeEtat, PERIODES } from "./catalog.ts";
import { collectDataContext, dumpParametres, parseParametres } from "./data-context.ts";
import { etatsUseAi, generateWithGemini, mergeAiContenu } from "./gemini.ts";
import { buildEtatWorkbook, informeExportFilename } from "./export-xlsx.ts";
import { buildEtatContentLocal } from "./local-content.ts";
import {
  formatEsDate,
  getDateRangeForPeriod,
  parseIsoDate,
} from "./period.ts";

export interface InformeCreateInput {
  type_etat?: string;
  periode?: string;
  titre?: string;
  prompt_personnalise?: string;
  agence_id?: string | number | null;
  date_debut?: string;
  date_fin?: string;
}

@Injectable()
export class InformesService {
  constructor(private readonly prisma: PrismaService) {}

  async hub(user: SessionRecord) {
    const actor = actorFrom(user);
    const where = visibilityWhere(user);
    const [rows, total, todayCount] = await Promise.all([
      this.prisma.etat.findMany({
        where,
        orderBy: { date_creation: "desc" },
        take: 20,
      }),
      this.prisma.etat.count({ where }),
      this.prisma.etat.count({
        where: {
          ...where,
          date_creation: { gte: startOfToday() },
        },
      }),
    ]);
    return {
      items: rows.map((row) => serializeListItem(row)),
      total,
      hoy: todayCount,
      types: TYPE_ETATS,
    };
  }

  async meta(user: SessionRecord) {
    const actor = actorFrom(user);
    const agencies = isSuperadmin(user.role)
      ? await this.prisma.agencia.findMany({
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true, id_ciudad: true },
        })
      : await this.prisma.agencia.findMany({
          where: { id: user.idAgencia },
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true, id_ciudad: true },
        });
    return {
      types: TYPE_ETATS,
      periodes: PERIODES,
      agencies,
      is_superadmin: isSuperadmin(actor.role),
      default_agence_id: user.idAgencia,
    };
  }

  async create(input: InformeCreateInput, user: SessionRecord) {
    const typeEtat = (input.type_etat ?? "summary").trim();
    if (!isTypeEtat(typeEtat)) {
      throw new HttpException(
        { ok: false, error: "Tipo de informe no válido." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const periode = (input.periode ?? "current_month").trim();
    let agenceId: number | null = null;
    if (!isSuperadmin(user.role)) {
      agenceId = user.idAgencia;
    } else if (input.agence_id != null && String(input.agence_id).trim() !== "") {
      const parsed = Number(input.agence_id);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new HttpException(
          { ok: false, error: "Agencia no válida." },
          HttpStatus.BAD_REQUEST,
        );
      }
      const exists = await this.prisma.agencia.findUnique({ where: { id: parsed } });
      if (!exists) {
        throw new HttpException(
          { ok: false, error: "Agencia no válida." },
          HttpStatus.BAD_REQUEST,
        );
      }
      agenceId = parsed;
    }

    let debut: Date | null = null;
    let fin: Date | null = null;
    if (periode === "custom") {
      debut = parseIsoDate(input.date_debut ?? null);
      fin = parseIsoDate(input.date_fin ?? null);
      if (!debut) {
        throw new HttpException(
          { ok: false, error: "Indique la fecha de inicio del período." },
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      const range = getDateRangeForPeriod(periode);
      debut = range.debut;
      fin = range.fin;
    }

    let titre = (input.titre ?? "").trim();
    if (!titre) {
      const today = new Date();
      const label = TYPE_TITLE[typeEtat] ?? "Informe";
      titre = `${label} - ${formatEsDate(today)}`;
    }

    const prompt = (input.prompt_personnalise ?? "").trim();
    const parametres = {
      periode,
      prompt_personnalise: prompt,
      agence_id: agenceId,
      ciudad_id: isSuperadmin(user.role) ? null : user.idCiudad,
      date_generation: new Date().toISOString(),
    };

    const now = new Date();
    const created = await this.prisma.etat.create({
      data: {
        titre,
        type_etat: typeEtat,
        periode_debut: debut,
        periode_fin: fin,
        statut: "generating",
        utilisateur: user.nom || "sistema",
        parametres: dumpParametres(parametres),
        date_creation: now,
        date_modification: now,
      },
    });

    await this.generateContent(created.id, user);
    const item = await this.prisma.etat.findUnique({ where: { id: created.id } });
    if (!item) {
      throw new HttpException({ ok: false, error: "Informe no encontrado." }, HttpStatus.NOT_FOUND);
    }
    return serializeDetail(item);
  }

  async get(id: number, user: SessionRecord) {
    const row = await this.loadVisible(id, user);
    if (row.statut === "generating") {
      await this.generateContent(id, user);
      const refreshed = await this.prisma.etat.findUnique({ where: { id } });
      if (!refreshed) {
        throw new HttpException({ ok: false, error: "Informe no encontrado." }, HttpStatus.NOT_FOUND);
      }
      return serializeDetail(refreshed);
    }
    return serializeDetail(row);
  }

  async regenerar(id: number, user: SessionRecord) {
    await this.loadVisible(id, user);
    await this.prisma.etat.update({
      where: { id },
      data: { statut: "generating", date_modification: new Date() },
    });
    await this.generateContent(id, user);
    const refreshed = await this.prisma.etat.findUnique({ where: { id } });
    if (!refreshed) {
      throw new HttpException({ ok: false, error: "Informe no encontrado." }, HttpStatus.NOT_FOUND);
    }
    return serializeDetail(refreshed);
  }

  async remove(id: number, user: SessionRecord) {
    const row = await this.loadVisible(id, user);
    await this.prisma.etat.delete({ where: { id: row.id } });
    return { ok: true, titre: row.titre };
  }

  async exportJson(id: number, user: SessionRecord) {
    const row = await this.loadVisible(id, user);
    const contenu = parseContenu(row.contenu_ia);
    return {
      id: row.id,
      titre: row.titre,
      type_etat: row.type_etat,
      statut: row.statut,
      periode_debut: row.periode_debut ? isoDate(row.periode_debut) : null,
      periode_fin: row.periode_fin ? isoDate(row.periode_fin) : null,
      date_creation: row.date_creation.toISOString(),
      date_modification: row.date_modification.toISOString(),
      parametres: parseParametres(row.parametres),
      contenu,
    };
  }

  async exportXlsx(id: number, user: SessionRecord) {
    const row = await this.loadVisible(id, user);
    const contenu = parseContenu(row.contenu_ia);
    if (row.statut !== "generated" || !contenu) {
      throw new HttpException(
        { ok: false, error: "No se puede exportar: el informe no está generado o no tiene contenido." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const buffer = await buildEtatWorkbook({
      id: row.id,
      titre: row.titre,
      type_etat: row.type_etat,
      statut: row.statut,
      periode_debut: row.periode_debut,
      periode_fin: row.periode_fin,
      date_creation: row.date_creation,
      contenu,
    });
    return { buffer, filename: informeExportFilename(row) };
  }

  private async loadVisible(id: number, user: SessionRecord) {
    const row = await this.prisma.etat.findUnique({ where: { id } });
    if (!row || !etatVisible(actorFrom(user), row.parametres)) {
      throw new HttpException({ ok: false, error: "Informe no encontrado." }, HttpStatus.NOT_FOUND);
    }
    return row;
  }

  private async generateContent(id: number, user: SessionRecord): Promise<boolean> {
    const etat = await this.prisma.etat.findUnique({ where: { id } });
    if (!etat) {
      return false;
    }
    const params = parseParametres(etat.parametres);
    const actor = actorFrom(user);
    const ctx = await collectDataContext(this.prisma, actor, etat);
    if (ctx.error) {
      await this.prisma.etat.update({
        where: { id },
        data: {
          statut: "error",
          contenu_ia: JSON.stringify({ error: `Error de recopilación de datos: ${ctx.error}` }),
          date_modification: new Date(),
        },
      });
      return false;
    }

    const prompt = String(params.prompt_personnalise ?? "");
    const localData = buildEtatContentLocal(etat.type_etat, ctx, prompt);

    if (etatsUseAi()) {
      const result = await generateWithGemini(etat.type_etat, ctx, prompt);
      if (result.success) {
        const merged = mergeAiContenu(localData, result.data);
        const nextParams = {
          ...params,
          ia_provider: "gemini",
          ia_model: result.model,
        };
        await this.prisma.etat.update({
          where: { id },
          data: {
            contenu_ia: JSON.stringify(merged),
            statut: "generated",
            parametres: dumpParametres(nextParams),
            date_modification: new Date(),
          },
        });
        return true;
      }
      await this.prisma.etat.update({
        where: { id },
        data: {
          statut: "error",
          contenu_ia: JSON.stringify({ error: result.error }),
          date_modification: new Date(),
        },
      });
      return false;
    }

    await this.prisma.etat.update({
      where: { id },
      data: {
        contenu_ia: JSON.stringify(localData),
        statut: "generated",
        date_modification: new Date(),
      },
    });
    return true;
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

function visibilityWhere(user: SessionRecord) {
  if (isSuperadmin(user.role)) {
    return {};
  }
  return {
    parametres: { contains: `"agence_id": ${user.idAgencia}` },
  };
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function serializeListItem(row: {
  id: number;
  titre: string;
  type_etat: string;
  statut: string;
  periode_debut: Date | null;
  periode_fin: Date | null;
  date_creation: Date;
}) {
  return {
    id: row.id,
    titre: row.titre,
    type_etat: row.type_etat,
    type_label: TYPE_TITLE[row.type_etat] ?? row.type_etat,
    statut: row.statut,
    periode_debut: row.periode_debut ? isoDate(row.periode_debut) : null,
    periode_fin: row.periode_fin ? isoDate(row.periode_fin) : null,
    periode_label: periodeLabel(row.periode_debut, row.periode_fin),
    date_creation: row.date_creation.toISOString(),
  };
}

function serializeDetail(row: {
  id: number;
  titre: string;
  type_etat: string;
  statut: string;
  contenu_ia: string | null;
  parametres: string | null;
  periode_debut: Date | null;
  periode_fin: Date | null;
  date_creation: Date;
  date_modification: Date;
  utilisateur: string | null;
}) {
  return {
    ...serializeListItem(row),
    contenu: parseContenu(row.contenu_ia),
    parametres: parseParametres(row.parametres),
    date_modification: row.date_modification.toISOString(),
    utilisateur: row.utilisateur,
  };
}

function parseContenu(raw: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodeLabel(debut: Date | null, fin: Date | null): string {
  if (debut && fin) {
    return `${formatEsDate(debut)} - ${formatEsDate(fin)}`;
  }
  if (debut) {
    return formatEsDate(debut);
  }
  return "No definido";
}
