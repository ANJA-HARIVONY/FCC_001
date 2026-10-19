import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { AuthService, CLOCK, type Clock } from "./auth.service.ts";
import { clearSessionCookie, SESSION_COOKIE, setCsrfCookie, setSessionCookie } from "./cookies.ts";
import { Public } from "./guards.ts";
import { MemorySessionStore, newCsrfToken, type SessionRecord } from "./session-store.ts";

type SessionRequest = Request & { sessionUser?: SessionRecord };

@Controller("api")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: MemorySessionStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Public()
  @Get("health")
  health(): { ok: true } {
    return { ok: true };
  }

  @Public()
  @Get("auth/csrf")
  csrf(@Res({ passthrough: true }) res: Response): { ok: true; token: string } {
    const token = newCsrfToken();
    setCsrfCookie(res, token);
    return { ok: true, token };
  }

  @Public()
  @Post("auth/login")
  @HttpCode(200)
  async login(
    @Body() body: { identifiant?: string; email?: string; password?: string; next?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean; error?: string; next?: string | null }> {
    const result = await this.auth.login({
      identifiant: body.identifiant ?? body.email ?? "",
      password: body.password ?? "",
      next: body.next ?? null,
      hostUrl: `${req.protocol}://${req.get("host")}/`,
      ip: req.ip,
    });
    if (!result.ok) {
      res.status(result.status);
      return { ok: false, error: result.error };
    }
    setSessionCookie(res, result.session.id);
    return { ok: true, next: result.next };
  }

  @Post("auth/logout")
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const cookies = req.cookies as Record<string, string | undefined>;
    await this.auth.logout(cookies[SESSION_COOKIE], req.ip);
    clearSessionCookie(res);
    return { ok: true };
  }

  @Get("auth/me")
  me(@Req() req: SessionRequest): { ok: true; user: Pick<SessionRecord, "userId" | "nom" | "role" | "idCiudad" | "idAgencia"> } {
    const session = req.sessionUser!;
    return {
      ok: true,
      user: {
        userId: session.userId,
        nom: session.nom,
        role: session.role,
        idCiudad: session.idCiudad,
        idAgencia: session.idAgencia,
      },
    };
  }

  @Post("session/ping")
  @HttpCode(200)
  ping(@Req() req: Request): { success: true } {
    const cookies = req.cookies as Record<string, string | undefined>;
    const id = cookies[SESSION_COOKIE];
    if (id) {
      this.sessions.touch(id, this.clock.now());
    }
    return { success: true };
  }
}
