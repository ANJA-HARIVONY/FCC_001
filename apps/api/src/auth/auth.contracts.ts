export interface AuditWriter {
  write(action: string, userId: number | null, detail?: string, ip?: string): Promise<void>;
}

export interface Clock {
  now(): number;
}

export interface AuthOptions {
  /** Réécriture Argon2id. Faux par défaut : Flask partage encore la base. */
  rehash: boolean;
}
