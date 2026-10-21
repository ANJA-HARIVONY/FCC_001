import type { ClientItem } from "./types";

/** Texte du bouton Copiar, identique à copierClient dans clients.html. */
export function clientCopyText(client: ClientItem): string {
  return `
Nombre: ${client.nom}
Teléfono: ${client.telephone ?? ""}
Dirección: ${client.adresse ?? ""}
IPs: ${client.ip_router ?? ""} - ${client.ip_antea ?? ""}`;
}

export async function copyClientText(client: ClientItem): Promise<"ok" | "error"> {
  const text = clientCopyText(client);
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
    area.style.left = "-999999px";
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
