import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  INSTALACION_STATES,
  INSTALACION_STATE_DEFAULT,
  INSTALACION_TYPES,
  INSTALACION_TYPE_DEFAULT,
  TRASLADO_ACTIONS,
  clampListPerPage,
  isAdmin,
  instalacionInScope,
  seesAllMovements,
  type Actor,
} from "@fcc/domain";
import type { Prisma } from "@prisma/client";

import type { AuditWriter } from "../auth/auth.contracts.ts";
import { AUDIT_WRITER } from "../auth/auth.service.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { PrismaService } from "../prisma/prisma.service.ts";

export interface InstalacionListQuery {
  page?: string | number;
  per_page?: string | number;
  search?: string;
  tecnico?: string;
  estado?: string;
  tipo?: string;
  date_from?: string;
  date_to?: string;
}

export interface InstalacionWriteInput {
  fecha: string;
  id_tecnico: number;
  id_client?: number;
  observaciones?: string | null;
  lineas?: { id_material: number; cantidad: number }[];
}

export interface TrasladoInput {
  fecha: string;
  id_tecnico: number;
  adresse: string;
  ville: string;
  latitud?: number | null;
  longitud?: number | null;
  observaciones?: string | null;
  lineas?: { id_material: number; cantidad: number; accion: string }[];
}

const TIPO_LABELS: Record<string, string> = {
  nueva: "Nueva",
  traslado: "Traslado",
};

const ESTADO_LABELS: Record<string, string> = {
  en_curso: "En curso",
  terminada: "Terminada",
};

@Injectable()
export class InstalacionesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async list(query: InstalacionListQuery, user: SessionRecord) {
    const page = Math.max(1, Number(query.page) || 1);
    const perPage = clampListPerPage(query.per_page);
    const search = (query.search ?? "").trim();
    const estado = normalizeEstadoFilter(query.estado);
    const tipo = normalizeTipoFilter(query.tipo);
    const tecnicoId = parseOptionalInt(query.tecnico);
    const dateFrom = parseDateOnly(query.date_from);
    const dateTo = parseDateOnly(query.date_to);
    const and: Prisma.instalacionWhereInput[] = [scopeWhere(user)];
    if (estado) {
      and.push({ estado });
    }
    if (tipo) {
      and.push({ tipo });
    }
    if (tecnicoId != null) {
      and.push({ id_tecnico: tecnicoId });
    }
    if (dateFrom) {
      and.push({ fecha: { gte: dateFrom } });
    }
    if (dateTo) {
      and.push({ fecha: { lte: dateTo } });
    }
    if (search) {
      const or: Prisma.instalacionWhereInput[] = [
        { operateur_instalacion_id_tecnicoTooperateur: { nom: { contains: search } } },
        { observaciones: { contains: search } },
        { client: { nom: { contains: search } } },
        { client: { telephone: { contains: search } } },
      ];
      if (/^\d+$/.test(search)) {
        or.push({ id: Number(search) });
      }
      and.push({ OR: or });
    }
    const where: Prisma.instalacionWhereInput = { AND: and };
    const [total, rows, meta] = await Promise.all([
      this.prisma.instalacion.count({ where }),
      this.prisma.instalacion.findMany({
        where,
        include: listInclude,
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.meta(user),
    ]);
    return {
      items: rows.map(serializeList),
      page,
      pages: Math.max(1, Math.ceil(total / perPage)),
      per_page: perPage,
      total,
      filters: {
        search,
        tecnico: tecnicoId ? String(tecnicoId) : "",
        estado,
        tipo,
        date_from: (query.date_from ?? "").trim(),
        date_to: (query.date_to ?? "").trim(),
      },
      meta,
    };
  }

  async delDia(user: SessionRecord, day?: string) {
    const fecha = parseDateOnly(day) ?? startOfToday();
    const where: Prisma.instalacionWhereInput = {
      AND: [scopeWhere(user), { fecha }],
    };
    const rows = await this.prisma.instalacion.findMany({
      where,
      include: listInclude,
      orderBy: [{ id: "desc" }],
    });
    return { items: rows.map(serializeList), fecha: calendarDate(fecha) };
  }

  async get(id: number, user: SessionRecord) {
    const row = await this.load(id);
    if (!row) {
      throw new HttpException({ ok: false, error: "Instalación no encontrada." }, HttpStatus.NOT_FOUND);
    }
    assertInScope(user, row);
    return serializeDetail(row);
  }

  async create(input: InstalacionWriteInput, user: SessionRecord) {
    const actor = actorFrom(user);
    const fecha = parseFechaRequired(input.fecha);
    const tecnico = await this.validateTecnico(input.id_tecnico, actor);
    const clientId = Number(input.id_client);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      throw new HttpException({ ok: false, error: "Seleccione un cliente." }, HttpStatus.BAD_REQUEST);
    }
    const client = await this.validateClient(clientId, actor);
    const lineas = parseLineasOpcionales(input.lineas);
    await this.validateMaterials(lineas, true);
    const sitio = await this.ensureSitioActivo(client);
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const instalacion = await tx.instalacion.create({
        data: {
          id_client: client.id,
          id_sitio: sitio.id,
          tipo: INSTALACION_TYPE_DEFAULT,
          estado: INSTALACION_STATE_DEFAULT,
          fecha,
          id_tecnico: tecnico.id,
          observaciones: (input.observaciones ?? "").trim() || null,
          id_operateur_registro: user.userId,
          fecha_registro: now,
        },
      });
      let salidaId: number | null = null;
      if (lineas.length > 0) {
        const salida = await tx.material_salida.create({
          data: {
            fecha,
            id_tecnico: tecnico.id,
            id_client: client.id,
            tipo_salida: "instalacion",
            id_instalacion: instalacion.id,
            estado: "registrada",
            id_operateur_registro: user.userId,
            fecha_registro: now,
          },
        });
        await tx.material_salida_linea.createMany({
          data: lineas.map((linea) => ({
            id_salida: salida.id,
            id_material: linea.id_material,
            cantidad: linea.cantidad,
          })),
        });
        salidaId = salida.id;
      }
      return { instalacion, salidaId };
    });
    await this.audit.write("INSTALACION_CREATE", user.userId, `instalacion_id=${created.instalacion.id}`);
    if (created.salidaId != null) {
      await this.audit.write("CREATE_MATERIAL_SALIDA", user.userId, `salida_id=${created.salidaId}`);
    }
    return this.get(created.instalacion.id, user);
  }

  async update(id: number, input: InstalacionWriteInput, user: SessionRecord) {
    const existing = await this.load(id);
    if (!existing) {
      throw new HttpException({ ok: false, error: "Instalación no encontrada." }, HttpStatus.NOT_FOUND);
    }
    assertInScope(user, existing);
    const actor = actorFrom(user);
    const fecha = parseFechaRequired(input.fecha);
    const tecnicoId = Number(input.id_tecnico);
    if (!Number.isInteger(tecnicoId) || tecnicoId <= 0) {
      throw new HttpException({ ok: false, error: "Seleccione un técnico." }, HttpStatus.BAD_REQUEST);
    }
    if (tecnicoId !== existing.id_tecnico) {
      await this.validateTecnico(tecnicoId, actor);
    }
    await this.prisma.instalacion.update({
      where: { id },
      data: {
        fecha,
        id_tecnico: tecnicoId,
        observaciones: (input.observaciones ?? "").trim() || null,
        fecha_modificacion: new Date(),
        id_operateur_modificacion: user.userId,
      },
    });
    await this.audit.write("INSTALACION_UPDATE", user.userId, `instalacion_id=${id}`);
    return this.get(id, user);
  }

  async terminar(id: number, user: SessionRecord) {
    const existing = await this.load(id);
    if (!existing) {
      throw new HttpException({ ok: false, error: "Instalación no encontrada." }, HttpStatus.NOT_FOUND);
    }
    assertInScope(user, existing);
    if (existing.estado !== "en_curso") {
      throw new HttpException(
        { ok: false, error: "Solo se puede terminar una instalación en curso." },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.instalacion.update({
      where: { id },
      data: {
        estado: "terminada",
        terminada_le: new Date(),
        id_operateur_terminada: user.userId,
      },
    });
    await this.audit.write("INSTALACION_TERMINAR", user.userId, `instalacion_id=${id}`);
    return this.get(id, user);
  }

  async reabrir(id: number, user: SessionRecord) {
    if (!isAdmin(user.role)) {
      throw new HttpException(
        { ok: false, error: "Solo un administrador puede reabrir una instalación." },
        HttpStatus.FORBIDDEN,
      );
    }
    const existing = await this.load(id);
    if (!existing) {
      throw new HttpException({ ok: false, error: "Instalación no encontrada." }, HttpStatus.NOT_FOUND);
    }
    assertInScope(user, existing);
    if (existing.estado !== "terminada") {
      throw new HttpException(
        { ok: false, error: "Solo se puede reabrir una instalación terminada." },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.instalacion.update({
      where: { id },
      data: {
        estado: "en_curso",
        terminada_le: null,
        id_operateur_terminada: null,
        fecha_modificacion: new Date(),
        id_operateur_modificacion: user.userId,
      },
    });
    await this.audit.write("INSTALACION_REABRIR", user.userId, `instalacion_id=${id}`);
    return this.get(id, user);
  }

  async remove(id: number, user: SessionRecord) {
    const existing = await this.load(id);
    if (!existing) {
      throw new HttpException({ ok: false, error: "Instalación no encontrada." }, HttpStatus.NOT_FOUND);
    }
    assertInScope(user, existing);
    if (existing.tipo === "traslado") {
      throw new HttpException({ ok: false, error: "Un traslado no se puede eliminar." }, HttpStatus.BAD_REQUEST);
    }
    const salidaIds = existing.material_salida.map((row) => row.id);
    await this.prisma.$transaction(async (tx) => {
      if (salidaIds.length) {
        await tx.material_salida.deleteMany({ where: { id: { in: salidaIds } } });
      }
      await tx.instalacion.delete({ where: { id } });
    });
    await this.audit.write(
      "DELETE_INSTALACION",
      user.userId,
      `instalacion_id=${id} salida_ids=${JSON.stringify(salidaIds)}`,
    );
    return { ok: true };
  }

  async createTraslado(clientId: number, input: TrasladoInput, user: SessionRecord) {
    const actor = actorFrom(user);
    const client = await this.validateClient(clientId, actor);
    const adresse = (input.adresse ?? "").trim();
    const ville = (input.ville ?? "").trim();
    if (!adresse) {
      throw new HttpException({ ok: false, error: "La nueva dirección es obligatoria." }, HttpStatus.BAD_REQUEST);
    }
    if (!ville) {
      throw new HttpException({ ok: false, error: "El barrio es obligatorio." }, HttpStatus.BAD_REQUEST);
    }
    const fecha = parseFechaRequired(input.fecha);
    const tecnico = await this.validateTecnico(input.id_tecnico, actor);
    const lineas = parseTrasladoLineas(input.lineas);
    await this.validateMaterials(
      lineas.map((row) => ({ id_material: row.id_material, cantidad: row.cantidad })),
      false,
    );
    const gps = parseGps(input.latitud, input.longitud);
    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const origen = await this.ensureSitioActivoTx(tx, client);
      await tx.client_sitio.update({
        where: { id: origen.id },
        data: { activo: false, hasta: fecha },
      });
      const nuevo = await tx.client_sitio.create({
        data: {
          id_client: client.id,
          adresse,
          ville,
          activo: true,
          desde: fecha,
          creado_le: now,
          latitud: gps?.lat ?? null,
          longitud: gps?.lng ?? null,
          gps_actualizado_le: gps ? now : null,
          id_operateur_gps: gps ? user.userId : null,
        },
      });
      await tx.client.update({
        where: { id: client.id },
        data: {
          adresse,
          ville,
          latitud: gps?.lat ?? null,
          longitud: gps?.lng ?? null,
          gps_actualizado_le: gps ? now : null,
          id_operateur_gps: gps ? user.userId : null,
          id_operateur_modificacion: user.userId,
          modifie_le: now,
        },
      });
      const instalacion = await tx.instalacion.create({
        data: {
          id_client: client.id,
          id_sitio: nuevo.id,
          id_sitio_origen: origen.id,
          tipo: "traslado",
          estado: INSTALACION_STATE_DEFAULT,
          fecha,
          id_tecnico: tecnico.id,
          observaciones: (input.observaciones ?? "").trim() || null,
          id_operateur_registro: user.userId,
          fecha_registro: now,
        },
      });
      if (lineas.length) {
        await tx.instalacion_traslado_linea.createMany({
          data: lineas.map((row) => ({
            id_instalacion: instalacion.id,
            id_material: row.id_material,
            cantidad: row.cantidad,
            accion: row.accion,
          })),
        });
      }
      return instalacion;
    });
    await this.audit.write(
      "INSTALACION_TRASLADO",
      user.userId,
      `client_id=${client.id} instalacion_id=${created.id}`,
    );
    return this.get(created.id, user);
  }

  async updateClientGps(
    clientId: number,
    body: { latitud: number; longitud: number },
    user: SessionRecord,
  ) {
    const actor = actorFrom(user);
    const client = await this.validateClient(clientId, actor);
    const gps = parseGps(body.latitud, body.longitud);
    if (!gps) {
      throw new HttpException({ ok: false, error: "Indique latitud y longitud." }, HttpStatus.BAD_REQUEST);
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const sitio = await this.ensureSitioActivoTx(tx, client);
      await tx.client_sitio.update({
        where: { id: sitio.id },
        data: {
          latitud: gps.lat,
          longitud: gps.lng,
          gps_actualizado_le: now,
          id_operateur_gps: user.userId,
        },
      });
      await tx.client.update({
        where: { id: client.id },
        data: {
          latitud: gps.lat,
          longitud: gps.lng,
          gps_actualizado_le: now,
          id_operateur_gps: user.userId,
        },
      });
    });
    await this.audit.write("INSTALACION_GPS_UPDATE", user.userId, `client_id=${client.id}`);
    return { ok: true, latitud: gps.lat, longitud: gps.lng };
  }

  async formOptions(user: SessionRecord) {
    const actor = actorFrom(user);
    const tecnicoWhere: Prisma.operateurWhereInput = { categoria: "tecnico", actif: true };
    const clientWhere: Prisma.clientWhereInput = {};
    if (!seesAllMovements(actor)) {
      tecnicoWhere.id_agencia = user.idAgencia;
      tecnicoWhere.id_ciudad = user.idCiudad;
      clientWhere.id_ciudad = user.idCiudad;
    }
    const [tecnicos, clients, materiales] = await Promise.all([
      this.prisma.operateur.findMany({
        where: tecnicoWhere,
        orderBy: { nom: "asc" },
        select: {
          id: true,
          nom: true,
          telephone: true,
          agencia: { select: { nombre: true } },
          ciudad: { select: { nombre: true } },
        },
      }),
      this.prisma.client.findMany({
        where: clientWhere,
        orderBy: { nom: "asc" },
        select: { id: true, nom: true, telephone: true, ville: true, adresse: true, categoria: true },
      }),
      this.prisma.material.findMany({
        where: { activo: true },
        orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
        select: { id: true, nombre: true, modelo: true, tipo: true },
      }),
    ]);
    return {
      tecnicos: tecnicos.map((row) => ({
        id: row.id,
        nom: row.nom,
        telephone: row.telephone,
        agencia: row.agencia.nombre,
        ciudad: row.ciudad.nombre,
      })),
      clients,
      materiales,
      estados: INSTALACION_STATES.map((value) => ({ value, label: ESTADO_LABELS[value] ?? value })),
      tipos: INSTALACION_TYPES.map((value) => ({ value, label: TIPO_LABELS[value] ?? value })),
      traslado_acciones: TRASLADO_ACTIONS.map((value) => ({
        value,
        label: value === "reutilizado" ? "Reutilizado" : "Retirado",
      })),
    };
  }

  private async meta(user: SessionRecord) {
    return this.formOptions(user);
  }

  private load(id: number) {
    return this.prisma.instalacion.findUnique({
      where: { id },
      include: detailInclude,
    });
  }

  private async ensureSitioActivo(client: {
    id: number;
    adresse: string;
    ville: string;
    latitud: unknown;
    longitud: unknown;
    gps_actualizado_le: Date | null;
    id_operateur_gps: number | null;
  }) {
    return this.ensureSitioActivoTx(this.prisma, client);
  }

  private async ensureSitioActivoTx(
    tx: Prisma.TransactionClient | PrismaService,
    client: {
      id: number;
      adresse: string;
      ville: string;
      latitud: unknown;
      longitud: unknown;
      gps_actualizado_le: Date | null;
      id_operateur_gps: number | null;
    },
  ) {
    const existing = await tx.client_sitio.findFirst({
      where: { id_client: client.id, activo: true },
    });
    if (existing) {
      return existing;
    }
    return tx.client_sitio.create({
      data: {
        id_client: client.id,
        adresse: client.adresse || "",
        ville: client.ville || "",
        latitud: client.latitud == null ? null : Number(client.latitud),
        longitud: client.longitud == null ? null : Number(client.longitud),
        gps_actualizado_le: client.gps_actualizado_le,
        id_operateur_gps: client.id_operateur_gps,
        activo: true,
        creado_le: new Date(),
      },
    });
  }

  private async validateTecnico(id: number, actor: Actor) {
    const tecnico = await this.prisma.operateur.findFirst({ where: { id, actif: true } });
    if (!tecnico) {
      throw new HttpException({ ok: false, error: "Seleccione un técnico válido." }, HttpStatus.BAD_REQUEST);
    }
    if (tecnico.categoria !== "tecnico") {
      throw new HttpException(
        { ok: false, error: "El usuario seleccionado no es un técnico." },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!seesAllMovements(actor)) {
      if (tecnico.id_agencia !== actor.idAgencia || tecnico.id_ciudad !== actor.idCiudad) {
        throw new HttpException(
          { ok: false, error: "El técnico no pertenece a su agencia." },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    return tecnico;
  }

  private async validateClient(id: number, actor: Actor) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new HttpException({ ok: false, error: "Cliente no encontrado." }, HttpStatus.BAD_REQUEST);
    }
    if (!seesAllMovements(actor) && client.id_ciudad !== actor.idCiudad) {
      throw new HttpException(
        { ok: false, error: "El cliente no pertenece a su ciudad." },
        HttpStatus.BAD_REQUEST,
      );
    }
    return client;
  }

  private async validateMaterials(
    lineas: { id_material: number; cantidad: number }[],
    activosOnly: boolean,
  ) {
    for (const linea of lineas) {
      const material = await this.prisma.material.findFirst({
        where: { id: linea.id_material, ...(activosOnly ? { activo: true } : {}) },
      });
      if (!material) {
        throw new HttpException(
          { ok: false, error: "Uno de los materiales seleccionados no es válido." },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }
}

const listInclude = {
  client: true,
  operateur_instalacion_id_tecnicoTooperateur: true,
  material_salida: {
    include: { material_salida_linea: { include: { material: true } } },
  },
} as const;

const detailInclude = {
  client: true,
  operateur_instalacion_id_tecnicoTooperateur: { select: { id: true, nom: true, id_agencia: true } },
  operateur_instalacion_id_operateur_registroTooperateur: { select: { id: true, nom: true } },
  operateur_instalacion_id_operateur_modificacionTooperateur: { select: { id: true, nom: true } },
  operateur_instalacion_id_operateur_terminadaTooperateur: { select: { id: true, nom: true } },
  material_salida: {
    orderBy: { id: "asc" as const },
    include: {
      operateur_material_salida_id_tecnicoTooperateur: { select: { id: true, nom: true } },
      material_salida_linea: {
        orderBy: { id: "asc" as const },
        include: { material: { select: { nombre: true, modelo: true } } },
      },
    },
  },
  client_sitio_instalacion_id_sitioToclient_sitio: {
    select: { id: true, adresse: true, ville: true, activo: true, latitud: true, longitud: true },
  },
  client_sitio_instalacion_id_sitio_origenToclient_sitio: {
    select: { id: true, adresse: true, ville: true },
  },
  instalacion_traslado_linea: {
    orderBy: { id: "asc" as const },
    include: { material: { select: { nombre: true, modelo: true } } },
  },
} as const;

function actorFrom(user: SessionRecord): Actor {
  return {
    id: user.userId,
    role: user.role,
    idAgencia: user.idAgencia,
    idCiudad: user.idCiudad,
    authenticated: true,
  };
}

function scopeWhere(user: SessionRecord): Prisma.instalacionWhereInput {
  if (seesAllMovements(actorFrom(user))) {
    return {};
  }
  return {
    operateur_instalacion_id_tecnicoTooperateur: { id_agencia: user.idAgencia },
    client: { id_ciudad: user.idCiudad },
  };
}

function assertInScope(
  user: SessionRecord,
  row: {
    operateur_instalacion_id_tecnicoTooperateur: { id_agencia: number | null };
    client: { id_ciudad: number | null };
  },
) {
  const ok = instalacionInScope(actorFrom(user), {
    tecnicoAgenciaId: row.operateur_instalacion_id_tecnicoTooperateur.id_agencia ?? 0,
    clientCiudadId: row.client.id_ciudad,
  });
  if (!ok) {
    throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
  }
}

function materialesCopyLines(
  salidas: {
    material_salida_linea: { cantidad: number; material: { nombre: string; modelo: string | null } | null }[];
  }[],
): string[] {
  const lines: string[] = [];
  for (const salida of salidas) {
    for (const linea of salida.material_salida_linea) {
      lines.push(`${linea.material?.nombre ?? "?"} x${linea.cantidad}`);
    }
  }
  return lines;
}

function materialesResumen(
  salidas: {
    material_salida_linea: { cantidad: number; material: { nombre: string; modelo: string | null } | null }[];
  }[],
): string {
  const parts: string[] = [];
  for (const salida of salidas) {
    for (const linea of salida.material_salida_linea) {
      const nombre = linea.material?.nombre ?? "?";
      const modelo = linea.material?.modelo ? ` (${linea.material.modelo})` : "";
      parts.push(`${nombre}${modelo} x${linea.cantidad}`);
    }
  }
  return parts.length ? parts.join(", ") : "—";
}

function serializeList(row: {
  id: number;
  fecha: Date;
  tipo: string;
  estado: string;
  client: { id: number; nom: string };
  operateur_instalacion_id_tecnicoTooperateur: { id: number; nom: string };
  material_salida: {
    material_salida_linea: { cantidad: number; material: { nombre: string; modelo: string | null } | null }[];
  }[];
}) {
  return {
    id: row.id,
    fecha: calendarDate(row.fecha),
    tipo: row.tipo,
    tipo_label: TIPO_LABELS[row.tipo] ?? row.tipo,
    estado: row.estado,
    estado_label: ESTADO_LABELS[row.estado] ?? row.estado,
    tecnico: {
      id: row.operateur_instalacion_id_tecnicoTooperateur.id,
      nom: row.operateur_instalacion_id_tecnicoTooperateur.nom,
    },
    client: { id: row.client.id, nom: row.client.nom },
    materiales: materialesResumen(row.material_salida),
    materiales_lineas: materialesCopyLines(row.material_salida),
    can_delete: row.tipo === "nueva",
  };
}

function personOrNull(row: { id: number; nom: string } | null): { id: number; nom: string } | null {
  return row ? { id: row.id, nom: row.nom } : null;
}

function mapsUrl(latitud: unknown, longitud: unknown): string | null {
  if (latitud == null || longitud == null) {
    return null;
  }
  const lat = Number(latitud);
  const lng = Number(longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function serializeDetail(row: {
  id: number;
  fecha: Date;
  tipo: string;
  estado: string;
  observaciones: string | null;
  id_sitio: number | null;
  id_sitio_origen: number | null;
  fecha_registro: Date;
  fecha_modificacion: Date | null;
  terminada_le: Date | null;
  client: { id: number; nom: string; telephone: string; adresse: string; ville: string };
  operateur_instalacion_id_tecnicoTooperateur: { id: number; nom: string };
  operateur_instalacion_id_operateur_registroTooperateur: { id: number; nom: string };
  operateur_instalacion_id_operateur_modificacionTooperateur: { id: number; nom: string } | null;
  operateur_instalacion_id_operateur_terminadaTooperateur: { id: number; nom: string } | null;
  material_salida: {
    id: number;
    fecha: Date;
    operateur_material_salida_id_tecnicoTooperateur: { id: number; nom: string };
    material_salida_linea: {
      id: number;
      cantidad: number;
      id_material: number;
      material: { nombre: string; modelo: string | null } | null;
    }[];
  }[];
  instalacion_traslado_linea: {
    id: number;
    cantidad: number;
    accion: string;
    id_material: number;
    material: { nombre: string; modelo: string | null } | null;
  }[];
  client_sitio_instalacion_id_sitioToclient_sitio: {
    id: number;
    adresse: string;
    ville: string;
    activo: boolean;
    latitud: unknown;
    longitud: unknown;
  } | null;
  client_sitio_instalacion_id_sitio_origenToclient_sitio: {
    id: number;
    adresse: string;
    ville: string;
  } | null;
}) {
  const sitio = row.client_sitio_instalacion_id_sitioToclient_sitio;
  const origen = row.client_sitio_instalacion_id_sitio_origenToclient_sitio;
  return {
    ...serializeList(row),
    observaciones: row.observaciones,
    id_sitio: row.id_sitio,
    id_sitio_origen: row.id_sitio_origen,
    fecha_registro: row.fecha_registro.toISOString(),
    fecha_modificacion: row.fecha_modificacion?.toISOString() ?? null,
    terminada_le: row.terminada_le?.toISOString() ?? null,
    registrado_por: personOrNull(row.operateur_instalacion_id_operateur_registroTooperateur),
    modificado_por: personOrNull(row.operateur_instalacion_id_operateur_modificacionTooperateur),
    terminada_por: personOrNull(row.operateur_instalacion_id_operateur_terminadaTooperateur),
    client: row.client,
    sitio: sitio
      ? {
          id: sitio.id,
          adresse: sitio.adresse,
          ville: sitio.ville,
          activo: sitio.activo,
          google_maps_url: mapsUrl(sitio.latitud, sitio.longitud),
        }
      : null,
    sitio_origen: origen ? { id: origen.id, adresse: origen.adresse, ville: origen.ville } : null,
    salidas: row.material_salida.map((salida) => ({
      id: salida.id,
      fecha: calendarDate(salida.fecha),
      tecnico: {
        id: salida.operateur_material_salida_id_tecnicoTooperateur.id,
        nom: salida.operateur_material_salida_id_tecnicoTooperateur.nom,
      },
      lineas: salida.material_salida_linea.map((linea) => ({
        id: linea.id,
        id_material: linea.id_material,
        cantidad: linea.cantidad,
        material: linea.material,
      })),
    })),
    traslado_lineas: row.instalacion_traslado_linea.map((linea) => ({
      id: linea.id,
      id_material: linea.id_material,
      cantidad: linea.cantidad,
      accion: linea.accion,
      material: linea.material,
    })),
  };
}

function parseLineasOpcionales(
  raw: { id_material: number; cantidad: number }[] | undefined,
): { id_material: number; cantidad: number }[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const seen = new Set<number>();
  const lineas: { id_material: number; cantidad: number }[] = [];
  for (const row of raw) {
    if (!row.id_material) {
      continue;
    }
    const id = Number(row.id_material);
    const qty = Number(row.cantidad);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1) {
      throw new HttpException({ ok: false, error: "Cantidad de material inválida." }, HttpStatus.BAD_REQUEST);
    }
    if (seen.has(id)) {
      throw new HttpException({ ok: false, error: "El material ya está en la lista." }, HttpStatus.BAD_REQUEST);
    }
    seen.add(id);
    lineas.push({ id_material: id, cantidad: qty });
  }
  return lineas;
}

function parseTrasladoLineas(
  raw: { id_material: number; cantidad: number; accion: string }[] | undefined,
): { id_material: number; cantidad: number; accion: string }[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const lineas: { id_material: number; cantidad: number; accion: string }[] = [];
  for (const row of raw) {
    if (!row.id_material) {
      continue;
    }
    const id = Number(row.id_material);
    const qty = Number(row.cantidad);
    const accion = (row.accion ?? "").trim();
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1) {
      throw new HttpException({ ok: false, error: "Cantidad de material inválida." }, HttpStatus.BAD_REQUEST);
    }
    if (!TRASLADO_ACTIONS.includes(accion as (typeof TRASLADO_ACTIONS)[number])) {
      throw new HttpException({ ok: false, error: "Acción de material no válida." }, HttpStatus.BAD_REQUEST);
    }
    const key = `${id}:${accion}`;
    if (seen.has(key)) {
      throw new HttpException({ ok: false, error: "El material ya está en la lista." }, HttpStatus.BAD_REQUEST);
    }
    seen.add(key);
    lineas.push({ id_material: id, cantidad: qty, accion });
  }
  return lineas;
}

function parseGps(latRaw: unknown, lngRaw: unknown): { lat: number; lng: number } | null {
  if (latRaw == null || lngRaw == null || latRaw === "" || lngRaw === "") {
    return null;
  }
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new HttpException({ ok: false, error: "Indique latitud y longitud." }, HttpStatus.BAD_REQUEST);
  }
  if (lat < -90 || lat > 90) {
    throw new HttpException(
      { ok: false, error: "La latitud debe estar entre -90 y 90." },
      HttpStatus.BAD_REQUEST,
    );
  }
  if (lng < -180 || lng > 180) {
    throw new HttpException(
      { ok: false, error: "La longitud debe estar entre -180 y 180." },
      HttpStatus.BAD_REQUEST,
    );
  }
  return { lat, lng };
}

function calendarDate(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

function parseFechaRequired(raw: string): Date {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpException({ ok: false, error: "La fecha es obligatoria." }, HttpStatus.BAD_REQUEST);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new HttpException({ ok: false, error: "Formato de fecha inválido." }, HttpStatus.BAD_REQUEST);
  }
  return date;
}

function parseDateOnly(raw?: string): Date | null {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function parseOptionalInt(raw?: string): number | null {
  const value = (raw ?? "").trim();
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeEstadoFilter(raw?: string): string {
  const value = (raw ?? "").trim();
  return INSTALACION_STATES.includes(value as (typeof INSTALACION_STATES)[number]) ? value : "";
}

function normalizeTipoFilter(raw?: string): string {
  const value = (raw ?? "").trim();
  return INSTALACION_TYPES.includes(value as (typeof INSTALACION_TYPES)[number]) ? value : "";
}
