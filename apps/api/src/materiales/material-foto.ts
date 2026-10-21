import { existsSync } from "node:fs";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { repoRoot } from "../clientes/fotos.ts";

export const MAX_MATERIAL_FOTO_BYTES = 2 * 1024 * 1024;

const MIME_EXT: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class MaterialFotoError extends Error {}

export function materialFotoDirs(): string[] {
  const root = repoRoot();
  return [
    path.join(root, "presentation", "uploads", "materiales"),
    path.join(root, "instance", "uploads", "materiales"),
    path.join(root, "presentation", "static", "materiales"),
  ];
}

export function materialFotoExt(mimetype: string, originalname: string): "jpg" | "png" | "webp" | null {
  const fromMime = MIME_EXT[mimetype.toLowerCase()];
  if (fromMime) {
    return fromMime;
  }
  const ext = originalname.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") {
    return "jpg";
  }
  if (ext === "png" || ext === "webp") {
    return ext;
  }
  return null;
}

/** Nom déjà stocké, sans traversée de répertoire. */
export function storedMaterialFotoName(filename: string): string | null {
  const base = path.posix.basename(filename.replaceAll("\\", "/"));
  if (!/^material_\d+\.(jpe?g|png|webp)$/i.test(base)) {
    return null;
  }
  return base;
}

export function mimeForMaterialFoto(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") {
    return "image/png";
  }
  if (ext === "webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

export function resolveMaterialFoto(filename: string): { path: string; mime: string } | null {
  const name = storedMaterialFotoName(filename);
  if (!name) {
    return null;
  }
  for (const dir of materialFotoDirs()) {
    const root = path.resolve(dir);
    const full = path.resolve(dir, name);
    if (!full.startsWith(`${root}${path.sep}`) || !existsSync(full)) {
      continue;
    }
    return { path: full, mime: mimeForMaterialFoto(name) };
  }
  return null;
}

export async function removeMaterialFotoFiles(materialId: number): Promise<void> {
  const prefix = `material_${materialId}.`;
  for (const dir of materialFotoDirs()) {
    let names: string[] = [];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.startsWith(prefix)) {
        continue;
      }
      await unlink(path.join(dir, name)).catch(() => undefined);
    }
  }
}

export async function saveMaterialFoto(
  materialId: number,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
): Promise<string> {
  const ext = materialFotoExt(file.mimetype || "", file.originalname || "");
  if (!ext) {
    throw new MaterialFotoError("Formato de foto no válido (JPG, PNG, WEBP).");
  }
  if (file.size > MAX_MATERIAL_FOTO_BYTES || file.buffer.length > MAX_MATERIAL_FOTO_BYTES) {
    throw new MaterialFotoError("La foto es demasiado grande (máx. 2 MB).");
  }
  await removeMaterialFotoFiles(materialId);
  const dir = materialFotoDirs()[0]!;
  await mkdir(dir, { recursive: true });
  const name = `material_${materialId}.${ext}`;
  const full = path.resolve(dir, name);
  if (!full.startsWith(`${path.resolve(dir)}${path.sep}`)) {
    throw new MaterialFotoError("Formato de foto no válido (JPG, PNG, WEBP).");
  }
  await writeFile(full, file.buffer);
  return `/uploads/materiales/${name}`;
}
