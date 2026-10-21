import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.ts";
import { PrismaModule } from "../prisma/prisma.module.ts";
import { MaterialesController, TecnicosController } from "./materiales.controller.ts";
import { MaterialesService } from "./materiales.service.ts";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MaterialesController, TecnicosController],
  providers: [MaterialesService],
  exports: [MaterialesService],
})
export class MaterialesModule {}
