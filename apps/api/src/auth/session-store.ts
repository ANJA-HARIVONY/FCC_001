import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from "@fcc/domain";

import type { LoginUser } from "./login-identifier.ts";

export interface SessionRecord {
  id: string;
  userId: number;
  role: string;
  idCiudad: number;
  idAgencia: number;
  nom: string;
  ciudadNombre: string;
  agenciaNombre: string;
  avatarUrl: string | null;
  startedAt: number;
  lastActivityAt: number;
}

export type SessionCheck = "ok" | "missing" | "idle" | "absolute";

/**
 * Fichier sous `instance/` (gitignoré). Quatre niveaux au-dessus de `src/auth` ou `dist/auth`.
 * `SESSION_STORE=memory` garde le comportement des tests : rien sur disque.
 */
export function defaultSessionFile(): string | undefined {
  if (process.env.SESSION_STORE === "memory") {
    return undefined;
  }
  const override = process.env.SESSION_FILE?.trim();
  if (override) {
    return override;
  }
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "..", "..", "instance", "api-sessions.json");
}

/** Store du processus, recopié dans un fichier pour survivre à un redémarrage. Pas de table SQL. */
export class MemorySessionStore {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly filePath: string | undefined;

  constructor(filePath?: string) {
    this.filePath = filePath;
    if (!filePath) {
      return;
    }
    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8")) as SessionRecord[];
      const now = Date.now();
      for (const session of parsed) {
        if (!session?.id || now - session.startedAt >= SESSION_ABSOLUTE_MS) {
          continue;
        }
        if (now - session.lastActivityAt >= SESSION_IDLE_MS) {
          continue;
        }
        this.sessions.set(session.id, session);
      }
    } catch {
      // Fichier absent ou illisible : le store démarre vide.
    }
  }

  create(user: LoginUser, now: number): SessionRecord {
    const record: SessionRecord = {
      id: randomBytes(32).toString("hex"),
      userId: user.id,
      role: user.role,
      idCiudad: user.idCiudad,
      idAgencia: user.idAgencia,
      nom: user.nom,
      ciudadNombre: user.ciudadNombre,
      agenciaNombre: user.agenciaNombre,
      avatarUrl: user.avatarUrl,
      startedAt: now,
      lastActivityAt: now,
    };
    this.sessions.set(record.id, record);
    this.persist();
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
      this.persist();
    }
  }

  destroy(id: string | undefined): SessionRecord | null {
    if (!id) {
      return null;
    }
    const session = this.sessions.get(id) ?? null;
    this.sessions.delete(id);
    this.persist();
    return session;
  }

  setAvatar(userId: number, avatarUrl: string): void {
    let changed = false;
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.avatarUrl = avatarUrl;
        changed = true;
      }
    }
    if (changed) {
      this.persist();
    }
  }

  private persist(): void {
    if (!this.filePath) {
      return;
    }
    try {
      mkdirSync(dirname(this.filePath), { recursive: true, mode: 0o700 });
      writeFileSync(this.filePath, JSON.stringify([...this.sessions.values()]), { mode: 0o600 });
    } catch {
      // Une erreur de fichier ne doit pas faire échouer la requête métier.
    }
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
