import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.ts";
import { PrismaModule } from "../prisma/prisma.module.ts";
import { InstalacionesController } from "./instalaciones.controller.ts";
import { InstalacionesService } from "./instalaciones.service.ts";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InstalacionesController],
  providers: [InstalacionesService],
  exports: [InstalacionesService],
})
export class InstalacionesModule {}
