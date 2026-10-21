import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpException } from "@nestjs/common";

import {
  applyNotas,
  buildSerie,
  incidentWhere,
  movementScope,
  normalizeApreciacionTexto,
  notaWhere,
  parseFecha,
  serializeInstalacionDia,
  summarizeIncidents,
} from "../src/cuenta/dashboard-rules.ts";
import { getDateRangeForPeriod } from "../src/informes/period.ts";

const admin = { role: "admin", idCiudad: 100, idAgencia: 10 };
const superadmin = { role: "superadmin", idCiudad: 100, idAgencia: 10 };

function incident(
  id: number,
  status: string,
  clientId: number,
  nom: string,
  operateurId: number,
  operateurNom: string,
  intitule: string,
  when = new Date(2026, 9, 20, 9, id),
) {
  return {
    id,
    status,
    intitule,
    id_client: clientId,
    id_operateur: operateurId,
    date_heure: when,
    client: {
      nom,
      adresse: `Calle ${clientId}`,
      categoria: clientId === 1 ? "corporativo" : "particular",
    },
    operateur: { nom: operateurNom },
  };
}

const incidents = [
  incident(1, "Pendiente", 1, "Empresa", 5, "Luis", "Aaa"),
  incident(2, "Solucionadas", 1, "Empresa", 5, "Luis", "Zzz"),
  incident(3, "Bitrix", 2, "Beta", 6, "Marta", "Caída", new Date(2026, 9, 19, 8)),
  incident(4, "Solucionadas", 3, "Gamma", 5, "Luis", "Luz", new Date(2026, 8, 2, 8)),
  incident(5, "Pendiente", 4, "Delta", 6, "Marta", "Router", new Date(2026, 9, 18, 8)),
  incident(6, "Pendiente", 7, "Eta", 5, "Luis", "Uno", new Date(2026, 9, 17, 8)),
  incident(8, "Pendiente", 8, "Zeta", 6, "Marta", "Dos", new Date(2026, 9, 16, 8)),
  incident(9, "Pendiente", 9, "Olvidado", 5, "Luis", "Tres", new Date(2026, 9, 15, 8)),
];

function clauses(where: unknown): object[] {
  if (where && typeof where === "object" && "AND" in where && Array.isArray(where.AND)) {
    return where.AND as object[];
  }
  return [];
}

describe("dashboard — périmètre et synthèse", () => {
  it("un admin est limité à son agencia et à sa ciudad", () => {
    assert.deepEqual(movementScope({ ciudad: "200", agencia: "20" }, admin), {
      ciudadId: 100,
      agenciaId: 10,
    });
    assert.deepEqual(clauses(incidentWhere({ period: "all_data" }, admin)), [
      { client: { id_ciudad: 100 } },
      { operateur: { id_agencia: 10 } },
    ]);
    assert.deepEqual(notaWhere({}, admin), { id_ciudad: 100, id_agencia: 10 });
  });

  it("le superadmin sans filtre n'ajoute pas de scope, la semaine a une borne", () => {
    assert.deepEqual(movementScope({}, superadmin), { ciudadId: null, agenciaId: null });
    const where = incidentWhere({}, superadmin) as { AND: { date_heure: { gte: Date } }[] };
    const range = getDateRangeForPeriod("current_week");
    assert.equal(where.AND.length, 1);
    assert.equal(where.AND[0].date_heure.gte.getTime(), range.debut!.getTime());
    assert.deepEqual(incidentWhere({ period: "all_data" }, superadmin), {});
    assert.deepEqual(notaWhere({}, superadmin), {});
  });

  it("le superadmin filtre ciudad et agencia", () => {
    assert.deepEqual(clauses(incidentWhere({ period: "all_data", ciudad: "200", agencia: "20" }, superadmin)), [
      { client: { id_ciudad: 200 } },
      { operateur: { id_agencia: 20 } },
    ]);
    assert.deepEqual(notaWhere({ ciudad: "200", agencia: "20" }, superadmin), {
      id_ciudad: 200,
      id_agencia: 20,
    });
  });

  it("compte les statuts, garde 5 clients et l'intitulé le plus grand", () => {
    const stats = summarizeIncidents(incidents);
    assert.equal(stats.total, 8);
    assert.equal(stats.solucionadas, 2);
    assert.equal(stats.pendiente, 5);
    assert.equal(stats.bitrix, 1);
    assert.equal(stats.clientes.length, 5);
    assert.equal(stats.clientes.some((row) => row.nom === "Olvidado"), false);
    assert.equal(stats.clientes[0].nom, "Empresa");
    assert.equal(stats.clientes[0].categoria, "corporativo");
    assert.equal(stats.clientes[0].adresse, "Calle 1");
    assert.equal(stats.clientes[0].intitule, "Zzz");
    assert.equal(stats.clientes[0].count, 2);
    assert.deepEqual(stats.por_operador[0], { id: 5, nom: "Luis", count: 5 });
  });

  it("sérialise une installation du jour", () => {
    const row = serializeInstalacionDia({
      id: 7,
      fecha: new Date(2026, 9, 20),
      tipo: "nueva",
      estado: "en_curso",
      client: { id: 1, nom: "Empresa", adresse: "Calle cliente", categoria: "corporativo" },
      client_sitio_instalacion_id_sitioToclient_sitio: { adresse: "Calle sitio" },
      operateur_instalacion_id_tecnicoTooperateur: { id: 5, nom: "Luis", avatar_url: "/avatars/luis.png" },
      material_salida: [
        {
          material_salida_linea: [
            { cantidad: 2, material: { nombre: "Router" } },
            { cantidad: 1, material: null },
          ],
        },
      ],
    });
    assert.equal(row.fecha, "20/10/2026");
    assert.equal(row.tipo_label, "Nueva");
    assert.equal(row.estado_label, "En curso");
    assert.equal(row.direccion, "Calle sitio");
    assert.equal(row.materiales, "Router x2, ? x1");
    assert.equal(row.tecnico?.avatar_url, "/avatars/luis.png");
    assert.equal(row.lineas.length, 2);
  });
});

describe("dashboard — série et note", () => {
  it("regroupe par jour, par mois et par année", () => {
    const rows = incidents.map((row) => ({ date_heure: row.date_heure, status: row.status }));
    const days = buildSerie(rows, "date");
    const day = days.find((item) => item.fecha === "2026-10-20");
    assert.equal(day?.date, "20/10");
    assert.equal(day?.count, 2);
    assert.equal(day?.solucionadas, 1);
    assert.equal(day?.bitrix, 0);

    const months = buildSerie(rows, "month");
    assert.equal(months.find((item) => item.fecha === "2026-10-01")?.date, "10/2026");
    assert.equal(months.find((item) => item.fecha === "2026-09-01")?.count, 1);

    const years = buildSerie(rows, "year");
    assert.equal(years.length, 1);
    assert.equal(years[0].fecha, "2026-01-01");
    assert.equal(years[0].date, "2026");
    assert.equal(years[0].count, incidents.length);
    assert.equal(years[0].bitrix, 1);
  });

  it("joint plusieurs notes du même jour, triées par lieu", () => {
    const items = buildSerie(
      [{ date_heure: new Date(2026, 9, 20, 10), status: "Pendiente" }],
      "date",
    );
    applyNotas(items, [
      { id: 8, texto: "Viento", fecha: new Date(2026, 9, 20), ciudad: "Bata", agencia: "Bata Centro" },
      { id: 4, texto: "Día normal", fecha: new Date(2026, 9, 20), ciudad: "Malabo", agencia: "Afrimal" },
      { id: 1, texto: "Autre mois", fecha: new Date(2026, 8, 2), ciudad: "Malabo", agencia: "Afrimal" },
    ]);
    assert.equal(items[0].apreciacion, "Bata · Bata Centro: Viento | Malabo · Afrimal: Día normal");
    assert.equal(items[0].apreciaciones[0].ciudad, "Bata");
  });

  it("une seule note reste sans préfixe de lieu", () => {
    const items = buildSerie([{ date_heure: new Date(2026, 9, 20, 10), status: "Bitrix" }], "date");
    applyNotas(items, [{ id: 4, texto: "Día normal", fecha: new Date(2026, 9, 20), ciudad: "Malabo", agencia: "Afrimal" }]);
    assert.equal(items[0].apreciacion, "Día normal");
    assert.equal(items[0].bitrix, 1);
  });

  it("refuse une fecha, une note vide ou une note trop longue", () => {
    assert.throws(() => parseFecha("20-10-2026"), (error: unknown) => error instanceof HttpException && error.getStatus() === 400);
    assert.throws(() => normalizeApreciacionTexto("   "), (error: unknown) => error instanceof HttpException && error.getStatus() === 400);
    assert.throws(
      () => normalizeApreciacionTexto("x".repeat(121)),
      (error: unknown) => error instanceof HttpException && error.getStatus() === 400,
    );
    assert.equal(normalizeApreciacionTexto("  Caída de sector  "), "Caída de sector");
    assert.equal(parseFecha("2026-10-20").getDate(), 20);
  });
});
