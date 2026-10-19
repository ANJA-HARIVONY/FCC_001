import { Injectable } from "@nestjs/common";

import type { AuditWriter } from "../auth/auth.contracts.ts";
import { redact } from "../logging/redact.ts";

/** Journal d'audit qui n'échoue jamais la requête métier. */
@Injectable()
export class SwallowAuditWriter implements AuditWriter {
  constructor(private readonly inner: AuditWriter) {}

  async write(action: string, userId: number | null, detail?: string, ip?: string): Promise<void> {
    try {
      await this.inner.write(action, userId, detail, ip);
    } catch (error) {
      console.error("audit", redact({ action, error: error instanceof Error ? error.message : "error" }));
    }
  }
}
