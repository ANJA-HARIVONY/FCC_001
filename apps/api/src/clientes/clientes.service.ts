import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  CLIENT_CATEGORY_DEFAULT,
  clampListPerPage,
  isAdmin,
  isSuperadmin,
  normalizeClientCategory,
  seesAllMovements,
  type ClientCategory,
} from "@fcc/domain";
import type { Prisma } from "@prisma/client";

import type { AuditWriter } from "../auth/auth.contracts.ts";
import { AUDIT_WRITER } from "../auth/auth.service.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { PrismaService } from "../prisma/prisma.service.ts";
import { buildClientsWorkbook, clientsExportFilename } from "./export-xlsx.ts";
import { MAX_FOTOS, removeFotoFile, resolveFotoPath, saveFotoFile } from "./fotos.ts";
import { pingIp } from "./ping.ts";
import { loadRadius, radiusEnabled } from "./radius-read.ts";

export interface ClientListQuery {
  page?: string | number;
  per_page?: string | number;
  search?: string;
  ville?: string;
  ciudad?: string;
  categoria?: string;
  sort?: string;
  order?: string;
}

export interface ClientWriteInput {
  nom: string;
  telephone: string;
  adresse: string;
  ville: string;
  ip_router?: string | null;
  ip_antea?: string | null;
  username_radius?: string | null;
  id_ciudad: number;
  categoria?: string;
}

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async list(query: ClientListQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const perPage = clampListPerPage(query.per_page);
    const search = (query.search ?? "").trim();
    const ville = (query.ville ?? "").trim();
    const categoriaFilter =
      query.categoria === "particular" || query.categoria === "corporativo" ? query.categoria : "";
    let ciudadId: number | null = null;
    if (query.ciudad) {
      const parsed = Number(query.ciudad);
      if (Number.isInteger(parsed)) {
        const exists = await this.prisma.ciudad.findUnique({ where: { id: parsed } });
        if (exists) {
          ciudadId = parsed;
        }
      }
    }
    const sort = normalizeClientSort(query.sort);
    const order = query.order === "asc" ? "asc" : "desc";

    const where: Prisma.clientWhereInput = {};
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { telephone: { contains: search } },
        { adresse: { contains: search } },
        { ville: { contains: search } },
        { ip_router: { contains: search } },
        { ip_antea: { contains: search } },
      ];
    }
    if (ville) {
      where.ville = { contains: ville };
    }
    if (ciudadId) {
      where.id_ciudad = ciudadId;
    }
    if (categoriaFilter) {
      where.categoria = categoriaFilter;
    }

    const orderBy = orderByClients(sort, order);
    const [total, rows, villes, ciudades] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        include: {
          ciudad: true,
          _count: { select: { incident: true } },
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.client.findMany({
        select: { ville: true },
        distinct: ["ville"],
        orderBy: { ville: "asc" },
      }),
      this.prisma.ciudad.findMany({ orderBy: { nombre: "asc" } }),
    ]);

    const pages = Math.max(1, Math.ceil(total / perPage));
    return {
      items: rows.map(serializeClient),
      page,
      pages,
      per_page: perPage,
      total,
      filters: {
        search,
        ville,
        ciudad: ciudadId ? String(ciudadId) : "",
        categoria: categoriaFilter,
        sort,
        order,
      },
      meta: {
        villes: villes.map((row) => row.ville).filter(Boolean),
        ciudades: ciudades.map((row) => ({ id: row.id, nombre: row.nombre })),
      },
    };
  }

  async exportXlsx(query: ClientListQuery) {
    const payload = await this.list(query);
    const buffer = await buildClientsWorkbook(payload.items);
    return { buffer, filename: clientsExportFilename() };
  }

  async get(id: number) {
    const row = await this.prisma.client.findUnique({
      where: { id },
      include: {
        ciudad: true,
        client_sitio: { where: { activo: true }, take: 1 },
        _count: { select: { incident: true } },
      },
    });
    if (!row) {
      throw new HttpException({ ok: false, error: "Cliente no encontrado." }, HttpStatus.NOT_FOUND);
    }
    return serializeClient(row);
  }

  async create(input: ClientWriteInput, user: SessionRecord) {
    const payload = await this.validateWrite(input);
    const created = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          ...payload,
          id_operateur: user.userId,
        },
      });
      await tx.client_sitio.create({
        data: {
          id_client: client.id,
          adresse: client.adresse,
          ville: client.ville,
          latitud: client.latitud,
          longitud: client.longitud,
          gps_actualizado_le: client.gps_actualizado_le,
          id_operateur_gps: client.id_operateur_gps,
          activo: true,
          creado_le: new Date(),
        },
      });
      return client;
    });
    await this.audit.write("CREATE_CLIENT", user.userId, `client_id=${created.id},categoria=${created.categoria}`);
    return this.get(created.id);
  }

  async update(id: number, input: ClientWriteInput, user: SessionRecord) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ ok: false, error: "Cliente no encontrado." }, HttpStatus.NOT_FOUND);
    }
    const payload = await this.validateWrite(input, existing.categoria);
    const oldRadius = (existing.username_radius ?? "").trim();
    const nextRadius = (payload.username_radius ?? "").trim();
    await this.prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id },
        data: {
          ...payload,
          radius_cache_json: oldRadius !== nextRadius ? null : undefined,
          radius_cache_at: oldRadius !== nextRadius ? null : undefined,
          id_operateur_modificacion: user.userId,
          modifie_le: new Date(),
        },
      });
      const sitio = await tx.client_sitio.findFirst({ where: { id_client: id, activo: true } });
      if (sitio) {
        await tx.client_sitio.update({
          where: { id: sitio.id },
          data: { adresse: payload.adresse, ville: payload.ville },
        });
      } else {
        await tx.client_sitio.create({
          data: {
            id_client: id,
            adresse: payload.adresse,
            ville: payload.ville,
            activo: true,
            creado_le: new Date(),
          },
        });
      }
    });
    await this.audit.write("UPDATE_CLIENT", user.userId, `client_id=${id},categoria=${payload.categoria}`);
    return this.get(id);
  }

  async remove(id: number, user: SessionRecord) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ ok: false, error: "Cliente no encontrado." }, HttpStatus.NOT_FOUND);
    }
    await this.prisma.client.delete({ where: { id } });
    await this.audit.write("DELETE_CLIENT", user.userId, `client_id=${id}`);
    return { ok: true };
  }

  private async validateWrite(input: ClientWriteInput, previousCategoria?: ClientCategory | string) {
    const nom = (input.nom ?? "").trim();
    const telephone = (input.telephone ?? "").trim();
    const adresse = (input.adresse ?? "").trim();
    const ville = (input.ville ?? "").trim();
    const idCiudad = Number(input.id_ciudad);
    if (!nom || !telephone || !adresse || !ville) {
      throw new HttpException(
        { ok: false, error: "Nombre, teléfono, dirección y barrio son obligatorios." },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!Number.isInteger(idCiudad)) {
      throw new HttpException({ ok: false, error: "La ciudad es obligatoria." }, HttpStatus.BAD_REQUEST);
    }
    const ciudad = await this.prisma.ciudad.findUnique({ where: { id: idCiudad } });
    if (!ciudad) {
      throw new HttpException({ ok: false, error: "La ciudad es obligatoria." }, HttpStatus.BAD_REQUEST);
    }
    return {
      nom,
      telephone,
      adresse,
      ville,
      ip_router: (input.ip_router ?? "").trim() || null,
      ip_antea: (input.ip_antea ?? "").trim() || null,
      username_radius: (input.username_radius ?? "").trim() || null,
      id_ciudad: idCiudad,
      categoria: normalizeClientCategory(
        input.categoria,
        normalizeClientCategory(previousCategoria, CLIENT_CATEGORY_DEFAULT),
      ),
    };
  }

  async ficha(id: number, user: SessionRecord, forceRadius: boolean) {
    const row = await this.prisma.client.findUnique({
      where: { id },
      include: { ciudad: true },
    });
    if (!row) {
      throw new HttpException({ ok: false, error: "Cliente no encontrado." }, HttpStatus.NOT_FOUND);
    }
    const allMovements = seesAllMovements({
      authenticated: true,
      role: user.role,
    });
    const incidentWhere: Prisma.incidentWhereInput = {
      id_client: id,
      ...(isSuperadmin(user.role)
        ? {}
        : {
            operateur: { id_agencia: user.idAgencia },
            client: { id_ciudad: user.idCiudad },
          }),
    };
    const [incidents, sitioActivo, sitiosAnteriores, instalaciones, materiales, creePar, modifiePar, gpsPar] =
      await Promise.all([
        this.prisma.incident.findMany({
          where: incidentWhere,
          include: { operateur: { select: { nom: true } } },
          orderBy: { date_heure: "desc" },
        }),
        this.prisma.client_sitio.findFirst({ where: { id_client: id, activo: true } }),
        this.prisma.client_sitio.findMany({
          where: { id_client: id, activo: false },
          include: { _count: { select: { instalacion_foto: true } } },
          orderBy: { hasta: "desc" },
        }),
        this.prisma.instalacion.findMany({
          where: {
            id_client: id,
            ...(allMovements
              ? {}
              : {
                  operateur_instalacion_id_tecnicoTooperateur: { id_agencia: user.idAgencia },
                  client: { id_ciudad: user.idCiudad },
                }),
          },
          include: {
            client_sitio_instalacion_id_sitioToclient_sitio: { select: { adresse: true } },
            operateur_instalacion_id_tecnicoTooperateur: { select: { nom: true } },
          },
          orderBy: [{ fecha: "desc" }, { id: "desc" }],
        }),
        this.prisma.material_salida_linea.findMany({
          where: {
            material_salida: {
              id_client: id,
              ...(allMovements
                ? {}
                : {
                    operateur_material_salida_id_tecnicoTooperateur: {
                      id_agencia: user.idAgencia,
                      id_ciudad: user.idCiudad,
                    },
                  }),
            },
          },
          include: {
            material: { select: { nombre: true, tipo: true } },
            material_salida: {
              select: {
                fecha: true,
                operateur_material_salida_id_tecnicoTooperateur: { select: { nom: true } },
              },
            },
          },
          orderBy: [{ material_salida: { fecha: "desc" } }, { id: "desc" }],
        }),
        row.id_operateur
          ? this.prisma.operateur.findUnique({ where: { id: row.id_operateur }, select: { nom: true } })
          : Promise.resolve(null),
        row.id_operateur_modificacion
          ? this.prisma.operateur.findUnique({
              where: { id: row.id_operateur_modificacion },
              select: { nom: true },
            })
          : Promise.resolve(null),
        row.id_operateur_gps
          ? this.prisma.operateur.findUnique({ where: { id: row.id_operateur_gps }, select: { nom: true } })
          : Promise.resolve(null),
      ]);
    const fotos = sitioActivo
      ? await this.prisma.instalacion_foto.findMany({
          where: { id_client: id, id_sitio: sitioActivo.id },
          orderBy: { id: "asc" },
        })
      : [];
    const radius = await loadRadius(
      {
        username_radius: row.username_radius,
        radius_cache_json: row.radius_cache_json,
        radius_cache_at: row.radius_cache_at,
        ip_router: row.ip_router,
      },
      forceRadius,
    );
    let ipRouter = row.ip_router;
    if (radius.persist) {
      ipRouter = radius.persist.ipRouter;
      await this.prisma.client.update({
        where: { id },
        data: {
          radius_cache_json: radius.persist.json,
          radius_cache_at: new Date(),
          ...(radius.persist.ipRouter !== row.ip_router ? { ip_router: radius.persist.ipRouter } : {}),
        },
      });
    }
    const stats = {
      total: incidents.length,
      solucionadas: incidents.filter((item) => item.status === "Solucionadas").length,
      pendientes: incidents.filter((item) => item.status === "Pendiente").length,
      bitrix: incidents.filter((item) => item.status === "Bitrix").length,
    };
    return {
      radius_enabled: radiusEnabled(),
      max_fotos: MAX_FOTOS,
      item: {
        ...serializeClient({
          ...row,
          ip_router: ipRouter,
          client_sitio: sitioActivo ? [{ id: sitioActivo.id, activo: true }] : [],
          _count: { incident: stats.total },
        }),
        cree_par: creePar?.nom ?? null,
        modifie_par: modifiePar?.nom ?? null,
        modifie_le: row.modifie_le?.toISOString() ?? null,
        gps_actualizado_le: row.gps_actualizado_le?.toISOString() ?? null,
        gps_actualizado_por: gpsPar?.nom ?? null,
      },
      stats,
      incidencias: incidents.map((item) => ({
        id: item.id,
        intitule: item.intitule,
        observations: item.observations,
        status: item.status,
        ref_bitrix: item.ref_bitrix,
        date_heure: item.date_heure.toISOString(),
        operateur: item.operateur.nom,
      })),
      fotos: fotos.map((foto) => ({ id: foto.id, url: `/api/clients/${id}/fotos/${foto.id}/archivo` })),
      sitios_anteriores: sitiosAnteriores.map((sitio) => ({
        id: sitio.id,
        adresse: sitio.adresse,
        ville: sitio.ville,
        hasta: sitio.hasta ? sitio.hasta.toISOString().slice(0, 10) : null,
        latitud: sitio.latitud == null ? null : Number(sitio.latitud),
        longitud: sitio.longitud == null ? null : Number(sitio.longitud),
        fotos: sitio._count.instalacion_foto,
      })),
      instalaciones: instalaciones.map((item) => ({
        id: item.id,
        fecha: item.fecha.toISOString().slice(0, 10),
        tipo: item.tipo,
        estado: item.estado,
        adresse: item.client_sitio_instalacion_id_sitioToclient_sitio?.adresse ?? null,
        tecnico: item.operateur_instalacion_id_tecnicoTooperateur.nom,
      })),
      materiales: materiales.map((linea) => ({
        id: linea.id,
        fecha: linea.material_salida.fecha.toISOString().slice(0, 10),
        nombre: linea.material.nombre,
        tipo: linea.material.tipo,
        cantidad: linea.cantidad,
        tecnico: linea.material_salida.operateur_material_salida_id_tecnicoTooperateur.nom,
      })),
      radius: radius.info,
    };
  }

  async addFotos(
    id: number,
    files: { mimetype: string; size: number; buffer: Buffer }[],
    user: SessionRecord,
  ) {
    this.assertAdmin(user);
    if (!files.length) {
      throw new HttpException({ ok: false, error: "Seleccione al menos una foto." }, HttpStatus.BAD_REQUEST);
    }
    const client = await this.requireClient(id);
    const sitio = await this.ensureSitioActivo(client);
    const actuales = await this.prisma.instalacion_foto.count({
      where: { id_client: id, id_sitio: sitio.id },
    });
    if (actuales + files.length > MAX_FOTOS) {
      throw new HttpException(
        { ok: false, error: `Puede añadir ${Math.max(0, MAX_FOTOS - actuales)} foto(s) más.` },
        HttpStatus.BAD_REQUEST,
      );
    }
    const saved: string[] = [];
    try {
      for (const file of files) {
        saved.push(await saveFotoFile(id, file.buffer, file.mimetype));
      }
    } catch (error) {
      await Promise.all(saved.map((fichier) => removeFotoFile(fichier)));
      const code = error instanceof Error ? error.message : "";
      const message =
        code === "size"
          ? "Cada foto puede pesar 5 MB como máximo."
          : "Solo se admiten fotos JPG, PNG o WEBP.";
      throw new HttpException({ ok: false, error: message }, HttpStatus.BAD_REQUEST);
    }
    const now = new Date();
    await this.prisma.instalacion_foto.createMany({
      data: saved.map((fichier) => ({
        id_client: id,
        id_sitio: sitio.id,
        fichier,
        id_operateur: user.userId,
        creado_le: now,
      })),
    });
    await this.audit.write("CLIENT_FOTOS", user.userId, `client_id=${id} n=${saved.length}`);
    return { ok: true };
  }

  async deleteFoto(id: number, fotoId: number, user: SessionRecord) {
    this.assertAdmin(user);
    const foto = await this.prisma.instalacion_foto.findFirst({ where: { id: fotoId, id_client: id } });
    if (!foto) {
      throw new HttpException({ ok: false, error: "Foto no encontrada." }, HttpStatus.NOT_FOUND);
    }
    await this.prisma.instalacion_foto.delete({ where: { id: foto.id } });
    await removeFotoFile(foto.fichier);
    await this.audit.write("CLIENT_FOTO_ELIMINAR", user.userId, `client_id=${id} foto_id=${fotoId}`);
    return { ok: true };
  }

  async fotoFile(id: number, fotoId: number) {
    const foto = await this.prisma.instalacion_foto.findFirst({ where: { id: fotoId, id_client: id } });
    if (!foto) {
      throw new HttpException({ ok: false, error: "Foto no encontrada." }, HttpStatus.NOT_FOUND);
    }
    const file = resolveFotoPath(foto.fichier);
    if (!file) {
      throw new HttpException({ ok: false, error: "Archivo no encontrado." }, HttpStatus.NOT_FOUND);
    }
    return file;
  }

  async verificar(id: number) {
    const client = await this.requireClient(id);
    const [antena, router] = await Promise.all([pingIp(client.ip_antea, 10), pingIp(client.ip_router, 10)]);
    return {
      client: {
        id: client.id,
        nom: client.nom,
        adresse: client.adresse,
        ville: client.ville,
      },
      resultado_antena: antena,
      resultado_router: router,
    };
  }

  private assertAdmin(user: SessionRecord) {
    if (!isAdmin(user.role)) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
  }

  private async requireClient(id: number) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new HttpException({ ok: false, error: "Cliente no encontrado." }, HttpStatus.NOT_FOUND);
    }
    return client;
  }

  private async ensureSitioActivo(client: {
    id: number;
    adresse: string;
    ville: string;
    latitud: unknown;
    longitud: unknown;
  }) {
    const existing = await this.prisma.client_sitio.findFirst({
      where: { id_client: client.id, activo: true },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.client_sitio.create({
      data: {
        id_client: client.id,
        adresse: client.adresse,
        ville: client.ville,
        latitud: client.latitud == null ? null : Number(client.latitud),
        longitud: client.longitud == null ? null : Number(client.longitud),
        activo: true,
        creado_le: new Date(),
      },
    });
  }
}

const CLIENT_SORTS = new Set(["id", "nombre", "direccion", "incidents"]);

function normalizeClientSort(raw: string | undefined): string {
  const sort = (raw ?? "id").trim() || "id";
  return CLIENT_SORTS.has(sort) ? sort : "id";
}

function orderByClients(sort: string, order: "asc" | "desc"): Prisma.clientOrderByWithRelationInput {
  if (sort === "nombre") {
    return { nom: order };
  }
  if (sort === "direccion") {
    return { adresse: order };
  }
  if (sort === "incidents") {
    return { incident: { _count: order } };
  }
  return { id: order };
}

function serializeClient(row: {
  id: number;
  nom: string;
  telephone: string;
  adresse: string;
  ville: string;
  ip_router: string | null;
  ip_antea: string | null;
  username_radius: string | null;
  id_ciudad: number | null;
  categoria: string;
  latitud: unknown;
  longitud: unknown;
  ciudad?: { id: number; nombre: string } | null;
  client_sitio?: { id: number; activo: boolean }[];
  _count?: { incident: number };
}) {
  return {
    id: row.id,
    nom: row.nom,
    telephone: row.telephone,
    adresse: row.adresse,
    ville: row.ville,
    ip_router: row.ip_router,
    ip_antea: row.ip_antea,
    username_radius: row.username_radius,
    id_ciudad: row.id_ciudad,
    categoria: row.categoria,
    latitud: row.latitud == null ? null : Number(row.latitud),
    longitud: row.longitud == null ? null : Number(row.longitud),
    ciudad: row.ciudad ? { id: row.ciudad.id, nombre: row.ciudad.nombre } : null,
    incidencias: row._count?.incident ?? 0,
    sitio_activo_id: row.client_sitio?.[0]?.id ?? null,
  };
}
