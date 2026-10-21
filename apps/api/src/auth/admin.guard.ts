import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isAdmin, isSuperadmin } from "@fcc/domain";

import type { RequestWithSession } from "./current-user.ts";

export const IS_ADMIN = "fcc:admin";
export const IS_SUPERADMIN = "fcc:superadmin";
export const AdminOnly = () => SetMetadata(IS_ADMIN, true);
export const SuperadminOnly = () => SetMetadata(IS_SUPERADMIN, true);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const admin = this.reflector.getAllAndOverride<boolean>(IS_ADMIN, [
      context.getHandler(),
      context.getClass(),
    ]);
    const superadmin = this.reflector.getAllAndOverride<boolean>(IS_SUPERADMIN, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!admin && !superadmin) {
      return true;
    }
    const req = context.switchToHttp().getRequest<RequestWithSession>();
    const role = req.sessionUser?.role;
    if (superadmin && !isSuperadmin(role)) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    if (admin && !isAdmin(role)) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
