import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import {
  Body,
  Catch,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import multer from "multer";

import { AdminOnly } from "../auth/admin.guard.ts";
import { CurrentUser } from "../auth/current-user.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { ClientesService, type ClientListQuery, type ClientWriteInput } from "./clientes.service.ts";
import { MAX_FOTO_BYTES, MAX_FOTOS } from "./fotos.ts";

@Catch(multer.MulterError)
class FotoUploadFilter implements ExceptionFilter {
  catch(exception: multer.MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const error =
      exception.code === "LIMIT_FILE_SIZE"
        ? "Cada foto puede pesar 5 MB como máximo."
        : "No se pudieron subir las fotos.";
    response.status(400).json({ ok: false, error });
  }
}

@Controller("api/clients")
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  async list(@Query() query: ClientListQuery) {
    const payload = await this.clientes.list(query);
    return { ok: true, ...payload };
  }

  @Get("export.xlsx")
  async exportXlsx(@Query() query: ClientListQuery) {
    const file = await this.clientes.exportXlsx(query);
    return new StreamableFile(Readable.from(file.buffer), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get(":id/ficha")
  async ficha(
    @Param("id", ParseIntPipe) id: number,
    @Query("radius_refresh") radiusRefresh: string | undefined,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.clientes.ficha(id, user, radiusRefresh === "1");
    return { ok: true, ...item };
  }

  @Get(":id/verificar")
  async verificar(@Param("id", ParseIntPipe) id: number) {
    const payload = await this.clientes.verificar(id);
    return { ok: true, ...payload };
  }

  @Get(":id/fotos/:fotoId/archivo")
  async archivo(@Param("id", ParseIntPipe) id: number, @Param("fotoId", ParseIntPipe) fotoId: number) {
    const file = await this.clientes.fotoFile(id, fotoId);
    return new StreamableFile(createReadStream(file.path), {
      type: file.mime,
      disposition: "inline",
    });
  }

  @Post(":id/fotos")
  @AdminOnly()
  @HttpCode(200)
  @UseFilters(FotoUploadFilter)
  @UseInterceptors(
    FilesInterceptor("fotos", MAX_FOTOS, {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_FOTO_BYTES, files: MAX_FOTOS },
    }),
  )
  async addFotos(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFiles() files: { mimetype: string; size: number; buffer: Buffer }[] | undefined,
    @CurrentUser() user: SessionRecord,
  ) {
    return this.clientes.addFotos(id, files ?? [], user);
  }

  @Delete(":id/fotos/:fotoId")
  @AdminOnly()
  @HttpCode(200)
  async deleteFoto(
    @Param("id", ParseIntPipe) id: number,
    @Param("fotoId", ParseIntPipe) fotoId: number,
    @CurrentUser() user: SessionRecord,
  ) {
    return this.clientes.deleteFoto(id, fotoId, user);
  }

  @Get(":id")
  async one(@Param("id", ParseIntPipe) id: number) {
    const item = await this.clientes.get(id);
    return { ok: true, item };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() body: ClientWriteInput, @CurrentUser() user: SessionRecord) {
    const item = await this.clientes.create(body, user);
    return { ok: true, item };
  }

  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ClientWriteInput,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.clientes.update(id, body, user);
    return { ok: true, item };
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    await this.clientes.remove(id, user);
    return { ok: true };
  }
}
