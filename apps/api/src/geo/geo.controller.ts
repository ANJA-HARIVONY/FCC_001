import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { GeoService } from "./geo.service.ts";

@Controller("api")
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get("ciudades")
  async ciudades() {
    const rows = await this.geo.listCiudades();
    return { ok: true, items: rows.map((row) => ({ id: row.id, nombre: row.nombre })) };
  }

  @Get("ciudades/:id/agencias")
  async agencias(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const rows = await this.geo.listAgencias(id, user);
    return { ok: true, items: rows.map((row) => ({ id: row.id, nombre: row.nombre })) };
  }
}
