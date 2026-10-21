import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AdminGuard } from "./auth/admin.guard.ts";
import { AuthModule } from "./auth/auth.module.ts";
import { CsrfGuard, SessionGuard } from "./auth/guards.ts";
import { ClientesModule } from "./clientes/clientes.module.ts";
import { GeoModule } from "./geo/geo.module.ts";
import { IncidenciasModule } from "./incidencias/incidencias.module.ts";
import { InformesModule } from "./informes/informes.module.ts";
import { InstalacionesModule } from "./instalaciones/instalaciones.module.ts";
import { MaterialesModule } from "./materiales/materiales.module.ts";
import { CuentaModule } from "./cuenta/cuenta.module.ts";

@Module({
  imports: [
    AuthModule,
    GeoModule,
    ClientesModule,
    IncidenciasModule,
    MaterialesModule,
    InstalacionesModule,
    InformesModule,
    CuentaModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: AdminGuard },
  ],
})
export class AppModule {}


