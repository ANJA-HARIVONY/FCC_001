import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  backupFilename,
  buildSqlDump,
  escapeSqlValue,
  publicExportError,
} from "../src/cuenta/sql-export.ts";

describe("export SQL HeidiSQL", () => {
  const tables = [
    {
      name: "ciudad",
      createSql: "CREATE TABLE `ciudad` (`id` int)",
      columns: ["id", "nombre"],
      rows: [
        [1, "O'Connor"],
        [2, "línea\n2"],
      ],
    },
    {
      name: "agencia",
      createSql: "CREATE TABLE `agencia` (`id` int)",
      columns: ["id", "activo"],
      rows: [[1, true]],
    },
    {
      name: "vacia",
      createSql: "CREATE TABLE `vacia` (`id` int)",
      columns: ["id"],
      rows: [],
    },
  ];

  it("reprend l'en-tête Flask et toutes les tables fournies", () => {
    const sql = buildSqlDump({
      database: "fcc_001_db",
      host: "localhost",
      port: 3306,
      exportedAt: new Date("2026-10-21T09:00:00"),
      tables,
    });
    assert.match(sql, /^-- ============================================================\n-- Base de datos: fcc_001_db\n-- Servidor: localhost:3306\n/);
    assert.match(sql, /SET FOREIGN_KEY_CHECKS = 0;\nSET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\nSET NAMES utf8mb4;/);
    for (const table of tables) {
      assert.match(sql, new RegExp(`DROP TABLE IF EXISTS \`${table.name}\`;`));
      assert.match(sql, new RegExp(`CREATE TABLE \`${table.name}\``));
    }
    assert.ok(sql.includes("INSERT INTO `ciudad` (`id`, `nombre`) VALUES\n  (1, 'O\\'Connor'),\n  (2, 'línea\\n2');"));
    assert.ok(sql.includes("INSERT INTO `agencia` (`id`, `activo`) VALUES\n  (1, 1);"));
    assert.equal(sql.includes("INSERT INTO `vacia`"), false);
    assert.match(sql, /SET FOREIGN_KEY_CHECKS = 1;\n-- Fin de la exportación:/);
  });

  it("découpe les INSERT par lots de 100", () => {
    const rows = Array.from({ length: 101 }, (_, index) => [index + 1]);
    const sql = buildSqlDump({
      database: "fcc",
      host: "db",
      port: 3306,
      exportedAt: new Date("2026-10-21T09:00:00"),
      tables: [{ name: "lote", createSql: "CREATE TABLE `lote` (`id` int)", columns: ["id"], rows }],
    });
    assert.equal(sql.split("INSERT INTO `lote`").length - 1, 2);
  });

  it("échappe comme le script Python et masque l'URI", () => {
    assert.equal(escapeSqlValue(null), "NULL");
    assert.equal(escapeSqlValue(false), "0");
    assert.equal(escapeSqlValue(12), "12");
    assert.equal(publicExportError(new Error("connect mysql://root:secret@db/fcc failed")), "No se pudo conectar a la base de datos.");
    assert.match(backupFilename(new Date("2026-10-21T09:08:07")), /^backup_20261021_090807\.sql$/);
  });
});
