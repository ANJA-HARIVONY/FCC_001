import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.ts";
import { PrismaModule } from "../prisma/prisma.module.ts";
import { IncidenciasController, PendientesController } from "./incidencias.controller.ts";
import { IncidenciasService } from "./incidencias.service.ts";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PendientesController, IncidenciasController],
  providers: [IncidenciasService],
  exports: [IncidenciasService],
})
export class IncidenciasModule {}
