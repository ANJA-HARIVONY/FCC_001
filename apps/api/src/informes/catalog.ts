/** Catálogo de tipos y períodos (paridad Flask `get_types_etats` / `etats_generer`). */

export const TYPE_ETATS = [
  {
    id: "summary",
    nom: "Estado General",
    description:
      "Totales del período, desglose por estado (solucionadas, pendientes, Bitrix), clientes corporativos y particulares, y notas del día.",
    icon: "fa-chart-line",
    kpi: "registered",
  },
  {
    id: "analysis",
    nom: "Evolución de Registros",
    description:
      "Serie temporal de incidencias por día, mes o año para detectar picos, tendencias y estacionalidad del volumen registrado.",
    icon: "fa-chart-area",
    kpi: "bitrix",
  },
  {
    id: "performance",
    nom: "Actividad por Usuario",
    description:
      "Carga de trabajo por operador: registros creados, casos resueltos y distribución de la actividad del equipo en el período.",
    icon: "fa-users",
    kpi: "resolved",
  },
  {
    id: "custom",
    nom: "Análisis Personalizado",
    description:
      "Informe a medida según su consigna: elija el foco analítico, el período y los filtros para una lectura específica.",
    icon: "fa-cog",
    kpi: "pending",
  },
] as const;

export const TYPE_IDS = TYPE_ETATS.map((t) => t.id);
export type TypeEtatId = (typeof TYPE_IDS)[number];

export const TYPE_TITLE: Record<string, string> = {
  summary: "Estado General",
  analysis: "Evolución de Registros",
  performance: "Actividad por Usuario",
  custom: "Análisis Personalizado",
};

export const PERIODES = [
  { id: "current_week", nom: "Semana actual" },
  { id: "current_month", nom: "Mes actual" },
  { id: "last_week", nom: "Semana pasada" },
  { id: "last_month", nom: "Mes pasado" },
  { id: "last_3_months", nom: "Últimos 3 meses" },
  { id: "custom", nom: "Período personalizado" },
] as const;

export function isTypeEtat(value: string): value is TypeEtatId {
  return (TYPE_IDS as readonly string[]).includes(value);
}
