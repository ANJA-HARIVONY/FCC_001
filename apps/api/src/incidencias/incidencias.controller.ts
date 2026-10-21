import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  StreamableFile,
} from "@nestjs/common";
import { Readable } from "node:stream";

import { CurrentUser } from "../auth/current-user.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import {
  IncidenciasService,
  type IncidentListQuery,
  type IncidentWriteInput,
} from "./incidencias.service.ts";

@Controller("api/incidents-pendientes")
export class PendientesController {
  constructor(private readonly incidencias: IncidenciasService) {}

  @Get()
  async list(@CurrentUser() user: SessionRecord) {
    return this.incidencias.pendientes(user);
  }
}

@Controller("api/incidents")
export class IncidenciasController {
  constructor(private readonly incidencias: IncidenciasService) {}

  @Get()
  async list(@Query() query: IncidentListQuery, @CurrentUser() user: SessionRecord) {
    const payload = await this.incidencias.list(query, user);
    return { ok: true, ...payload };
  }

  @Get("export.xlsx")
  async exportXlsx(@Query() query: IncidentListQuery, @CurrentUser() user: SessionRecord) {
    const file = await this.incidencias.exportXlsx(query, user);
    return new StreamableFile(Readable.from(file.buffer), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get("clients")
  async clients(@CurrentUser() user: SessionRecord) {
    const items = await this.incidencias.clientsForMovement(user);
    return { ok: true, items };
  }

  @Get(":id/bitrix-info")
  async bitrixInfo(
    @Param("id", ParseIntPipe) id: number,
    @Query("force") force: string | undefined,
    @CurrentUser() user: SessionRecord,
  ) {
    const enabled = force === "1" || force === "true" || force === "yes";
    return this.incidencias.bitrixInfo(id, user, enabled);
  }

  @Get(":id")
  async one(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const item = await this.incidencias.get(id, user);
    return { ok: true, item };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() body: IncidentWriteInput, @CurrentUser() user: SessionRecord) {
    const item = await this.incidencias.create(body, user);
    return { ok: true, item };
  }

  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: IncidentWriteInput,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.incidencias.update(id, body, user);
    return { ok: true, item };
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    await this.incidencias.remove(id, user);
    return { ok: true };
  }

  @Post(":id/comentarios")
  @HttpCode(200)
  async comment(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { contenido?: string },
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.incidencias.addComment(id, body.contenido ?? "", user);
    return { ok: true, item };
  }
}
