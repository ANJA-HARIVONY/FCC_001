import { Module } from "@nestjs/common";

import { PrismaAuditWriter } from "../audit/prisma-audit.ts";
import { SwallowAuditWriter } from "../audit/swallow-audit.ts";
import { PrismaModule } from "../prisma/prisma.module.ts";
import { PrismaService } from "../prisma/prisma.service.ts";
import { PrismaUserDirectory } from "../prisma/user-directory.ts";
import { AuthController } from "./auth.controller.ts";
import { AUTH_OPTIONS, AUDIT_WRITER, AuthService, CLOCK, systemClock, USER_DIRECTORY, authOptionsFromEnv } from "./auth.service.ts";
import { MemorySessionStore } from "./session-store.ts";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    MemorySessionStore,
    PrismaUserDirectory,
    { provide: USER_DIRECTORY, useExisting: PrismaUserDirectory },
    {
      provide: AUDIT_WRITER,
      useFactory: (prisma: PrismaService) => new SwallowAuditWriter(new PrismaAuditWriter(prisma)),
      inject: [PrismaService],
    },
    { provide: CLOCK, useValue: systemClock },
    { provide: AUTH_OPTIONS, useFactory: () => authOptionsFromEnv() },
  ],
  exports: [AuthService, MemorySessionStore, CLOCK],
})
export class AuthModule {}
