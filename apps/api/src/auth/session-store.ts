import { randomBytes, timingSafeEqual } from "node:crypto";

import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from "@fcc/domain";

import type { LoginUser } from "./login-identifier.ts";

export interface SessionRecord {
  id: string;
  userId: number;
  role: string;
  idCiudad: number;
  idAgencia: number;
  nom: string;
  startedAt: number;
  lastActivityAt: number;
}

export type SessionCheck = "ok" | "missing" | "idle" | "absolute";

/** Store en mémoire du processus. Pas de table SQL : la base actuelle ne reçoit aucun ALTER. */
export class MemorySessionStore {
  private readonly sessions = new Map<string, SessionRecord>();

  create(user: LoginUser, now: number): SessionRecord {
    const record: SessionRecord = {
      id: randomBytes(32).toString("hex"),
      userId: user.id,
      role: user.role,
      idCiudad: user.idCiudad,
      idAgencia: user.idAgencia,
      nom: user.nom,
      startedAt: now,
      lastActivityAt: now,
    };
    this.sessions.set(record.id, record);
    return record;
  }

  read(id: string | undefined, now: number): { status: SessionCheck; session: SessionRecord | null } {
    if (!id) {
      return { status: "missing", session: null };
    }
    const session = this.sessions.get(id);
    if (!session) {
      return { status: "missing", session: null };
    }
    if (now - session.startedAt >= SESSION_ABSOLUTE_MS) {
      return { status: "absolute", session };
    }
    if (now - session.lastActivityAt >= SESSION_IDLE_MS) {
      return { status: "idle", session };
    }
    return { status: "ok", session };
  }

  touch(id: string, now: number): void {
    const session = this.sessions.get(id);
    if (session) {
      session.lastActivityAt = now;
    }
  }

  destroy(id: string | undefined): SessionRecord | null {
    if (!id) {
      return null;
    }
    const session = this.sessions.get(id) ?? null;
    this.sessions.delete(id);
    return session;
  }
}

export function newCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function csrfMatches(cookie: string | undefined, header: string | undefined): boolean {
  if (!cookie || !header) {
    return false;
  }
  const left = Buffer.from(cookie);
  const right = Buffer.from(header);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
