/**
 * Rédaction Gemini des informes uniquement.
 * Clé présente → activé, sauf ETATS_USE_AI=false (même règle que Flask).
 * Sans clé, le service garde le texte local déterministe.
 * La clé voyage dans l'en-tête x-goog-api-key, jamais dans l'URL ni les journaux.
 */

import { redactSecrets } from "../logging/redact.ts";
import type { DataContext } from "./local-content.ts";

const SYSTEM_INSTRUCTION =
  "Analiza los datos y redacta un informe profesional, claro y breve. " +
  "Responde en español. No inventes cifras ni hechos: utiliza únicamente " +
  "los datos proporcionados. Distingue clientes corporativos y particulares " +
  "cuando sea relevante, y ten en cuenta las notas del día del período. " +
  "Tono concreto, útil para un responsable de atención al cliente.";

type Env = Record<string, string | undefined>;

export function etatsUseAi(env: Env = process.env): boolean {
  const flag = (env.ETATS_USE_AI ?? "").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no" || flag === "off") {
    return false;
  }
  const key = (env.GEMINI_API_KEY ?? "").trim();
  if (!key) {
    return false;
  }
  return true;
}

export async function generateWithGemini(
  typeEtat: string,
  ctx: DataContext,
  promptPersonnalise: string,
  env: Env = process.env,
): Promise<{ success: true; data: Record<string, unknown>; model: string } | { success: false; error: string }> {
  const apiKey = (env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) {
    return { success: false, error: "GEMINI_API_KEY no está configurada" };
  }
  const model = (env.GEMINI_MODEL ?? "gemini-3.6-flash").trim();
  const base = (env.GEMINI_API_URL ?? "https://generativelanguage.googleapis.com/v1beta/models").replace(/\/$/, "");
  const url = base.includes(":generateContent") ? base : `${base}/${model}:generateContent`;
  const jsonMode = typeEtat !== "custom";
  const prompt = buildPrompt(typeEtat, ctx, promptPersonnalise);
  const timeout = Number(env.GEMINI_TIMEOUT || 60) * 1000;
  const maxTokens = Number(env.GEMINI_MAX_TOKENS || 4096);

  let result = await postGemini(url, apiKey, prompt, jsonMode, true, timeout, maxTokens, model);
  if (!result.success && result.thinkingRejected) {
    result = await postGemini(url, apiKey, prompt, jsonMode, false, timeout, maxTokens, model);
  }
  if (result.success || !result.notFound) {
    return result.success
      ? { success: true, data: result.data, model: result.model }
      : { success: false, error: result.error };
  }
  const fallback = await postGemini(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    apiKey,
    prompt,
    jsonMode,
    false,
    timeout,
    maxTokens,
    model,
    true,
  );
  return fallback.success
    ? { success: true, data: fallback.data, model: fallback.model }
    : { success: false, error: fallback.error };
}

type GeminiCall =
  | { success: true; data: Record<string, unknown>; model: string; thinkingRejected?: false; notFound?: false }
  | { success: false; error: string; thinkingRejected: boolean; notFound: boolean };

async function postGemini(
  url: string,
  apiKey: string,
  prompt: string,
  jsonMode: boolean,
  withThinking: boolean,
  timeoutMs: number,
  maxTokens: number,
  model: string,
  interactions = false,
  retry = true,
): Promise<GeminiCall> {
  const generationConfig: Record<string, unknown> = { maxOutputTokens: maxTokens };
  if (withThinking && !interactions) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  if (jsonMode && !interactions) {
    generationConfig.responseMimeType = "application/json";
  }
  const payload = interactions
    ? {
        model,
        input: prompt,
        system_instruction: SYSTEM_INSTRUCTION,
        store: false,
        generation_config: {
          max_output_tokens: maxTokens,
          ...(jsonMode ? { response_format: { type: "text", mime_type: "application/json" } } : {}),
        },
      }
    : {
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status >= 300 && response.status < 400) {
      return { success: false, error: "Error de red Gemini.", thinkingRejected: false, notFound: false };
    }
    const body = await response.text().catch(() => "");
    if (!response.ok && retry && (response.status === 429 || response.status === 503)) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return postGemini(url, apiKey, prompt, jsonMode, withThinking, timeoutMs, maxTokens, model, interactions, false);
    }
    if (!response.ok && (response.status === 429 || response.status === 503)) {
      return {
        success: false,
        error: "Gemini está saturado en este momento. Inténtelo de nuevo.",
        thinkingRejected: false,
        notFound: false,
      };
    }
    if (!response.ok) {
      const detail = safeGeminiError(body);
      const error = redactSecrets(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
      const lower = error.toLowerCase();
      return {
        success: false,
        error,
        thinkingRejected: response.status === 400 && lower.includes("thinking"),
        notFound: response.status === 404,
      };
    }
    let payloadJson: Record<string, unknown> = {};
    try {
      payloadJson = body ? (JSON.parse(body) as Record<string, unknown>) : {};
    } catch {
      return { success: false, error: "Respuesta Gemini inválida.", thinkingRejected: false, notFound: false };
    }
    if (payloadJson.error) {
      const err = payloadJson.error;
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : "Error Gemini";
      return {
        success: false,
        error: redactSecrets(message || "Error Gemini"),
        thinkingRejected: false,
        notFound: false,
      };
    }
    const text = extractOutputText(payloadJson);
    if (!text) {
      return { success: false, error: "Gemini devolvió una respuesta vacía", thinkingRejected: false, notFound: false };
    }
    const data = coerceGeminiData(text, jsonMode);
    return { success: true, data, model: String(payloadJson.model ?? model) };
  } catch (err) {
    return {
      success: false,
      error: redactSecrets(err instanceof Error ? err.message : "Error desconocido de Gemini"),
      thinkingRejected: false,
      notFound: false,
    };
  }
}

function safeGeminiError(body: string): string {
  try {
    const payload = JSON.parse(body) as { error?: { message?: string } | string };
    if (payload.error && typeof payload.error === "object" && payload.error.message) {
      return payload.error.message.slice(0, 400);
    }
    if (typeof payload.error === "string") {
      return payload.error.slice(0, 400);
    }
  } catch {
    return body.slice(0, 400);
  }
  return body.slice(0, 400);
}

function extractOutputText(responseData: Record<string, unknown>): string {
  if (typeof responseData.output_text === "string" && responseData.output_text.trim()) {
    return responseData.output_text.trim();
  }
  const candidates = Array.isArray(responseData.candidates) ? responseData.candidates : [];
  const first = candidates[0] as { content?: { parts?: Array<{ text?: string; thought?: boolean }> } } | undefined;
  const parts = first?.content?.parts ?? [];
  const visible = parts.filter((part) => part?.text && !part.thought).map((part) => part.text ?? "");
  const text = (visible.length ? visible : parts.map((part) => part?.text ?? "")).join("").trim();
  if (text) {
    return text;
  }
  const steps = Array.isArray(responseData.steps) ? responseData.steps : [];
  const chunks: string[] = [];
  for (const step of steps) {
    if (!step || typeof step !== "object") {
      continue;
    }
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const item of content) {
      if (typeof item === "string") {
        chunks.push(item);
      } else if (item && typeof item === "object" && "text" in item) {
        chunks.push(String((item as { text?: unknown }).text ?? ""));
      }
    }
  }
  return chunks.join("").trim();
}

function coerceGeminiData(text: string, jsonMode: boolean): Record<string, unknown> {
  const parsed = extractJson(text);
  if (parsed) {
    if (!jsonMode && !parsed.analyse_personnalisee && typeof parsed.resume_executif === "string") {
      parsed.analyse_personnalisee = parsed.resume_executif;
    }
    return parsed;
  }
  if (!jsonMode) {
    return { analyse_personnalisee: text };
  }
  return { resume_executif: text };
}

function buildPrompt(typeEtat: string, ctx: DataContext, promptPersonnalise: string): string {
  const cats = ctx.clientes_categoria;
  const categoria = cats
    ? `Corporativos: ${cats.incidents_corporativo} incidencia(s) (${cats.clientes_corporativo} cliente(s)). Particulares: ${cats.incidents_particular} incidencia(s) (${cats.clientes_particular} cliente(s)).`
    : "Sin desglose de categoría.";
  const notas = (ctx.notas_del_dia ?? [])
    .slice(0, 60)
    .map((nota) => `- ${nota.fecha} (${nota.ciudad} · ${nota.agencia}): ${nota.texto}`)
    .join("\n") || "Sin notas del día.";
  const tipos = Object.entries(ctx.incidents_par_type ?? {})
    .map(([label, count]) => `- ${label}: ${count}`)
    .join("\n") || "Ningún dato disponible";
  const header = [
    `PERÍODO: ${ctx.periode}`,
    `AGENCIA: ${ctx.agence_label}`,
    `Total incidentes: ${ctx.total_incidents}`,
    `Solucionadas (a distancia): ${ctx.incidents_resolus}`,
    `Pendientes: ${ctx.incidents_en_cours}`,
    `Bitrix (terreno): ${ctx.incidents_bitrix}`,
    `Tasa de resolución: ${ctx.taux_resolution}%`,
    `Clientes impactados: ${ctx.nombre_clients_impactes}`,
    `Operadores activos: ${ctx.nombre_operateurs_actifs}`,
    "",
    "CATEGORÍAS:",
    categoria,
    "",
    "NOTAS DEL DÍA:",
    notas,
  ].join("\n");

  if (typeEtat === "analysis") {
    const evolution = (ctx.evolution ?? [])
      .map((point) => `- ${point.label}: ${point.count} (solucionadas ${point.solucionadas}, bitrix ${point.bitrix})`)
      .join("\n") || "Ningún dato de evolución disponible";
    return `${header}\n\nEVOLUCIÓN TEMPORAL:\n${evolution}\n\nTIPOS MÁS FRECUENTES:\n${tipos}\n\nFORMATO RESPUESTA (JSON):\n{"tendances_principales":["Tendencia 1","Tendencia 2","Tendencia 3"]}\n\nResponde ÚNICAMENTE con el JSON, sin texto adicional.`;
  }
  if (typeEtat === "custom") {
    const compact = {
      ...ctx,
      evolution: (ctx.evolution ?? []).slice(0, 31),
      notas_del_dia: (ctx.notas_del_dia ?? []).slice(0, 60),
    };
    return [
      `El usuario solicita un análisis personalizado:\n"${promptPersonnalise || "(sin pregunta)"}"`,
      "",
      "Contexto de datos disponibles:",
      JSON.stringify(compact),
      "",
      "Redacta un informe breve y profesional en español.",
      "No inventes cifras. Distingue clientes corporativos y particulares.",
    ].join("\n");
  }
  if (typeEtat === "performance") {
    const rows = (ctx.activite_utilisateurs ?? [])
      .map((row) => `- ${row.usuario}: total ${row.total}, solucionadas ${row.solucionadas}, bitrix ${row.bitrix}`)
      .join("\n") || "Ningún dato disponible";
    return `${header}\n\nACTIVIDAD POR USUARIO:\n${rows}\n\nFORMATO RESPUESTA (JSON):\n{"resume_executif":"...","points_positifs":[],"points_attention":[],"recommandations":[]}\n\nResponde ÚNICAMENTE con el JSON, sin texto adicional.`;
  }
  const perf = Object.entries(ctx.operateurs_performance ?? {})
    .map(([name, stats]) => `- ${name}: ${stats.resolus}/${stats.total} incidentes`)
    .join("\n") || "Ningún dato disponible";
  return `${header}\n\nDISTRIBUCIÓN POR TIPO:\n${tipos}\n\nRENDIMIENTO OPERADORES:\n${perf}\n\nFORMATO RESPUESTA (JSON):\n{"resume_executif":"...","points_positifs":[],"points_attention":[],"recommandations":[]}\n\nResponde ÚNICAMENTE con el JSON, sin texto adicional.`;
}

function extractJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function mergeAiContenu(
  localData: Record<string, unknown>,
  aiData: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...localData };
  for (const [key, value] of Object.entries(aiData)) {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
      continue;
    }
    merged[key] = value;
  }
  if (localData.evolution) {
    merged.evolution = localData.evolution;
  }
  if (localData.activite_utilisateurs) {
    merged.activite_utilisateurs = localData.activite_utilisateurs;
  }
  if (localData.agence_label) {
    merged.agence_label = localData.agence_label;
  }
  if (localData.kpis_cles) {
    merged.kpis_cles = localData.kpis_cles;
  }
  if (localData.notas_del_dia) {
    merged.notas_del_dia = localData.notas_del_dia;
  }
  if (localData.clientes_categoria) {
    merged.clientes_categoria = localData.clientes_categoria;
  }
  return merged;
}
