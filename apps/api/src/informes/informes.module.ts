import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.ts";
import { PrismaModule } from "../prisma/prisma.module.ts";
import { InformesController } from "./informes.controller.ts";
import { InformesService } from "./informes.service.ts";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InformesController],
  providers: [InformesService],
  exports: [InformesService],
})
export class InformesModule {}
