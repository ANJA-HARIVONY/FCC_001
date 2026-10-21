import type { IncidentListItem } from "./types";

/** Texte du bouton Copiar, identique à incident-copy.js (y compris « Ubicacíon »). */
export function incidentCopyText(item: IncidentListItem): string {
  return `
${item.client.nom}
${item.intitule}
${item.observations ?? ""}
Contacto: ${item.client.telephone ?? ""}
Ubicacíon: ${item.client.adresse ?? ""}
IPs: ${item.client.ip_router ?? ""} - ${item.client.ip_antea ?? ""}
Cuenta PPPoE: ${item.client.username_radius ?? ""}`;
}

export async function copyIncidentText(item: IncidentListItem): Promise<"ok" | "error"> {
  const text = incidentCopyText(item);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "ok";
    }
  } catch {
    /* repli ci-dessous */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
