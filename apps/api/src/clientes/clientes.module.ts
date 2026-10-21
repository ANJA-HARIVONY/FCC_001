import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.ts";
import { PrismaModule } from "../prisma/prisma.module.ts";
import { ClientesController } from "./clientes.controller.ts";
import { ClientesService } from "./clientes.service.ts";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
