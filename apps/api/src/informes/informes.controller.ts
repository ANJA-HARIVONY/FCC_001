import { Readable } from "node:stream";

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
} from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { InformesService, type InformeCreateInput } from "./informes.service.ts";

@Controller("api/informes")
export class InformesController {
  constructor(private readonly informes: InformesService) {}

  @Get()
  async hub(@CurrentUser() user: SessionRecord) {
    const payload = await this.informes.hub(user);
    return { ok: true, ...payload };
  }

  @Get("meta")
  async meta(@CurrentUser() user: SessionRecord) {
    const payload = await this.informes.meta(user);
    return { ok: true, ...payload };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() body: InformeCreateInput, @CurrentUser() user: SessionRecord) {
    const item = await this.informes.create(body, user);
    return { ok: true, item };
  }

  @Get(":id/export.xlsx")
  async exportXlsx(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const file = await this.informes.exportXlsx(id, user);
    return new StreamableFile(Readable.from(file.buffer), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get(":id/export")
  async exportJson(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const payload = await this.informes.exportJson(id, user);
    return { ok: true, ...payload };
  }

  @Get(":id")
  async one(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const item = await this.informes.get(id, user);
    return { ok: true, item };
  }

  @Post(":id/regenerar")
  @HttpCode(200)
  async regenerar(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const item = await this.informes.regenerar(id, user);
    return { ok: true, item };
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const result = await this.informes.remove(id, user);
    return { ok: true, titre: result.titre };
  }
}
