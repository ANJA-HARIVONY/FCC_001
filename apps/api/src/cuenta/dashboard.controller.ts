import { Readable } from "node:stream";

import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseIntPipe, Post, Put, Query, StreamableFile } from "@nestjs/common";

import { AdminOnly, SuperadminOnly } from "../auth/admin.guard.ts";
import { CurrentUser } from "../auth/current-user.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { AdminOpsService } from "./admin-ops.service.ts";
import { DashboardService } from "./dashboard.service.ts";

@Controller("api/dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  async summary(@Query() query: Record<string, string>, @CurrentUser() user: SessionRecord) {
    return { ok: true, ...(await this.dashboard.summary(query, user)) };
  }

  @Get("serie")
  async serie(@Query() query: Record<string, string>, @CurrentUser() user: SessionRecord) {
    return { ok: true, items: await this.dashboard.serie(query, user) };
  }
}

@Controller("api/apreciaciones")
export class ApreciacionesController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  async get(@Query() query: Record<string, string>, @CurrentUser() user: SessionRecord) {
    return { ok: true, ...(await this.dashboard.getApreciacion(query, user)) };
  }

  @Put()
  @AdminOnly()
  async put(
    @Body() body: { fecha?: string; texto?: string; ciudad?: string; agencia?: string },
    @CurrentUser() user: SessionRecord,
  ) {
    return { ok: true, ...(await this.dashboard.putApreciacion(body, user)) };
  }

  @Delete()
  @AdminOnly()
  @HttpCode(200)
  async remove(@Query() query: Record<string, string>, @CurrentUser() user: SessionRecord) {
    return { ok: true, ...(await this.dashboard.deleteApreciacion(query, user)) };
  }
}

@Controller("api/busqueda")
export class BusquedaController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  async search(@Query("q") q: string, @CurrentUser() user: SessionRecord) {
    return { ok: true, ...(await this.dashboard.search(q ?? "", user)) };
  }
}

@Controller("api/notificaciones")
export class NotificacionesController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  async list(@CurrentUser() user: SessionRecord) {
    return { ok: true, ...(await this.dashboard.notifications(user)) };
  }

  @Post(":id/leer")
  @HttpCode(200)
  async read(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    return this.dashboard.markRead(id, user);
  }
}

@Controller("api/audit")
@SuperadminOnly()
export class AuditController {
  constructor(private readonly ops: AdminOpsService) {}

  @Get()
  async list(@Query() query: Record<string, string>, @CurrentUser() user: SessionRecord) {
    return { ok: true, ...(await this.ops.audit(query, user)) };
  }

  @Get("export")
  @Header("Content-Type", "text/plain; charset=utf-8")
  async text(@Query() query: Record<string, string>, @CurrentUser() user: SessionRecord) {
    return this.ops.auditText(query, user);
  }
}

@Controller("api/database")
@SuperadminOnly()
export class DatabaseController {
  constructor(private readonly ops: AdminOpsService) {}

  @Post("verificar")
  @HttpCode(200)
  async verificar(@CurrentUser() user: SessionRecord) {
    return { ok: true, data: await this.ops.verificar(user) };
  }

  @Get("exportar")
  async exportar(@CurrentUser() user: SessionRecord) {
    const file = await this.ops.exportSql(user);
    return new StreamableFile(Readable.from(file.buffer), {
      type: "application/octet-stream",
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}

@Controller("api/ficha")
@AdminOnly()
export class FichaController {
  constructor(private readonly ops: AdminOpsService) {}

  @Get(":id/export.xlsx")
  async exportXlsx(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: Record<string, string>,
    @CurrentUser() user: SessionRecord,
  ) {
    const file = await this.ops.fichaXlsx(id, query, user);
    return new StreamableFile(Readable.from(file.buffer), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get(":id")
  async one(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: Record<string, string>,
    @CurrentUser() user: SessionRecord,
  ) {
    return { ok: true, ...(await this.ops.ficha(id, query, user)) };
  }
}
