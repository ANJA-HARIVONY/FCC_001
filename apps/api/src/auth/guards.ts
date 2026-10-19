import { CanActivate, ExecutionContext, HttpException, HttpStatus, Inject, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";

import { AuthService, CLOCK, type Clock } from "./auth.service.ts";
import { SESSION_COOKIE } from "./cookies.ts";
import { MemorySessionStore, csrfMatches } from "./session-store.ts";

export const IS_PUBLIC = "fcc:public";
export const Public = () => SetMetadata(IS_PUBLIC, true);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) {
      return true;
    }
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const header = req.header("x-csrftoken");
    if (csrfMatches(cookies.fcc_csrf, header)) {
      return true;
    }
    throw new HttpException({ ok: false, error: "CSRF token missing or invalid" }, HttpStatus.FORBIDDEN);
  }
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: MemorySessionStore,
    private readonly auth: AuthService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request & { sessionUser?: unknown }>();
    const res = context.switchToHttp().getResponse<Response>();
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const sessionId = cookies[SESSION_COOKIE];
    const check = this.sessions.read(sessionId, this.clock.now());
    if (check.status === "idle" || check.status === "absolute") {
      await this.auth.expire(sessionId, check.status === "idle" ? "idle" : "absolute", req.ip);
      res.clearCookie(SESSION_COOKIE, { path: "/" });
      throw new HttpException({ ok: false, error: "Sesión expirada." }, HttpStatus.UNAUTHORIZED);
    }
    if (check.status !== "ok" || !check.session) {
      throw new HttpException({ ok: false, error: "Autenticación requerida." }, HttpStatus.UNAUTHORIZED);
    }
    req.sessionUser = check.session;
    return true;
  }
}
