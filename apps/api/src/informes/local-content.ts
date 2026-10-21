/** Contenu déterministe ES (parité `_build_etat_content_local`). */

export interface DataContext {
  periode: string;
  total_incidents: number;
  incidents_resolus: number;
  incidents_en_cours: number;
  incidents_bitrix: number;
  taux_resolution: number;
  incidents_par_type: Record<string, number>;
  operateurs_performance: Record<string, { total: number; resolus: number }>;
  nombre_clients_impactes: number;
  nombre_operateurs_actifs: number;
  agence_id: number | null;
  agence_label: string;
  clientes_categoria: {
    incidents_corporativo: number;
    incidents_particular: number;
    clientes_corporativo: number;
    clientes_particular: number;
  };
  notas_del_dia: Array<{
    fecha: string;
    fecha_iso: string;
    texto: string;
    ciudad: string;
    agencia: string;
  }>;
  evolution: Array<{
    label: string;
    count: number;
    solucionadas: number;
    bitrix: number;
    apreciacion?: string | null;
  }>;
  activite_utilisateurs: Array<{
    usuario: string;
    total: number;
    solucionadas: number;
    bitrix: number;
  }>;
  error?: string;
}

function sharedFields(ctx: DataContext) {
  return {
    notas_del_dia: ctx.notas_del_dia ?? [],
    clientes_categoria: ctx.clientes_categoria ?? {},
    agence_label: ctx.agence_label,
  };
}

function categoriaCountsText(ctx: DataContext): string {
  const cats = ctx.clientes_categoria || {};
  const corp = Number(cats.incidents_corporativo || 0);
  const part = Number(cats.incidents_particular || 0);
  return (
    `Corporativos: ${corp} incidencia(s) ` +
    `(${Number(cats.clientes_corporativo || 0)} cliente(s)). ` +
    `Particulares: ${part} incidencia(s) ` +
    `(${Number(cats.clientes_particular || 0)} cliente(s)).`
  );
}

export function buildEtatContentLocal(
  typeEtat: string,
  ctx: DataContext,
  promptPersonnalise = "",
): Record<string, unknown> {
  const tc = Number(ctx.total_incidents || 0);
  const tr = Number(ctx.taux_resolution || 0);
  const periode = ctx.periode || "";

  if (typeEtat === "analysis") {
    const tendances: string[] = [];
    if (tc === 0) {
      tendances.push("No hay incidentes en el período seleccionado.");
    } else {
      tendances.push(`Volumen total: ${tc} incidente(s) en el período analizado.`);
      tendances.push(`Tasa de resolución (Solucionadas): ${tr} %.`);
      tendances.push(`Bitrix (intervención en terreno): ${Number(ctx.incidents_bitrix || 0)}.`);
      if (ctx.agence_label) {
        tendances.push(`Agencia considerada: ${ctx.agence_label}.`);
      }
      if (ctx.clientes_categoria) {
        tendances.push(categoriaCountsText(ctx));
      }
      const notas = ctx.notas_del_dia || [];
      if (notas.length) {
        tendances.push(`${notas.length} nota(s) del día en el período (apreciaciones operativas).`);
      }
    }
    return {
      tendances_principales: tendances,
      evolution: ctx.evolution || [],
      ...sharedFields(ctx),
    };
  }

  if (typeEtat === "custom") {
    const prompt = (promptPersonnalise || "").trim();
    const lines = [
      "Informe generado sin conexión a IA (modo local).",
      "",
      "Solicitud del usuario:",
      prompt || "(sin pregunta personalizada)",
      "",
      "Resumen cuantitativo del periodo:",
      `- Periodo: ${periode}`,
      `- Total incidentes: ${tc}`,
      `- Resueltos (Solucionadas): ${Number(ctx.incidents_resolus || 0)}`,
      `- Pendientes: ${Number(ctx.incidents_en_cours || 0)}`,
      `- Bitrix: ${Number(ctx.incidents_bitrix || 0)}`,
      `- Tasa de resolucion: ${tr} %`,
      `- Clientes impactados (unicos): ${Number(ctx.nombre_clients_impactes || 0)}`,
      `- ${categoriaCountsText(ctx)}`,
      `- Operadores activos: ${Number(ctx.nombre_operateurs_actifs || 0)}`,
    ];
    const notas = ctx.notas_del_dia || [];
    if (notas.length) {
      lines.push("", "Notas del día:");
      for (const nota of notas) {
        lines.push(`- ${nota.fecha}: ${nota.texto}`);
      }
    }
    return {
      analyse_personnalisee: lines.join("\n"),
      ...sharedFields(ctx),
    };
  }

  if (typeEtat === "performance") {
    const cats = ctx.clientes_categoria || {};
    return {
      resume_executif:
        `Actividad por usuario para ${periode}. ` +
        `Total incidentes: ${tc}. Solucionadas: ${Number(ctx.incidents_resolus || 0)}. ` +
        `Bitrix (terreno): ${Number(ctx.incidents_bitrix || 0)}. ` +
        `${categoriaCountsText(ctx)}`,
      activite_utilisateurs: ctx.activite_utilisateurs || [],
      kpis_cles: {
        USUARIOS_ACTIVOS: String(Number(ctx.nombre_operateurs_actifs || 0)),
        TOTAL_INCIDENTES: String(tc),
        SOLUCIONADAS: String(Number(ctx.incidents_resolus || 0)),
        BITRIX_TERRENO: String(Number(ctx.incidents_bitrix || 0)),
        INCIDENTES_CORPORATIVO: String(Number(cats.incidents_corporativo || 0)),
        INCIDENTES_PARTICULAR: String(Number(cats.incidents_particular || 0)),
      },
      ...sharedFields(ctx),
    };
  }

  // summary (défaut)
  const resume =
    `Período analizado: ${periode}. ` +
    `Se registran ${tc} incidente(s) con una tasa de resolución de ${tr} %. ` +
    `${categoriaCountsText(ctx)}`;
  const pointsPos: string[] = [];
  const pointsAtt: string[] = [];
  if (tc === 0) {
    pointsAtt.push(
      "No hay incidentes en el período seleccionado. Verifique las fechas o la carga de datos.",
    );
  } else {
    pointsPos.push(`${tc} incidente(s) considerados para el análisis.`);
    if (tr >= 70) {
      pointsPos.push(`Tasa de resolución alta (${tr} %).`);
    } else if (tr < 40) {
      pointsAtt.push(
        `Tasa de resolución baja (${tr} %). Priorice el tratamiento de los casos pendientes.`,
      );
    }
  }
  const op = ctx.operateurs_performance || {};
  const opEntries = Object.entries(op);
  if (opEntries.length) {
    const [bestName] = opEntries.reduce((best, cur) => {
      const bestRatio = best[1].resolus / Math.max(best[1].total, 1);
      const curRatio = cur[1].resolus / Math.max(cur[1].total, 1);
      return curRatio > bestRatio ? cur : best;
    });
    pointsPos.push(`Operador con mejor ratio resuelto/total (indicativo): ${bestName}.`);
  }

  return {
    resume_executif: resume,
    points_positivos: pointsPos,
    points_attention: pointsAtt,
    kpis_cles: {
      TOTAL_INCIDENTS: String(tc),
      TAUX_RESOLUTION: `${tr} %`,
      PENDIENTES: String(Number(ctx.incidents_en_cours || 0)),
      BITRIX: String(Number(ctx.incidents_bitrix || 0)),
      SOLUCIONADAS_DISTANCIA: String(Number(ctx.incidents_resolus || 0)),
      INCIDENTES_CORPORATIVO: String(
        Number((ctx.clientes_categoria || {}).incidents_corporativo || 0),
      ),
      INCIDENTES_PARTICULAR: String(
        Number((ctx.clientes_categoria || {}).incidents_particular || 0),
      ),
    },
    recommandations: [
      "Continuar el seguimiento de incidentes en estado Pendiente.",
      "Verificar la coherencia de estados (Solucionadas / Bitrix) para afinar los indicadores.",
    ],
    ...sharedFields(ctx),
  };
}
