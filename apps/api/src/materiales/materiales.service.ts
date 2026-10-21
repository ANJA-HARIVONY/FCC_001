import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  MATERIAL_TYPES,
  SALIDA_TYPES,
  SALIDA_TYPES_MODAL,
  SALIDA_TYPE_DEFAULT,
  clampListPerPage,
  movementScope,
  seesAllMovements,
  type Actor,
} from "@fcc/domain";
import type { Prisma } from "@prisma/client";

import type { AuditWriter } from "../auth/auth.contracts.ts";
import { AUDIT_WRITER } from "../auth/auth.service.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { PrismaService } from "../prisma/prisma.service.ts";
import { catalogoSortParams, compareCatalogo } from "./catalogo-sort.ts";
import { MaterialFotoError, saveMaterialFoto } from "./material-foto.ts";
import { buildSalidasWorkbook, salidaMaterialesTabla, salidasExportFilename } from "./export-xlsx.ts";
import {
  InformeError,
  assertInformeExportPeriod,
  assertInformePeriod,
  buildInformeResumen,
  buildInformeWorkbook,
  defaultInformePeriod,
  informeCliente,
  informeExportFilename,
  materialOptionLabel,
  materialTipoLabel,
  paginateInforme,
  parseInformeFilters,
  salidaTipoLabel,
  sortInformeLineas,
  tecnicoFichaAccess,
  formatDay,
  type InformeLinea,
} from "./informe.ts";

export interface MaterialWriteInput {
  nombre: string;
  tipo: string;
  descripcion?: string | null;
  modelo?: string | null;
  activo?: boolean | string;
}

export interface MaterialFotoUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface SalidaLineaInput {
  id_material: number;
  cantidad: number;
}

export interface SalidaWriteInput {
  fecha: string;
  id_tecnico: number;
  tipo_salida: string;
  id_client?: number | null;
  id_instalacion?: number | null;
  observaciones?: string | null;
  lineas: SalidaLineaInput[];
}

export interface SalidaListQuery {
  page?: string | number;
  per_page?: string | number;
  search?: string;
  tipo_salida?: string;
  tecnico?: string;
  material?: string;
  date_from?: string;
  date_to?: string;
}

const TIPO_LABELS: Record<string, string> = {
  outillage: "Herramientas",
  material_cliente: "Materiales de cliente",
};

const SALIDA_TIPO_LABELS: Record<string, string> = {
  uso_interno: "Uso interno",
  incidencia: "Incidencia",
  instalacion: "Instalación",
};

@Injectable()
export class MaterialesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async hub(user: SessionRecord) {
    const scope = scopeFrom(user);
    const [total_materiales, total_salidas] = await Promise.all([
      this.prisma.material.count(),
      this.prisma.material_salida.count({ where: salidasWhere(scope) }),
    ]);
    return { total_materiales, total_salidas };
  }

  async listCatalogo(tipo?: string, sort?: string, order?: string) {
    const tipoFilter = MATERIAL_TYPES.includes(tipo as (typeof MATERIAL_TYPES)[number]) ? tipo! : "";
    const where: Prisma.materialWhereInput = tipoFilter ? { tipo: tipoFilter } : {};
    const { sort: sortBy, order: sortOrder } = catalogoSortParams(sort, order);
    const rows = await this.prisma.material.findMany({ where });
    rows.sort((a, b) => compareCatalogo(a, b, sortBy, sortOrder));
    return {
      items: rows.map(serializeMaterial),
      filters: { tipo: tipoFilter, sort: sortBy, order: sortOrder },
      meta: {
        tipos: MATERIAL_TYPES.map((value) => ({ value, label: TIPO_LABELS[value] ?? value })),
      },
    };
  }

  async createMaterial(input: MaterialWriteInput, user: SessionRecord, foto?: MaterialFotoUpload) {
    const payload = validateMaterialWrite(input);
    const dup = await this.prisma.material.findFirst({
      where: { nombre: payload.nombre, tipo: payload.tipo },
    });
    if (dup) {
      throw new HttpException(
        { ok: false, error: "Ya existe un material con este nombre y tipo." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const created = await this.prisma.material.create({
      data: { ...payload, creado_le: new Date() },
    });
    if (!hasFoto(foto)) {
      await this.audit.write("CREATE_MATERIAL", user.userId, `material_id=${created.id}`);
      return serializeMaterial(created);
    }
    try {
      const path = await saveMaterialFoto(created.id, foto);
      const updated = await this.prisma.material.update({
        where: { id: created.id },
        data: { foto: path, modificado_le: new Date() },
      });
      await this.audit.write("CREATE_MATERIAL", user.userId, `material_id=${created.id}`);
      return serializeMaterial(updated);
    } catch (err) {
      await this.prisma.material.delete({ where: { id: created.id } }).catch(() => undefined);
      throw fotoError(err);
    }
  }

  async updateMaterial(id: number, input: MaterialWriteInput, user: SessionRecord, foto?: MaterialFotoUpload) {
    const existing = await this.prisma.material.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ ok: false, error: "Material no encontrado." }, HttpStatus.NOT_FOUND);
    }
    const payload = validateMaterialWrite(input);
    const dup = await this.prisma.material.findFirst({
      where: { nombre: payload.nombre, tipo: payload.tipo, NOT: { id } },
    });
    if (dup) {
      throw new HttpException(
        { ok: false, error: "Ya existe un material con este nombre y tipo." },
        HttpStatus.BAD_REQUEST,
      );
    }
    let fotoPath: string | undefined;
    if (hasFoto(foto)) {
      try {
        fotoPath = await saveMaterialFoto(id, foto);
      } catch (err) {
        throw fotoError(err);
      }
    }
    const updated = await this.prisma.material.update({
      where: { id },
      data: { ...payload, modificado_le: new Date(), ...(fotoPath ? { foto: fotoPath } : {}) },
    });
    await this.audit.write("UPDATE_MATERIAL", user.userId, `material_id=${id}`);
    return serializeMaterial(updated);
  }

  async listSalidas(query: SalidaListQuery, user: SessionRecord) {
    const scope = scopeFrom(user);
    const page = Math.max(1, Number(query.page) || 1);
    const perPage = clampListPerPage(query.per_page);
    const search = (query.search ?? "").trim();
    const tipo = (query.tipo_salida ?? "").trim();
    const tipoFilter = SALIDA_TYPES.includes(tipo as (typeof SALIDA_TYPES)[number]) ? tipo : "";
    const tecnicoId = parseOptionalInt(query.tecnico);
    const materialId = parseOptionalInt(query.material);
    const dateFrom = parseDateOnly(query.date_from);
    const dateTo = parseDateOnly(query.date_to);

    const and: Prisma.material_salidaWhereInput[] = [salidasWhere(scope)];
    if (tipoFilter) {
      and.push({ tipo_salida: tipoFilter });
    }
    if (tecnicoId != null) {
      and.push({ id_tecnico: tecnicoId });
    }
    if (materialId != null) {
      and.push({ material_salida_linea: { some: { id_material: materialId } } });
    }
    if (dateFrom) {
      and.push({ fecha: { gte: dateFrom } });
    }
    if (dateTo) {
      and.push({ fecha: { lte: dateTo } });
    }
    if (search) {
      const or: Prisma.material_salidaWhereInput[] = [
        { operateur_material_salida_id_tecnicoTooperateur: { nom: { contains: search } } },
        { observaciones: { contains: search } },
        { client: { nom: { contains: search } } },
        { client: { telephone: { contains: search } } },
        {
          material_salida_linea: {
            some: { material: { nombre: { contains: search } } },
          },
        },
      ];
      if (/^\d+$/.test(search)) {
        or.push({ id: Number(search) });
      }
      and.push({ OR: or });
    }
    const where: Prisma.material_salidaWhereInput = { AND: and };
    const [total, rows, meta] = await Promise.all([
      this.prisma.material_salida.count({ where }),
      this.prisma.material_salida.findMany({
        where,
        include: salidaInclude,
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.salidasMeta(user),
    ]);
    return {
      items: rows.map(serializeSalidaList),
      page,
      pages: Math.max(1, Math.ceil(total / perPage)),
      per_page: perPage,
      total,
      filters: {
        search,
        tipo_salida: tipoFilter,
        tecnico: tecnicoId ? String(tecnicoId) : "",
        material: materialId ? String(materialId) : "",
        date_from: (query.date_from ?? "").trim(),
        date_to: (query.date_to ?? "").trim(),
      },
      meta,
    };
  }

  async exportSalidasXlsx(query: SalidaListQuery, user: SessionRecord) {
    const payload = await this.listSalidas(query, user);
    const buffer = await buildSalidasWorkbook(payload.items);
    return { buffer, filename: salidasExportFilename() };
  }

  async getSalida(id: number, user: SessionRecord) {
    const row = await this.prisma.material_salida.findUnique({
      where: { id },
      include: salidaInclude,
    });
    if (!row) {
      throw new HttpException({ ok: false, error: "Salida no encontrada." }, HttpStatus.NOT_FOUND);
    }
    assertSalidaInScope(user, row);
    return serializeSalidaDetail(row);
  }

  async createSalida(input: SalidaWriteInput, user: SessionRecord) {
    const actor = actorFrom(user);
    const tipo = normalizeTipoSalidaForCreate(input.tipo_salida);
    if (tipo === "instalacion" && !input.id_instalacion) {
      throw new HttpException(
        {
          ok: false,
          error: "El material de una instalación se registra desde «Nueva instalación».",
          redirect: "/instalaciones/nueva",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const fecha = parseFechaRequired(input.fecha);
    const tecnico = await this.validateTecnico(input.id_tecnico, actor);
    const clientId = applyClientRules(tipo, input.id_client);
    if (clientId != null) {
      await this.validateClient(clientId, actor);
    }
    if (tipo === "instalacion") {
      await this.validateInstalacion(Number(input.id_instalacion), clientId, actor);
    }
    const lineas = parseLineas(input.lineas);
    await this.validateMaterials(lineas, true);
    const created = await this.prisma.$transaction(async (tx) => {
      const salida = await tx.material_salida.create({
        data: {
          fecha,
          id_tecnico: tecnico.id,
          id_client: clientId,
          tipo_salida: tipo,
          id_instalacion: tipo === "instalacion" ? Number(input.id_instalacion) : null,
          observaciones: (input.observaciones ?? "").trim() || null,
          estado: "registrada",
          id_operateur_registro: user.userId,
          fecha_registro: new Date(),
        },
      });
      await tx.material_salida_linea.createMany({
        data: lineas.map((linea) => ({
          id_salida: salida.id,
          id_material: linea.id_material,
          cantidad: linea.cantidad,
        })),
      });
      return salida;
    });
    await this.audit.write("CREATE_MATERIAL_SALIDA", user.userId, `salida_id=${created.id}`);
    return this.getSalida(created.id, user);
  }

  async updateSalida(id: number, input: SalidaWriteInput, user: SessionRecord) {
    const existing = await this.prisma.material_salida.findUnique({
      where: { id },
      include: {
        operateur_material_salida_id_tecnicoTooperateur: true,
        client: true,
        instalacion: true,
      },
    });
    if (!existing) {
      throw new HttpException({ ok: false, error: "Salida no encontrada." }, HttpStatus.NOT_FOUND);
    }
    assertSalidaInScope(user, existing);
    const actor = actorFrom(user);
    const tipo = existing.tipo_salida || SALIDA_TYPE_DEFAULT;
    const fecha = parseFechaRequired(input.fecha);
    const tecnico = await this.validateTecnico(input.id_tecnico, actor);
    const clientId = applyClientRules(tipo, input.id_client);
    if (clientId != null) {
      await this.validateClient(clientId, actor);
    }
    if (existing.instalacion && existing.instalacion.id_client !== clientId) {
      throw new HttpException(
        { ok: false, error: "El cliente no coincide con la instalación." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const lineas = parseLineas(input.lineas);
    await this.validateMaterials(lineas, false);
    await this.prisma.$transaction(async (tx) => {
      await tx.material_salida.update({
        where: { id },
        data: {
          fecha,
          id_tecnico: tecnico.id,
          id_client: clientId,
          observaciones: (input.observaciones ?? "").trim() || null,
          estado: "modificada",
          fecha_modificacion: new Date(),
          id_operateur_modificacion: user.userId,
        },
      });
      await tx.material_salida_linea.deleteMany({ where: { id_salida: id } });
      await tx.material_salida_linea.createMany({
        data: lineas.map((linea) => ({
          id_salida: id,
          id_material: linea.id_material,
          cantidad: linea.cantidad,
        })),
      });
    });
    await this.audit.write("UPDATE_MATERIAL_SALIDA", user.userId, `salida_id=${id}`);
    return this.getSalida(id, user);
  }

  async deleteSalida(id: number, user: SessionRecord) {
    const existing = await this.prisma.material_salida.findUnique({
      where: { id },
      include: {
        operateur_material_salida_id_tecnicoTooperateur: true,
        client: true,
      },
    });
    if (!existing) {
      throw new HttpException({ ok: false, error: "Salida no encontrada." }, HttpStatus.NOT_FOUND);
    }
    assertSalidaInScope(user, existing);
    await this.prisma.material_salida.delete({ where: { id } });
    await this.audit.write("DELETE_MATERIAL_SALIDA", user.userId, `salida_id=${id}`);
    return { ok: true };
  }

  async formOptions(user: SessionRecord) {
    const actor = actorFrom(user);
    const tecnicoWhere: Prisma.operateurWhereInput = {
      categoria: "tecnico",
      actif: true,
    };
    if (!seesAllMovements(actor)) {
      tecnicoWhere.id_agencia = user.idAgencia;
      tecnicoWhere.id_ciudad = user.idCiudad;
    }
    const clientWhere: Prisma.clientWhereInput = {};
    if (!seesAllMovements(actor)) {
      clientWhere.id_ciudad = user.idCiudad;
    }
    const [tecnicos, materiales, clients] = await Promise.all([
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
      this.prisma.material.findMany({
        where: { activo: true },
        orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
      }),
      this.prisma.client.findMany({
        where: clientWhere,
        orderBy: { nom: "asc" },
        select: { id: true, nom: true, telephone: true, ville: true, adresse: true, categoria: true },
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
      materiales: materiales.map(serializeMaterial),
      clients,
      tipos_modal: SALIDA_TYPES_MODAL.map((value) => ({
        value,
        label: SALIDA_TIPO_LABELS[value] ?? value,
      })),
      tipos: SALIDA_TYPES.map((value) => ({ value, label: SALIDA_TIPO_LABELS[value] ?? value })),
    };
  }

  private async salidasMeta(user: SessionRecord) {
    const options = await this.formOptions(user);
    const scope = scopeFrom(user);
    const materials = await this.prisma.material.findMany({
      where: {
        material_salida_linea: {
          some: { material_salida: salidasWhere(scope) },
        },
      },
      orderBy: [{ nombre: "asc" }, { modelo: "asc" }],
      select: { id: true, nombre: true, modelo: true },
    });
    return {
      tecnicos: options.tecnicos,
      materiales_filter: materials.map((row) => ({
        id: row.id,
        label: row.modelo ? `${row.nombre} - ${row.modelo}` : row.nombre,
      })),
      tipos: options.tipos,
      tipos_modal: options.tipos_modal,
    };
  }

  private async validateTecnico(id: number, actor: Actor) {
    const tecnico = await this.prisma.operateur.findFirst({
      where: { id, actif: true },
    });
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
      throw new HttpException({ ok: false, error: "Cliente seleccionado no válido." }, HttpStatus.BAD_REQUEST);
    }
    if (!seesAllMovements(actor) && client.id_ciudad !== actor.idCiudad) {
      throw new HttpException(
        { ok: false, error: "El cliente no pertenece a su ciudad." },
        HttpStatus.BAD_REQUEST,
      );
    }
    return client;
  }

  private async validateInstalacion(id: number, clientId: number | null, actor: Actor) {
    const instalacion = await this.prisma.instalacion.findUnique({
      where: { id },
      include: {
        operateur_instalacion_id_tecnicoTooperateur: true,
        client: true,
      },
    });
    if (!instalacion) {
      throw new HttpException({ ok: false, error: "Instalación no encontrada." }, HttpStatus.BAD_REQUEST);
    }
    if (!seesAllMovements(actor)) {
      const okAgencia = instalacion.operateur_instalacion_id_tecnicoTooperateur.id_agencia === actor.idAgencia;
      const okCiudad = instalacion.client.id_ciudad === actor.idCiudad;
      if (!okAgencia || !okCiudad) {
        throw new HttpException({ ok: false, error: "Instalación no encontrada." }, HttpStatus.BAD_REQUEST);
      }
    }
    if (instalacion.id_client !== clientId) {
      throw new HttpException(
        { ok: false, error: "El cliente no coincide con la instalación." },
        HttpStatus.BAD_REQUEST,
      );
    }
    return instalacion;
  }

  private async validateMaterials(lineas: SalidaLineaInput[], activosOnly: boolean) {
    for (const linea of lineas) {
      const material = await this.prisma.material.findFirst({
        where: {
          id: linea.id_material,
          ...(activosOnly ? { activo: true } : {}),
        },
      });
      if (!material) {
        throw new HttpException(
          { ok: false, error: "Uno de los materiales seleccionados no es válido." },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async informe(query: Record<string, string | undefined>, user: SessionRecord) {
    let dateFrom = (query.date_from ?? "").trim();
    let dateTo = (query.date_to ?? "").trim();
    if (!dateFrom && !dateTo) {
      const period = defaultInformePeriod();
      dateFrom = period.date_from;
      dateTo = period.date_to;
    }
    const filters = parseInformeFilters(query);
    const scope = scopeFrom(user);
    const tecnicos = await this.informeTecnicos(scope);
    let error: string | null = null;
    let lineas: InformeLinea[] = [];
    let resumen = null;
    let materiales: { id: number; label: string }[] = [];
    if (dateFrom && dateTo) {
      try {
        const period = assertInformePeriod(dateFrom, dateTo);
        await this.assertInformeTecnico(filters.tecnico_id, scope);
        lineas = sortInformeLineas(await this.loadInformeLineas(period.from, period.to, filters, scope));
        resumen = buildInformeResumen(lineas, filters.tipo_salida);
        materiales = await this.informeMaterialOptions(period.from, period.to, scope);
      } catch (err) {
        if (!(err instanceof InformeError)) {
          throw err;
        }
        error = err.message;
        lineas = [];
        resumen = null;
      }
    }
    const page = paginateInforme(lineas, Number(query.page) || 1);
    return {
      date_from: dateFrom,
      date_to: dateTo,
      filters,
      error,
      resumen,
      materiales,
      tecnicos,
      tipos: SALIDA_TYPES.map((tipo) => ({ value: tipo, label: salidaTipoLabel(tipo) })),
      ...page,
      items: page.items.map(serializeInformeLinea),
    };
  }

  async informeXlsx(query: Record<string, string | undefined>, user: SessionRecord) {
    const dateFrom = (query.date_from ?? "").trim();
    const dateTo = (query.date_to ?? "").trim();
    let period: { from: Date; to: Date };
    try {
      period = assertInformeExportPeriod(dateFrom, dateTo);
    } catch (err) {
      throw new HttpException(
        { ok: false, error: err instanceof InformeError ? err.message : "Error al exportar el informe." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const filters = parseInformeFilters(query);
    const scope = scopeFrom(user);
    try {
      await this.assertInformeTecnico(filters.tecnico_id, scope);
    } catch (err) {
      throw new HttpException(
        { ok: false, error: err instanceof InformeError ? err.message : "Técnico seleccionado no válido." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const lineas = sortInformeLineas(await this.loadInformeLineas(period.from, period.to, filters, scope));
    return { buffer: await buildInformeWorkbook(lineas), filename: informeExportFilename() };
  }

  async tecnicoFicha(tecnicoId: number, user: SessionRecord) {
    const tecnico = await this.prisma.operateur.findUnique({
      where: { id: tecnicoId },
      include: { ciudad: true, agencia: true },
    });
    const access = tecnicoFichaAccess(tecnico, scopeFrom(user));
    if (access === "missing" || access === "out_of_scope") {
      throw new HttpException({ ok: false, error: "Técnico no encontrado." }, HttpStatus.NOT_FOUND);
    }
    if (access === "not_tecnico" || !tecnico) {
      throw new HttpException({ ok: false, error: "Este usuario no es un técnico." }, HttpStatus.BAD_REQUEST);
    }
    const lineas = await this.prisma.material_salida_linea.findMany({
      where: {
        material_salida: { AND: [{ id_tecnico: tecnicoId }, salidasWhere(scopeFrom(user))] },
      },
      include: informeLineaInclude,
    });
    const rows = lineas
      .map(toInformeLinea)
      .sort((a, b) => {
        const fecha = (b.salida?.fecha.getTime() ?? 0) - (a.salida?.fecha.getTime() ?? 0);
        if (fecha !== 0) return fecha;
        return (b.salida?.id ?? 0) - (a.salida?.id ?? 0);
      });
    return {
      tecnico: {
        id: tecnico.id,
        nom: tecnico.nom,
        telephone: tecnico.telephone,
        email: tecnico.email,
        categoria: tecnico.categoria,
        categoria_label: tecnico.categoria === "tecnico" ? "Técnico" : "Atención al cliente",
        agencia: tecnico.agencia?.nombre ?? "",
        ciudad: tecnico.ciudad?.nombre ?? "",
      },
      items: rows.map((row) => ({
        id: row.id,
        fecha: row.salida?.fecha ? formatDay(row.salida.fecha) : "—",
        material: row.material?.nombre ?? "—",
        tipo: materialTipoLabel(row.material?.tipo),
        cantidad: row.cantidad,
        cliente: row.salida?.client_nom || "Uso general",
      })),
    };
  }

  private async informeTecnicos(scope: { agenciaId: number | null; ciudadId: number | null }) {
    return this.prisma.operateur.findMany({
      where: {
        categoria: "tecnico",
        actif: true,
        ...(scope.agenciaId != null ? { id_agencia: scope.agenciaId } : {}),
        ...(scope.ciudadId != null ? { id_ciudad: scope.ciudadId } : {}),
      },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true },
    });
  }

  private async assertInformeTecnico(
    tecnicoId: number | null,
    scope: { agenciaId: number | null; ciudadId: number | null },
  ) {
    if (!tecnicoId) return;
    const tecnico = await this.prisma.operateur.findFirst({ where: { id: tecnicoId, actif: true } });
    if (!tecnico || tecnico.categoria !== "tecnico") {
      throw new InformeError("Técnico seleccionado no válido.");
    }
    if (scope.agenciaId != null && tecnico.id_agencia !== scope.agenciaId) {
      throw new InformeError("Técnico no válido para su agencia.");
    }
  }

  private async loadInformeLineas(
    from: Date,
    to: Date,
    filters: { tecnico_id: number | null; material_id: number | null; tipo_salida: string },
    scope: { agenciaId: number | null; ciudadId: number | null },
  ) {
    const salidaAnd: Prisma.material_salidaWhereInput[] = [{ fecha: { gte: from, lte: to } }, salidasWhere(scope)];
    if (filters.tecnico_id) salidaAnd.push({ id_tecnico: filters.tecnico_id });
    if (filters.tipo_salida) salidaAnd.push({ tipo_salida: filters.tipo_salida });
    const rows = await this.prisma.material_salida_linea.findMany({
      where: {
        ...(filters.material_id ? { id_material: filters.material_id } : {}),
        material_salida: { AND: salidaAnd },
      },
      include: informeLineaInclude,
    });
    return rows.map(toInformeLinea);
  }

  private async informeMaterialOptions(from: Date, to: Date, scope: { agenciaId: number | null; ciudadId: number | null }) {
    const rows = await this.prisma.material_salida_linea.findMany({
      where: { material_salida: { AND: [{ fecha: { gte: from, lte: to } }, salidasWhere(scope)] } },
      include: { material: true },
    });
    const byId = new Map<number, { id: number; label: string; nombre: string; modelo: string }>();
    for (const row of rows) {
      if (!row.material || byId.has(row.material.id)) continue;
      byId.set(row.material.id, {
        id: row.material.id,
        label: materialOptionLabel(row.material.nombre, row.material.modelo, row.material.id),
        nombre: row.material.nombre,
        modelo: row.material.modelo ?? "",
      });
    }
    return [...byId.values()]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.modelo.localeCompare(b.modelo, "es") || a.id - b.id)
      .map(({ id, label }) => ({ id, label }));
  }
}

const informeLineaInclude = {
  material: true,
  material_salida: {
    include: {
      client: true,
      operateur_material_salida_id_tecnicoTooperateur: true,
    },
  },
} as const;

function toInformeLinea(row: {
  id: number;
  cantidad: number;
  id_material: number;
  material: { nombre: string; modelo: string | null; tipo: string } | null;
  material_salida: {
    id: number;
    fecha: Date;
    tipo_salida: string;
    client: { nom: string } | null;
    operateur_material_salida_id_tecnicoTooperateur: { nom: string };
  };
}): InformeLinea {
  return {
    id: row.id,
    cantidad: row.cantidad,
    id_material: row.id_material,
    material: row.material,
    salida: {
      id: row.material_salida.id,
      fecha: row.material_salida.fecha,
      tipo_salida: row.material_salida.tipo_salida,
      tecnico_nom: row.material_salida.operateur_material_salida_id_tecnicoTooperateur.nom,
      client_nom: row.material_salida.client?.nom ?? null,
    },
  };
}

function serializeInformeLinea(linea: InformeLinea) {
  const material = linea.material;
  return {
    id: linea.id,
    fecha: linea.salida?.fecha ? formatDay(linea.salida.fecha) : "—",
    tecnico: linea.salida?.tecnico_nom ?? "—",
    cliente: informeCliente(linea.salida),
    material: material ? `${material.nombre} (${material.modelo ?? "—"})` : "—",
    tipo_salida: linea.salida?.tipo_salida ?? "",
    tipo_salida_label: salidaTipoLabel(linea.salida?.tipo_salida),
    cantidad: linea.cantidad,
  };
}

const salidaInclude = {
  operateur_material_salida_id_tecnicoTooperateur: true,
  client: true,
  material_salida_linea: { include: { material: true } },
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

function scopeFrom(user: SessionRecord) {
  return movementScope(actorFrom(user));
}

function salidasWhere(scope: { agenciaId: number | null; ciudadId: number | null }): Prisma.material_salidaWhereInput {
  const and: Prisma.material_salidaWhereInput[] = [];
  if (scope.agenciaId != null) {
    and.push({ operateur_material_salida_id_tecnicoTooperateur: { id_agencia: scope.agenciaId } });
  }
  if (scope.ciudadId != null) {
    and.push({
      OR: [
        { client: { id_ciudad: scope.ciudadId } },
        {
          AND: [
            { id_client: null },
            { operateur_material_salida_id_tecnicoTooperateur: { id_ciudad: scope.ciudadId } },
          ],
        },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

function assertSalidaInScope(
  user: SessionRecord,
  row: {
    operateur_material_salida_id_tecnicoTooperateur: { id_agencia: number | null; id_ciudad: number | null };
    client: { id_ciudad: number | null } | null;
  },
) {
  const scope = scopeFrom(user);
  if (scope.agenciaId != null) {
    if (row.operateur_material_salida_id_tecnicoTooperateur.id_agencia !== scope.agenciaId) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
  }
  if (scope.ciudadId != null) {
    const clientCiudad = row.client?.id_ciudad ?? null;
    const ok =
      clientCiudad != null
        ? clientCiudad === scope.ciudadId
        : row.operateur_material_salida_id_tecnicoTooperateur.id_ciudad === scope.ciudadId;
    if (!ok) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
  }
}

function validateMaterialWrite(input: MaterialWriteInput) {
  const nombre = (input.nombre ?? "").trim();
  const tipo = (input.tipo ?? "").trim();
  if (!nombre) {
    throw new HttpException({ ok: false, error: "El nombre es obligatorio." }, HttpStatus.BAD_REQUEST);
  }
  if (!MATERIAL_TYPES.includes(tipo as (typeof MATERIAL_TYPES)[number])) {
    throw new HttpException({ ok: false, error: "Tipo de material inválido." }, HttpStatus.BAD_REQUEST);
  }
  if (nombre.length > 120) {
    throw new HttpException({ ok: false, error: "El nombre no puede superar 120 caracteres." }, HttpStatus.BAD_REQUEST);
  }
  const descripcion = (input.descripcion ?? "").trim();
  const modelo = (input.modelo ?? "").trim();
  if (descripcion.length > 2000) {
    throw new HttpException(
      { ok: false, error: "La descripción no puede superar 2000 caracteres." },
      HttpStatus.BAD_REQUEST,
    );
  }
  if (modelo.length > 100) {
    throw new HttpException({ ok: false, error: "El modelo no puede superar 100 caracteres." }, HttpStatus.BAD_REQUEST);
  }
  return {
    nombre,
    tipo,
    descripcion: descripcion || null,
    modelo: modelo || null,
    activo: parseActivo(input.activo),
  };
}

function parseActivo(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value == null) {
    return true;
  }
  const raw = String(value).trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off" && raw !== "no";
}

function hasFoto(file: MaterialFotoUpload | undefined): file is MaterialFotoUpload {
  return Boolean(file && file.size > 0 && file.buffer.length > 0);
}

function fotoError(err: unknown): unknown {
  if (err instanceof MaterialFotoError) {
    return new HttpException({ ok: false, error: err.message }, HttpStatus.BAD_REQUEST);
  }
  return err;
}

function normalizeTipoSalidaForCreate(raw: string): string {
  const tipo = (raw ?? "").trim();
  if (!tipo) {
    throw new HttpException({ ok: false, error: "Seleccione el tipo de salida." }, HttpStatus.BAD_REQUEST);
  }
  if (!SALIDA_TYPES.includes(tipo as (typeof SALIDA_TYPES)[number])) {
    throw new HttpException({ ok: false, error: "Tipo de salida no válido." }, HttpStatus.BAD_REQUEST);
  }
  return tipo;
}

function applyClientRules(tipo: string, rawClientId: number | null | undefined): number | null {
  if (tipo === "uso_interno") {
    return null;
  }
  if (tipo === "incidencia" || tipo === "instalacion") {
    const id = Number(rawClientId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ ok: false, error: "Seleccione un cliente." }, HttpStatus.BAD_REQUEST);
    }
    return id;
  }
  throw new HttpException({ ok: false, error: "Tipo de salida no válido." }, HttpStatus.BAD_REQUEST);
}

function parseLineas(raw: SalidaLineaInput[] | undefined): SalidaLineaInput[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new HttpException({ ok: false, error: "Añada al menos un material." }, HttpStatus.BAD_REQUEST);
  }
  const seen = new Set<number>();
  const lineas: SalidaLineaInput[] = [];
  for (const row of raw) {
    const id = Number(row.id_material);
    const qty = Number(row.cantidad);
    if (!Number.isInteger(id) || !Number.isInteger(qty)) {
      throw new HttpException({ ok: false, error: "Cantidad de material inválida." }, HttpStatus.BAD_REQUEST);
    }
    if (qty < 1) {
      throw new HttpException({ ok: false, error: "La cantidad debe ser mayor que 0." }, HttpStatus.BAD_REQUEST);
    }
    if (seen.has(id)) {
      throw new HttpException({ ok: false, error: "El material ya está en la lista." }, HttpStatus.BAD_REQUEST);
    }
    seen.add(id);
    lineas.push({ id_material: id, cantidad: qty });
  }
  return lineas;
}

function parseFechaRequired(raw: string): Date {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpException({ ok: false, error: "La fecha es obligatoria." }, HttpStatus.BAD_REQUEST);
  }
  const date = new Date(`${value}T00:00:00`);
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
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalInt(raw?: string): number | null {
  const value = (raw ?? "").trim();
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function serializeMaterial(row: {
  id: number;
  nombre: string;
  tipo: string;
  activo: boolean;
  descripcion: string | null;
  modelo: string | null;
  foto: string | null;
}) {
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
    tipo_label: TIPO_LABELS[row.tipo] ?? row.tipo,
    activo: row.activo,
    descripcion: row.descripcion,
    modelo: row.modelo,
    foto: row.foto,
  };
}

function lineasVista(
  lineas: { cantidad: number; material: { nombre: string; modelo: string | null } | null }[],
) {
  return lineas.map((linea) => ({
    nombre: linea.material?.nombre ?? "?",
    modelo: linea.material?.modelo ?? null,
    cantidad: linea.cantidad,
  }));
}

function serializeSalidaList(row: {
  id: number;
  fecha: Date;
  tipo_salida: string;
  estado: string;
  observaciones: string | null;
  operateur_material_salida_id_tecnicoTooperateur: { id: number; nom: string };
  client: { id: number; nom: string; telephone: string } | null;
  material_salida_linea: { cantidad: number; material: { nombre: string; modelo: string | null } | null }[];
}) {
  return {
    id: row.id,
    fecha: row.fecha.toISOString().slice(0, 10),
    tipo_salida: row.tipo_salida,
    tipo_label: SALIDA_TIPO_LABELS[row.tipo_salida] ?? row.tipo_salida,
    estado: row.estado,
    tecnico: {
      id: row.operateur_material_salida_id_tecnicoTooperateur.id,
      nom: row.operateur_material_salida_id_tecnicoTooperateur.nom,
    },
    client: row.client
      ? { id: row.client.id, nom: row.client.nom, telephone: row.client.telephone }
      : null,
    observaciones: row.observaciones,
    lineas_vista: lineasVista(row.material_salida_linea),
    materiales: salidaMaterialesTabla(lineasVista(row.material_salida_linea)),
  };
}

function serializeSalidaDetail(row: {
  id: number;
  fecha: Date;
  tipo_salida: string;
  estado: string;
  observaciones: string | null;
  id_instalacion: number | null;
  operateur_material_salida_id_tecnicoTooperateur: { id: number; nom: string };
  client: { id: number; nom: string; telephone: string } | null;
  material_salida_linea: {
    id: number;
    cantidad: number;
    id_material: number;
    material: { id: number; nombre: string; modelo: string | null; tipo: string } | null;
  }[];
}) {
  return {
    ...serializeSalidaList(row),
    observaciones: row.observaciones,
    id_instalacion: row.id_instalacion,
    lineas: row.material_salida_linea.map((linea) => ({
      id: linea.id,
      id_material: linea.id_material,
      cantidad: linea.cantidad,
      material: linea.material
        ? {
            id: linea.material.id,
            nombre: linea.material.nombre,
            modelo: linea.material.modelo,
            tipo: linea.material.tipo,
          }
        : null,
    })),
  };
}
