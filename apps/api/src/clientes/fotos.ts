import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_FOTOS = 10;
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function repoRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(`${path.sep}apps${path.sep}api`)) {
    return path.resolve(cwd, "../..");
  }
  return cwd;
}

export function fotoDirs(): string[] {
  const root = repoRoot();
  return [
    path.join(root, "presentation", "uploads", "instalaciones"),
    path.join(root, "instance", "uploads", "instalaciones"),
  ];
}

export function mimeForName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") {
    return "image/png";
  }
  if (ext === "webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

/** Nom de fichier déjà stocké, sans traversée de répertoire. */
export function storedFotoName(fichier: string): string | null {
  const normalized = fichier.replaceAll("\\", "/");
  const base = path.posix.basename(normalized);
  if (!base || base === "." || base === "..") {
    return null;
  }
  if (!/^[\w.-]+$/.test(base)) {
    return null;
  }
  const ext = base.split(".").pop()?.toLowerCase() ?? "";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return null;
  }
  return base;
}

export function resolveFotoPath(fichier: string): { path: string; mime: string } | null {
  const name = storedFotoName(fichier);
  if (!name) {
    return null;
  }
  for (const dir of fotoDirs()) {
    const root = path.resolve(dir);
    const full = path.resolve(dir, name);
    if (!full.startsWith(`${root}${path.sep}`)) {
      return null;
    }
    if (existsSync(full)) {
      return { path: full, mime: mimeForName(name) };
    }
  }
  return null;
}

export async function saveFotoFile(clientId: number, buffer: Buffer, mimetype: string): Promise<string> {
  const ext = MIME_EXT[mimetype];
  if (!ext) {
    throw new Error("type");
  }
  if (buffer.length > MAX_FOTO_BYTES) {
    throw new Error("size");
  }
  const dir = fotoDirs()[0]!;
  await mkdir(dir, { recursive: true });
  const name = `instalacion_${clientId}_${randomBytes(6).toString("hex")}.${ext}`;
  const full = path.resolve(dir, name);
  if (!full.startsWith(`${path.resolve(dir)}${path.sep}`)) {
    throw new Error("path");
  }
  await writeFile(full, buffer);
  return `/uploads/instalaciones/${name}`;
}

export async function removeFotoFile(fichier: string): Promise<void> {
  const found = resolveFotoPath(fichier);
  if (!found) {
    return;
  }
  await unlink(found.path).catch(() => undefined);
}
