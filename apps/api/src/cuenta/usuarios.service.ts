import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  APRECIACION_TEXTO_MAX,
  OPERATOR_CATEGORIES,
  ROLES,
  apreciacionWriteScope,
  isAdmin,
  isSuperadmin,
  normalizeOperatorCategory,
  normalizeRole,
  type Actor,
} from "@fcc/domain";
import type { Prisma } from "@prisma/client";

import { hashArgon2id } from "../auth/argon2-hash.ts";
import type { AuditWriter } from "../auth/auth.contracts.ts";
import { AUDIT_WRITER } from "../auth/auth.service.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { MemorySessionStore } from "../auth/session-store.ts";
import { AvatarError, avatarExt, MAX_AVATAR_BYTES, writeAvatarFile } from "./avatar.ts";
import { PrismaService } from "../prisma/prisma.service.ts";

export interface UserWriteInput {
  nom?: string;
  telephone?: string;
  email?: string | null;
  password?: string;
  id_ciudad?: number;
  id_agencia?: number;
  role?: string;
  categoria?: string;
}

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: MemorySessionStore,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async me(user: SessionRecord) {
    const row = await this.prisma.operateur.findUnique({
      where: { id: user.userId },
      include: { ciudad: true, agencia: true },
    });
    if (!row) {
      throw new HttpException({ ok: false, error: "Usuario no encontrado." }, HttpStatus.NOT_FOUND);
    }
    return serializeUser(row);
  }

  async uploadAvatar(
    targetId: number,
    file: { mimetype?: string; size?: number; buffer?: Buffer; originalname?: string } | undefined,
    user: SessionRecord,
  ) {
    if (!isSuperadmin(user.role) && user.userId !== targetId) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
    const row = await this.prisma.operateur.findUnique({ where: { id: targetId } });
    if (!row) {
      throw new HttpException({ ok: false, error: "Usuario no encontrado." }, HttpStatus.NOT_FOUND);
    }
    if (!file?.buffer?.length || !file.originalname) {
      throw new HttpException({ ok: false, error: "Seleccione un archivo." }, HttpStatus.BAD_REQUEST);
    }
    const ext = avatarExt(file.mimetype ?? "", file.originalname);
    if (!ext) {
      throw new HttpException(
        { ok: false, error: "Formato no válido (JPG, PNG, WEBP)." },
        HttpStatus.BAD_REQUEST,
      );
    }
    if ((file.size ?? file.buffer.length) > MAX_AVATAR_BYTES || file.buffer.length > MAX_AVATAR_BYTES) {
      throw new HttpException(
        { ok: false, error: "Archivo demasiado grande (máx. 2 MB)." },
        HttpStatus.BAD_REQUEST,
      );
    }
    let avatarUrl: string;
    try {
      avatarUrl = await writeAvatarFile(targetId, ext, file.buffer);
    } catch (err) {
      if (err instanceof AvatarError) {
        throw new HttpException({ ok: false, error: err.message }, HttpStatus.BAD_REQUEST);
      }
      throw err;
    }
    await this.prisma.operateur.update({
      where: { id: targetId },
      data: { avatar_url: avatarUrl, modifie_le: new Date() },
    });
    const shown = `${avatarUrl}?v=${Date.now()}`;
    this.sessions.setAvatar(targetId, shown);
    return { avatar_url: shown };
  }

  async updateMe(input: { nom?: string; telephone?: string; password?: string; password2?: string }, user: SessionRecord) {
    const row = await this.prisma.operateur.findUnique({ where: { id: user.userId } });
    if (!row) {
      throw new HttpException({ ok: false, error: "Usuario no encontrado." }, HttpStatus.NOT_FOUND);
    }
    const nom = (input.nom ?? row.nom).trim();
    const telephone = (input.telephone ?? row.telephone).trim();
    if (!nom || !telephone) {
      throw new HttpException(
        { ok: false, error: "Nombre y teléfono son obligatorios." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const password = input.password ?? "";
    const password2 = input.password2 ?? "";
    if (password || password2) {
      if (password !== password2) {
        throw new HttpException({ ok: false, error: "Las contraseñas no coinciden." }, HttpStatus.BAD_REQUEST);
      }
      if (password.length < 6) {
        throw new HttpException(
          { ok: false, error: "La contraseña debe tener al menos 6 caracteres." },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const telTaken = await this.prisma.operateur.findFirst({
      where: { telephone, id: { not: row.id } },
    });
    if (telTaken) {
      throw new HttpException(
        { ok: false, error: "Ya existe un usuario con este teléfono." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const data: Prisma.operateurUpdateInput = {
      nom,
      telephone,
      modifie_le: new Date(),
    };
    if (password) {
      data.mot_de_passe_hash = await hashArgon2id(password);
    }
    const updated = await this.prisma.operateur.update({
      where: { id: row.id },
      data,
      include: { ciudad: true, agencia: true },
    });
    await this.audit.write("UPDATE_PROFILE", user.userId, `id=${row.id}`);
    return serializeUser(updated);
  }

  async list(query: Record<string, string | undefined>, user: SessionRecord) {
    this.assertSuperadmin(user);
    const search = (query.search ?? "").trim();
    const role = ROLES.includes(query.role as (typeof ROLES)[number]) ? query.role : "";
    const categoria = OPERATOR_CATEGORIES.includes(query.categoria as (typeof OPERATOR_CATEGORIES)[number])
      ? query.categoria
      : "";
    const actif = query.actif === "1" || query.actif === "0" ? query.actif : "";
    const where: Prisma.operateurWhereInput = {};
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { telephone: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (categoria) where.categoria = categoria;
    if (actif === "1") where.actif = true;
    if (actif === "0") where.actif = false;
    const ciudadId = Number(query.ciudad);
    if (Number.isInteger(ciudadId) && ciudadId > 0) where.id_ciudad = ciudadId;
    const agenciaId = Number(query.agencia);
    if (Number.isInteger(agenciaId) && agenciaId > 0) where.id_agencia = agenciaId;

    const [rows, ciudades, agencias] = await Promise.all([
      this.prisma.operateur.findMany({
        where,
        include: { ciudad: true, agencia: true },
        orderBy: { nom: "asc" },
      }),
      this.prisma.ciudad.findMany({ orderBy: { nombre: "asc" } }),
      this.prisma.agencia.findMany({ orderBy: { nombre: "asc" } }),
    ]);
    return {
      items: rows.map(serializeUser),
      ciudades: ciudades.map((c) => ({ id: c.id, nombre: c.nombre })),
      agencias: agencias.map((a) => ({ id: a.id, nombre: a.nombre, id_ciudad: a.id_ciudad })),
    };
  }

  async create(input: UserWriteInput, user: SessionRecord) {
    this.assertSuperadmin(user);
    const parsed = await this.parseWrite(input, true);
    const created = await this.prisma.operateur.create({
      data: {
        nom: parsed.nom,
        telephone: parsed.telephone,
        email: parsed.email,
        mot_de_passe_hash: parsed.hash!,
        id_ciudad: parsed.idCiudad,
        id_agencia: parsed.idAgencia,
        role: parsed.role,
        categoria: parsed.categoria,
        actif: true,
        cree_le: new Date(),
      },
      include: { ciudad: true, agencia: true },
    });
    await this.audit.write("CREATE_USER", user.userId, `id=${created.id}`);
    return serializeUser(created);
  }

  async update(id: number, input: UserWriteInput, user: SessionRecord) {
    this.assertSuperadmin(user);
    const existing = await this.prisma.operateur.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ ok: false, error: "Usuario no encontrado." }, HttpStatus.NOT_FOUND);
    }
    const parsed = await this.parseWrite(input, false, existing.id);
    const data: Prisma.operateurUpdateInput = {
      nom: parsed.nom,
      telephone: parsed.telephone,
      email: parsed.email,
      ciudad: { connect: { id: parsed.idCiudad } },
      agencia: { connect: { id: parsed.idAgencia } },
      role: parsed.role,
      categoria: parsed.categoria,
      modifie_le: new Date(),
    };
    if (parsed.hash) {
      data.mot_de_passe_hash = parsed.hash;
    }
    const updated = await this.prisma.operateur.update({
      where: { id },
      data,
      include: { ciudad: true, agencia: true },
    });
    await this.audit.write("UPDATE_USER", user.userId, `id=${id}`);
    return serializeUser(updated);
  }

  async toggleActif(id: number, user: SessionRecord) {
    this.assertSuperadmin(user);
    if (id === user.userId) {
      throw new HttpException(
        { ok: false, error: "No puede desactivar su propia cuenta." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const existing = await this.prisma.operateur.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException({ ok: false, error: "Usuario no encontrado." }, HttpStatus.NOT_FOUND);
    }
    const updated = await this.prisma.operateur.update({
      where: { id },
      data: { actif: !existing.actif, modifie_le: new Date() },
      include: { ciudad: true, agencia: true },
    });
    await this.audit.write("TOGGLE_USER_ACTIVE", user.userId, `id=${id} actif=${updated.actif}`);
    return serializeUser(updated);
  }

  private assertSuperadmin(user: SessionRecord) {
    if (!isSuperadmin(user.role)) {
      throw new HttpException({ ok: false, error: "Acceso denegado." }, HttpStatus.FORBIDDEN);
    }
  }

  private async parseWrite(input: UserWriteInput, creating: boolean, selfId?: number) {
    const nom = (input.nom ?? "").trim();
    const telephone = (input.telephone ?? "").trim();
    const email = (input.email ?? "").trim() || null;
    const password = (input.password ?? "").trim();
    const idCiudad = Number(input.id_ciudad);
    const idAgencia = Number(input.id_agencia);
    if (!nom || !telephone || !Number.isInteger(idCiudad) || !Number.isInteger(idAgencia)) {
      throw new HttpException(
        { ok: false, error: "Nombre, teléfono, ciudad y agencia son obligatorios." },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (creating && !password) {
      throw new HttpException(
        { ok: false, error: "La contraseña es obligatoria para un nuevo usuario." },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (password && password.length < 6) {
      throw new HttpException(
        { ok: false, error: "La contraseña debe tener al menos 6 caracteres." },
        HttpStatus.BAD_REQUEST,
      );
    }
    const ag = await this.prisma.agencia.findUnique({ where: { id: idAgencia } });
    if (!ag || ag.id_ciudad !== idCiudad) {
      throw new HttpException(
        { ok: false, error: "La agencia no pertenece a la ciudad seleccionada." },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (email) {
      const other = await this.prisma.operateur.findFirst({
        where: { email, ...(selfId ? { id: { not: selfId } } : {}) },
      });
      if (other) {
        throw new HttpException(
          { ok: false, error: "Ya existe un usuario con este correo." },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const otherTel = await this.prisma.operateur.findFirst({
      where: { telephone, ...(selfId ? { id: { not: selfId } } : {}) },
    });
    if (otherTel) {
      throw new HttpException(
        { ok: false, error: "Ya existe un usuario con este teléfono." },
        HttpStatus.BAD_REQUEST,
      );
    }
    return {
      nom,
      telephone,
      email,
      idCiudad,
      idAgencia,
      role: normalizeRole(input.role),
      categoria: normalizeOperatorCategory(input.categoria),
      hash: password ? await hashArgon2id(password) : null,
    };
  }
}

function serializeUser(row: {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  role: string;
  categoria: string;
  actif: boolean;
  avatar_url: string | null;
  id_ciudad: number;
  id_agencia: number;
  ciudad?: { nombre: string } | null;
  agencia?: { nombre: string } | null;
}) {
  return {
    id: row.id,
    nom: row.nom,
    telephone: row.telephone,
    email: row.email,
    role: row.role,
    categoria: row.categoria,
    actif: row.actif,
    avatar_url: row.avatar_url,
    id_ciudad: row.id_ciudad,
    id_agencia: row.id_agencia,
    ciudad: row.ciudad?.nombre ?? "",
    agencia: row.agencia?.nombre ?? "",
  };
}

export function actorFrom(user: SessionRecord): Actor {
  return {
    id: user.userId,
    role: user.role,
    idAgencia: user.idAgencia,
    idCiudad: user.idCiudad,
    authenticated: true,
  };
}

export { APRECIACION_TEXTO_MAX, apreciacionWriteScope, isAdmin, isSuperadmin };
