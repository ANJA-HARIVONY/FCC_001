/** Avatar partagé avec Flask : `presentation/static/avatars/avatar_<id>.<ext>`. */

import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { repoRoot } from "../clientes/fotos.ts";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["jpg", "jpeg", "png", "webp"]);

export class AvatarError extends Error {}

export function avatarExt(mimetype: string, originalname: string): string | null {
  const ext = originalname.split(".").pop()?.toLowerCase() ?? "";
  if (ALLOWED.has(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  const mime = mimetype.toLowerCase();
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return "jpg";
  }
  if (mime === "image/png") {
    return "png";
  }
  if (mime === "image/webp") {
    return "webp";
  }
  return null;
}

export async function writeAvatarFile(userId: number, ext: string, data: Buffer): Promise<string> {
  const dir = path.join(repoRoot(), "presentation", "static", "avatars");
  await mkdir(dir, { recursive: true });
  const names = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    names
      .filter((name) => name.startsWith(`avatar_${userId}.`))
      .map((name) => unlink(path.join(dir, name)).catch(() => undefined)),
  );
  const filename = `avatar_${userId}.${ext}`;
  await writeFile(path.join(dir, filename), data);
  return `/static/avatars/${filename}`;
}
