import type { SalidaListItem } from "./types";

/** Texte du bouton Copiar, identique à materiales-copy.js. */
export function salidaCopyText(item: SalidaListItem): string {
  const materiales = item.lineas_vista
    .map((linea) => {
      const label = linea.modelo ? `${linea.nombre} (${linea.modelo})` : linea.nombre;
      return `${label} x${linea.cantidad}`;
    })
    .join("\n");
  return [item.client?.nom ?? "", materiales, item.observaciones ?? "", item.tecnico.nom].filter(Boolean).join("\n");
}

export async function copySalidaText(item: SalidaListItem): Promise<"ok" | "error"> {
  const text = salidaCopyText(item);
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
