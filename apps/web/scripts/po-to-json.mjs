import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../src/locales");

/** msgid -> texte. msgstr vide : on garde le msgid (source espagnole). */
export function parsePo(source) {
  const catalog = {};
  const block = /msgid ((?:"(?:\\.|[^"\\])*"\r?\n?)+)msgstr ((?:"(?:\\.|[^"\\])*"\r?\n?)+)/g;
  for (const match of source.matchAll(block)) {
    const id = unescapePo(match[1]);
    const value = unescapePo(match[2]);
    if (!id) {
      continue;
    }
    catalog[id] = value || id;
  }
  return catalog;
}

function unescapePo(block) {
  const parts = [...block.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((part) => JSON.parse(`"${part[1]}"`));
  return parts.join("");
}

mkdirSync(outDir, { recursive: true });
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  for (const lang of ["es", "fr", "en"]) {
    const po = readFileSync(resolve(root, `i18n/translations/${lang}/LC_MESSAGES/messages.po`), "utf8");
    writeFileSync(resolve(outDir, `${lang}.json`), `${JSON.stringify(parsePo(po), null, 2)}\n`);
  }
}
