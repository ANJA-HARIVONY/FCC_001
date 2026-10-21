/** Dump SQL compatible HeidiSQL. Même texte que tools/export_database_sql.py. */

import { redactSecrets } from "../logging/redact.ts";

export interface DumpTable {
  name: string;
  createSql: string;
  columns: string[];
  rows: unknown[][];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatSqlDateTime(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

export function backupFilename(now = new Date()): string {
  return `backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.sql`;
}

function quoteString(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  return `'${escaped}'`;
}

/** Même règles que escape_value : NULL, booléen, nombre, date, puis chaîne. */
export function escapeSqlValue(value: unknown): string {
  if (value == null) {
    return "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (value instanceof Date) {
    return `'${formatSqlDateTime(value)}'`;
  }
  if (Buffer.isBuffer(value)) {
    return quoteString(value.toString("utf8"));
  }
  return quoteString(String(value));
}

export function quoteIdent(name: string): string {
  if (!/^[\w$]+$/.test(name)) {
    throw new Error("Nombre de tabla no exportable.");
  }
  return `\`${name}\``;
}

export function databaseLabel(): { database: string; host: string; port: string } {
  if (process.env.DB_NAME || process.env.DB_HOST) {
    return {
      database: process.env.DB_NAME || "fcc_001_db",
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || "3306",
    };
  }
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    return {
      database: url.pathname.replace(/^\//, "") || "fcc_001_db",
      host: url.hostname || "localhost",
      port: url.port || "3306",
    };
  } catch {
    return { database: "fcc_001_db", host: "localhost", port: "3306" };
  }
}

export function publicExportError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "error de exportación";
  const first = (raw.split("\n")[0] ?? "error de exportación").slice(0, 200);
  const password = process.env.DB_PASSWORD ?? "";
  if (
    /mysql:\/\//i.test(first) ||
    first.includes("://") ||
    (password.length > 0 && first.includes(password)) ||
    /access denied|econnrefused|enotfound/i.test(first)
  ) {
    return "No se pudo conectar a la base de datos.";
  }
  return redactSecrets(first);
}

export function buildSqlDump(input: {
  database: string;
  host: string;
  port: string | number;
  exportedAt: Date;
  finishedAt?: Date;
  tables: DumpTable[];
}): string {
  const exported = formatSqlDateTime(input.exportedAt);
  const finished = formatSqlDateTime(input.finishedAt ?? input.exportedAt);
  const lines: string[] = [];
  lines.push(`-- ============================================================
-- Base de datos: ${input.database}
-- Servidor: ${input.host}:${input.port}
-- Exportado: ${exported}
-- Compatible con: HeidiSQL / MariaDB
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

`);

  for (const table of input.tables) {
    const ident = quoteIdent(table.name);
    lines.push("-- ------------------------------------------------------------\n");
    lines.push(`-- Table: ${ident}\n`);
    lines.push("-- ------------------------------------------------------------\n\n");
    lines.push(`DROP TABLE IF EXISTS ${ident};\n`);
    lines.push(`${table.createSql};\n\n`);
    if (table.rows.length) {
      const cols = table.columns.map((column) => quoteIdent(column)).join(", ");
      lines.push(`-- Datos de la tabla ${ident} (${table.rows.length} registros)\n`);
      for (let index = 0; index < table.rows.length; index += 100) {
        const batch = table.rows.slice(index, index + 100);
        const values = batch
          .map((row) => `  (${row.map((value) => escapeSqlValue(value)).join(", ")})`)
          .join(",\n");
        lines.push(`INSERT INTO ${ident} (${cols}) VALUES\n${values};\n`);
      }
    }
    lines.push("\n");
  }

  lines.push("SET FOREIGN_KEY_CHECKS = 1;\n");
  lines.push(`-- Fin de la exportación: ${finished}\n`);
  return lines.join("");
}
