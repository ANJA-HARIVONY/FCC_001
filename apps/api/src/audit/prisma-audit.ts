import { Injectable } from "@nestjs/common";

import type { AuditWriter } from "../auth/auth.contracts.ts";
import { PrismaService } from "../prisma/prisma.service.ts";

@Injectable()
export class PrismaAuditWriter implements AuditWriter {
  constructor(private readonly prisma: PrismaService) {}

  async write(action: string, userId: number | null, detail?: string, ip?: string): Promise<void> {
    await this.prisma.audit_log.create({
      data: {
        action,
        id_operateur: userId,
        detail: detail ?? null,
        ip_address: ip ?? null,
        date_heure: new Date(),
      },
    });
  }
}
