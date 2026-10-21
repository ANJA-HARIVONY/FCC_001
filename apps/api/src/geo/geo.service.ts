import { Injectable } from "@nestjs/common";
import { isSuperadmin } from "@fcc/domain";

import type { SessionRecord } from "../auth/session-store.ts";
import { PrismaService } from "../prisma/prisma.service.ts";

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  listCiudades() {
    return this.prisma.ciudad.findMany({ orderBy: { nombre: "asc" } });
  }

  /**
   * Superadmin : toutes les agencias de la ciudad.
   * Sinon : uniquement sa propre agencia si la ciudad correspond, sinon [].
   */
  async listAgencias(ciudadId: number, user: SessionRecord) {
    if (!isSuperadmin(user.role)) {
      if (ciudadId !== user.idCiudad) {
        return [];
      }
      const agencia = await this.prisma.agencia.findFirst({
        where: { id: user.idAgencia },
        orderBy: { nombre: "asc" },
      });
      return agencia ? [agencia] : [];
    }
    return this.prisma.agencia.findMany({
      where: { id_ciudad: ciudadId },
      orderBy: { nombre: "asc" },
    });
  }
}
