import { Injectable } from "@nestjs/common";

import type { LoginUser, UserDirectory } from "../auth/login-identifier.ts";
import { PrismaService } from "./prisma.service.ts";

const OPERATEUR_SELECT = {
  id: true,
  nom: true,
  telephone: true,
  email: true,
  mot_de_passe_hash: true,
  actif: true,
  role: true,
  id_ciudad: true,
  id_agencia: true,
  avatar_url: true,
  ciudad: { select: { nombre: true } },
  agencia: { select: { nombre: true } },
} as const;

@Injectable()
export class PrismaUserDirectory implements UserDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<LoginUser | null> {
    const row = await this.prisma.operateur.findFirst({ where: { email }, select: OPERATEUR_SELECT });
    return row ? toLoginUser(row) : null;
  }

  async findByTelephone(telephone: string): Promise<LoginUser | null> {
    const row = await this.prisma.operateur.findFirst({ where: { telephone }, select: OPERATEUR_SELECT });
    return row ? toLoginUser(row) : null;
  }

  async findByNom(nom: string): Promise<LoginUser[]> {
    const rows = await this.prisma.operateur.findMany({ where: { nom }, select: OPERATEUR_SELECT });
    return rows.map(toLoginUser);
  }

  async listForPhoneCompact(): Promise<LoginUser[]> {
    const rows = await this.prisma.operateur.findMany({ select: OPERATEUR_SELECT });
    return rows.map(toLoginUser);
  }

  async touchModified(id: number, at: Date): Promise<void> {
    await this.prisma.operateur.update({ where: { id }, data: { modifie_le: at } });
  }

  async updatePasswordHash(id: number, passwordHash: string, at: Date): Promise<void> {
    await this.prisma.operateur.update({
      where: { id },
      data: { mot_de_passe_hash: passwordHash, modifie_le: at },
    });
  }
}

type OperateurRow = {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  mot_de_passe_hash: string;
  actif: boolean;
  role: string;
  id_ciudad: number;
  id_agencia: number;
  avatar_url: string | null;
  ciudad: { nombre: string } | null;
  agencia: { nombre: string } | null;
};

function toLoginUser(row: OperateurRow): LoginUser {
  return {
    id: row.id,
    nom: row.nom,
    telephone: row.telephone,
    email: row.email,
    motDePasseHash: row.mot_de_passe_hash,
    actif: row.actif,
    role: row.role,
    idCiudad: row.id_ciudad,
    idAgencia: row.id_agencia,
    ciudadNombre: row.ciudad?.nombre ?? "N/A",
    agenciaNombre: row.agencia?.nombre ?? "N/A",
    avatarUrl: row.avatar_url,
  };
}
