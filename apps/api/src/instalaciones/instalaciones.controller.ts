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
} from "@nestjs/common";

import { AdminOnly } from "../auth/admin.guard.ts";
import { CurrentUser } from "../auth/current-user.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import {
  InstalacionesService,
  type InstalacionListQuery,
  type InstalacionWriteInput,
  type TrasladoInput,
} from "./instalaciones.service.ts";

@Controller("api/instalaciones")
@AdminOnly()
export class InstalacionesController {
  constructor(private readonly instalaciones: InstalacionesService) {}

  @Get()
  async list(@Query() query: InstalacionListQuery, @CurrentUser() user: SessionRecord) {
    const payload = await this.instalaciones.list(query, user);
    return { ok: true, ...payload };
  }

  @Get("del-dia")
  async delDia(@Query("fecha") fecha: string | undefined, @CurrentUser() user: SessionRecord) {
    const payload = await this.instalaciones.delDia(user, fecha);
    return { ok: true, ...payload };
  }

  @Get("options")
  async options(@CurrentUser() user: SessionRecord) {
    const payload = await this.instalaciones.formOptions(user);
    return { ok: true, ...payload };
  }

  @Post("clientes/:clientId/traslado")
  @HttpCode(200)
  async traslado(
    @Param("clientId", ParseIntPipe) clientId: number,
    @Body() body: TrasladoInput,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.instalaciones.createTraslado(clientId, body, user);
    return { ok: true, item };
  }

  @Put("clientes/:clientId/gps")
  async gps(
    @Param("clientId", ParseIntPipe) clientId: number,
    @Body() body: { latitud: number; longitud: number },
    @CurrentUser() user: SessionRecord,
  ) {
    const payload = await this.instalaciones.updateClientGps(clientId, body, user);
    return payload;
  }

  @Get(":id")
  async one(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const item = await this.instalaciones.get(id, user);
    return { ok: true, item };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() body: InstalacionWriteInput, @CurrentUser() user: SessionRecord) {
    const item = await this.instalaciones.create(body, user);
    return { ok: true, item };
  }

  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: InstalacionWriteInput,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.instalaciones.update(id, body, user);
    return { ok: true, item };
  }

  @Post(":id/terminar")
  @HttpCode(200)
  async terminar(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const item = await this.instalaciones.terminar(id, user);
    return { ok: true, item };
  }

  @Post(":id/reabrir")
  @HttpCode(200)
  async reabrir(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const item = await this.instalaciones.reabrir(id, user);
    return { ok: true, item };
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    await this.instalaciones.remove(id, user);
    return { ok: true };
  }
}
