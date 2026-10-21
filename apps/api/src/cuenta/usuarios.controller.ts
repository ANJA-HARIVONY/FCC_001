import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseFilters, UseInterceptors, type ArgumentsHost, type ExceptionFilter, Catch } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import multer from "multer";

import { CurrentUser } from "../auth/current-user.ts";
import { SuperadminOnly } from "../auth/admin.guard.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { MAX_AVATAR_BYTES } from "./avatar.ts";
import { UsuariosService, type UserWriteInput } from "./usuarios.service.ts";

@Catch(multer.MulterError)
class AvatarUploadFilter implements ExceptionFilter {
  catch(exception: multer.MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const error =
      exception.code === "LIMIT_FILE_SIZE"
        ? "Archivo demasiado grande (máx. 2 MB)."
        : "Seleccione un archivo.";
    response.status(400).json({ ok: false, error });
  }
}

@Controller("api/perfil")
export class PerfilController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  async me(@CurrentUser() user: SessionRecord) {
    return { ok: true, item: await this.usuarios.me(user) };
  }

  @Put()
  async update(
    @Body() body: { nom?: string; telephone?: string; password?: string; password2?: string },
    @CurrentUser() user: SessionRecord,
  ) {
    return { ok: true, item: await this.usuarios.updateMe(body, user) };
  }

  @Post("avatar")
  @HttpCode(200)
  @UseFilters(AvatarUploadFilter)
  @UseInterceptors(FileInterceptor("avatar", { limits: { fileSize: MAX_AVATAR_BYTES } }))
  async avatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.usuarios.uploadAvatar(user.userId, file, user);
    return { ok: true, message: "Avatar actualizado.", ...item };
  }
}

@Controller("api/usuarios")
@SuperadminOnly()
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  async list(@Query() query: Record<string, string>, @CurrentUser() user: SessionRecord) {
    return { ok: true, ...(await this.usuarios.list(query, user)) };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() body: UserWriteInput, @CurrentUser() user: SessionRecord) {
    return { ok: true, item: await this.usuarios.create(body, user) };
  }

  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UserWriteInput,
    @CurrentUser() user: SessionRecord,
  ) {
    return { ok: true, item: await this.usuarios.update(id, body, user) };
  }

  @Post(":id/activo")
  @HttpCode(200)
  async toggle(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    return { ok: true, item: await this.usuarios.toggleActif(id, user) };
  }

  @Post(":id/avatar")
  @HttpCode(200)
  @UseFilters(AvatarUploadFilter)
  @UseInterceptors(FileInterceptor("avatar", { limits: { fileSize: MAX_AVATAR_BYTES } }))
  async avatar(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.usuarios.uploadAvatar(id, file, user);
    return { ok: true, message: "Avatar actualizado.", ...item };
  }
}
