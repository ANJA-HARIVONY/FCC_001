import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import {
  Body,
  Catch,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import multer from "multer";

import { AdminOnly } from "../auth/admin.guard.ts";
import { CurrentUser } from "../auth/current-user.ts";
import type { SessionRecord } from "../auth/session-store.ts";
import { MAX_MATERIAL_FOTO_BYTES, resolveMaterialFoto } from "./material-foto.ts";
import {
  MaterialesService,
  type MaterialFotoUpload,
  type MaterialWriteInput,
  type SalidaListQuery,
  type SalidaWriteInput,
} from "./materiales.service.ts";

@Catch(multer.MulterError)
class MaterialFotoFilter implements ExceptionFilter {
  catch(exception: multer.MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const error =
      exception.code === "LIMIT_FILE_SIZE"
        ? "La foto es demasiado grande (máx. 2 MB)."
        : "No se pudo subir la foto.";
    response.status(400).json({ ok: false, error });
  }
}

const fotoInterceptor = FileInterceptor("foto", {
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MATERIAL_FOTO_BYTES },
});

@Controller("api/materiales")
@AdminOnly()
export class MaterialesController {
  constructor(private readonly materiales: MaterialesService) {}

  @Get()
  async hub(@CurrentUser() user: SessionRecord) {
    const payload = await this.materiales.hub(user);
    return { ok: true, ...payload };
  }

  @Get("informe/export.xlsx")
  async exportInforme(@Query() query: Record<string, string>, @CurrentUser() user: SessionRecord) {
    const file = await this.materiales.informeXlsx(query, user);
    return new StreamableFile(Readable.from(file.buffer), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get("informe")
  async informe(@Query() query: Record<string, string>, @CurrentUser() user: SessionRecord) {
    return { ok: true, ...(await this.materiales.informe(query, user)) };
  }

  @Get("fotos/:filename")
  foto(@Param("filename") filename: string) {
    const file = resolveMaterialFoto(filename);
    if (!file) {
      throw new HttpException({ ok: false, error: "Foto no encontrada." }, HttpStatus.NOT_FOUND);
    }
    return new StreamableFile(createReadStream(file.path), {
      type: file.mime,
      disposition: "inline",
    });
  }

  @Get("catalogo")
  async catalogo(
    @Query("tipo") tipo?: string,
    @Query("sort") sort?: string,
    @Query("order") order?: string,
  ) {
    const payload = await this.materiales.listCatalogo(tipo, sort, order);
    return { ok: true, ...payload };
  }

  @Post("catalogo")
  @HttpCode(200)
  @UseFilters(MaterialFotoFilter)
  @UseInterceptors(fotoInterceptor)
  async createMaterial(
    @Body() body: MaterialWriteInput,
    @UploadedFile() file: MaterialFotoUpload | undefined,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.materiales.createMaterial(body, user, file);
    return { ok: true, item };
  }

  @Put("catalogo/:id")
  @UseFilters(MaterialFotoFilter)
  @UseInterceptors(fotoInterceptor)
  async updateMaterial(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: MaterialWriteInput,
    @UploadedFile() file: MaterialFotoUpload | undefined,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.materiales.updateMaterial(id, body, user, file);
    return { ok: true, item };
  }

  @Get("salidas")
  async salidas(@Query() query: SalidaListQuery, @CurrentUser() user: SessionRecord) {
    const payload = await this.materiales.listSalidas(query, user);
    return { ok: true, ...payload };
  }

  @Get("salidas/export.xlsx")
  async exportSalidas(@Query() query: SalidaListQuery, @CurrentUser() user: SessionRecord) {
    const file = await this.materiales.exportSalidasXlsx(query, user);
    return new StreamableFile(Readable.from(file.buffer), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get("salidas/options")
  async options(@CurrentUser() user: SessionRecord) {
    const payload = await this.materiales.formOptions(user);
    return { ok: true, ...payload };
  }

  @Get("salidas/:id")
  async salida(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    const item = await this.materiales.getSalida(id, user);
    return { ok: true, item };
  }

  @Post("salidas")
  @HttpCode(200)
  async createSalida(@Body() body: SalidaWriteInput, @CurrentUser() user: SessionRecord) {
    const item = await this.materiales.createSalida(body, user);
    return { ok: true, item };
  }

  @Put("salidas/:id")
  async updateSalida(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: SalidaWriteInput,
    @CurrentUser() user: SessionRecord,
  ) {
    const item = await this.materiales.updateSalida(id, body, user);
    return { ok: true, item };
  }

  @Delete("salidas/:id")
  @HttpCode(200)
  async deleteSalida(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    await this.materiales.deleteSalida(id, user);
    return { ok: true };
  }
}

@Controller("api/tecnicos")
@AdminOnly()
export class TecnicosController {
  constructor(private readonly materiales: MaterialesService) {}

  @Get(":id/ficha")
  async ficha(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: SessionRecord) {
    return { ok: true, ...(await this.materiales.tecnicoFicha(id, user)) };
  }
}
