import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { etatVisible, type Actor } from "@fcc/domain";

import { dumpParametres } from "../src/informes/data-context.ts";
import { etatsUseAi } from "../src/informes/gemini.ts";
import { buildEtatContentLocal, type DataContext } from "../src/informes/local-content.ts";
import { getDateRangeForPeriod } from "../src/informes/period.ts";

function emptyCtx(over: Partial<DataContext> = {}): DataContext {
  return {
    periode: "01/10/2026 - 19/10/2026",
    total_incidents: 10,
    incidents_resolus: 7,
    incidents_en_cours: 2,
    incidents_bitrix: 1,
    taux_resolution: 70,
    incidents_par_type: { Fibra: 5 },
    operateurs_performance: { Ana: { total: 6, resolus: 5 } },
    nombre_clients_impactes: 4,
    nombre_operateurs_actifs: 2,
    agence_id: 10,
    agence_label: "Afrimal",
    clientes_categoria: {
      incidents_corporativo: 3,
      incidents_particular: 7,
      clientes_corporativo: 2,
      clientes_particular: 3,
    },
    notas_del_dia: [],
    evolution: [],
    activite_utilisateurs: [{ usuario: "Ana", total: 6, solucionadas: 5, bitrix: 1 }],
    ...over,
  };
}

describe("informes — visibilité et génération locale", () => {
  const adminA: Actor = {
    id: 1,
    role: "admin",
    idAgencia: 10,
    idCiudad: 100,
    authenticated: true,
  };
  const superadmin: Actor = {
    id: 2,
    role: "superadmin",
    idAgencia: 10,
    idCiudad: 100,
    authenticated: true,
  };

  it("visibilité : agence_id avec espace après les deux-points", () => {
    assert.equal(etatVisible(adminA, '{"agence_id": 10}'), true);
    assert.equal(etatVisible(adminA, '{"agence_id": 20}'), false);
    assert.equal(etatVisible(adminA, '{"agence_id":10}'), false);
    assert.equal(etatVisible(superadmin, "{}"), true);
  });

  it("dumpParametres produit le needle attendu pour agence_id", () => {
    const needle = `"agence_id": ${adminA.idAgencia}`;
    const params = dumpParametres({ periode: "current_month", agence_id: 10, ciudad_id: 100 });
    assert.ok(params.includes(needle));
    assert.equal(etatVisible(adminA, params), true);
    assert.equal(params.includes('"agence_id":10'), false);
  });

  it("sans clé / ETATS_USE_AI off → génération locale en espagnol", () => {
    const prevFlag = process.env.ETATS_USE_AI;
    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.ETATS_USE_AI;
    delete process.env.GEMINI_API_KEY;
    try {
      assert.equal(etatsUseAi(), false);
      assert.equal(etatsUseAi({ GEMINI_API_KEY: "cle-test" }), true);
      assert.equal(etatsUseAi({ GEMINI_API_KEY: "cle-test", ETATS_USE_AI: "false" }), false);
      assert.equal(etatsUseAi({ ETATS_USE_AI: "true" }), false);
      const content = buildEtatContentLocal("summary", emptyCtx()) as {
        resume_executif?: string;
        points_positivos?: string[];
      };
      assert.ok(typeof content.resume_executif === "string");
      assert.match(content.resume_executif!, /Período analizado|incidente/);
      assert.ok(Array.isArray(content.points_positivos));
    } finally {
      if (prevFlag !== undefined) process.env.ETATS_USE_AI = prevFlag;
      else delete process.env.ETATS_USE_AI;
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
      else delete process.env.GEMINI_API_KEY;
    }
  });

  it("types analysis / performance / custom produisent des champs ES", () => {
    const analysis = buildEtatContentLocal("analysis", emptyCtx()) as {
      tendances_principales?: string[];
    };
    assert.ok(analysis.tendances_principales?.some((t) => /Volumen total|incidente/.test(t)));

    const perf = buildEtatContentLocal("performance", emptyCtx()) as {
      resume_executif?: string;
      activite_utilisateurs?: unknown[];
    };
    assert.match(perf.resume_executif ?? "", /Actividad por usuario/);
    assert.equal(perf.activite_utilisateurs?.length, 1);

    const custom = buildEtatContentLocal("custom", emptyCtx(), "¿Cuál es el pico?") as {
      analyse_personnalisee?: string;
    };
    assert.match(custom.analyse_personnalisee ?? "", /modo local/);
    assert.match(custom.analyse_personnalisee ?? "", /Cuál es el pico/);
  });

  it("périodes prédéfinies renvoient des bornes cohérentes", () => {
    const month = getDateRangeForPeriod("current_month");
    assert.ok(month.debut);
    assert.equal(month.debut!.getDate(), 1);
    assert.equal(month.fin, null);

    const lastWeek = getDateRangeForPeriod("last_week");
    assert.ok(lastWeek.debut);
    assert.ok(lastWeek.fin);

    const weekAtMonthStart = getDateRangeForPeriod("current_week", new Date(2026, 9, 1));
    assert.equal(weekAtMonthStart.debut!.getFullYear(), 2026);
    assert.equal(weekAtMonthStart.debut!.getMonth(), 9);
    assert.equal(weekAtMonthStart.debut!.getDate(), 1);

    const year = getDateRangeForPeriod("current_year", new Date(2026, 9, 20));
    assert.equal(year.debut!.getMonth(), 0);
    assert.equal(year.debut!.getDate(), 1);
    assert.equal(year.fin, null);

    const all = getDateRangeForPeriod("all_data", new Date(2026, 9, 20));
    assert.equal(all.debut, null);
    assert.equal(all.fin, null);

    const unknown = getDateRangeForPeriod("nope", new Date(2026, 9, 20));
    assert.equal(unknown.debut!.getMonth(), 6);
    assert.equal(unknown.debut!.getDate(), 22);
  });
});
