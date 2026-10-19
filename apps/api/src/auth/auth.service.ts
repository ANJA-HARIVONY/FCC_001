import { Inject, Injectable } from "@nestjs/common";

import type { AuditWriter, AuthOptions, Clock } from "./auth.contracts.ts";
import { performLogin, type LoginResult } from "./login-flow.ts";
import type { UserDirectory } from "./login-identifier.ts";
import { MemorySessionStore } from "./session-store.ts";

export const USER_DIRECTORY = Symbol("USER_DIRECTORY");
export const AUDIT_WRITER = Symbol("AUDIT_WRITER");
export const CLOCK = Symbol("CLOCK");
export const AUTH_OPTIONS = Symbol("AUTH_OPTIONS");

export type { AuditWriter, AuthOptions, Clock };

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_DIRECTORY) private readonly users: UserDirectory,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
    private readonly sessions: MemorySessionStore,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
  ) {}

  login(input: {
    identifiant: string;
    password: string;
    next: string | null;
    hostUrl: string;
    ip?: string;
  }): Promise<LoginResult> {
    return performLogin(input, {
      users: this.users,
      audit: this.audit,
      sessions: this.sessions,
      clock: this.clock,
      options: this.options,
    });
  }

  async logout(sessionId: string | undefined, ip?: string): Promise<void> {
    const session = this.sessions.destroy(sessionId);
    if (session) {
      await this.audit.write("LOGOUT", session.userId, undefined, ip);
    }
  }

  async expire(sessionId: string | undefined, reason: "idle" | "absolute", ip?: string): Promise<void> {
    const session = this.sessions.destroy(sessionId);
    if (session && reason === "idle") {
      await this.audit.write("LOGOUT_IDLE_TIMEOUT", session.userId, undefined, ip);
    }
  }
}

export const systemClock: Clock = { now: () => Date.now() };

export function authOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): AuthOptions {
  return { rehash: env.PASSWORD_REHASH === "true" };
}
