import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AuthModule } from "./auth/auth.module.ts";
import { CsrfGuard, SessionGuard } from "./auth/guards.ts";

@Module({
  imports: [AuthModule],
  providers: [
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
