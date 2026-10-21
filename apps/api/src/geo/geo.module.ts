import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.ts";
import { PrismaModule } from "../prisma/prisma.module.ts";
import { GeoController } from "./geo.controller.ts";
import { GeoService } from "./geo.service.ts";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [GeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
