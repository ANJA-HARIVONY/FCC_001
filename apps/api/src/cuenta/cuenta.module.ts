import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.ts";
import { PrismaModule } from "../prisma/prisma.module.ts";
import { AdminOpsService } from "./admin-ops.service.ts";
import {
  ApreciacionesController,
  AuditController,
  BusquedaController,
  DashboardController,
  DatabaseController,
  FichaController,
  NotificacionesController,
} from "./dashboard.controller.ts";
import { DashboardService } from "./dashboard.service.ts";
import { PerfilController, UsuariosController } from "./usuarios.controller.ts";
import { UsuariosService } from "./usuarios.service.ts";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PerfilController,
    UsuariosController,
    DashboardController,
    ApreciacionesController,
    BusquedaController,
    NotificacionesController,
    AuditController,
    DatabaseController,
    FichaController,
  ],
  providers: [UsuariosService, DashboardService, AdminOpsService],
})
export class CuentaModule {}
