/** Même texte que `copierInstalacion` : client, matériaux (une ligne chacun), técnico. */
export function instalacionCopyText(client: string, lineas: string[], tecnico: string): string {
  const materiales = lineas.map((line) => line.trim()).filter(Boolean).join("\n");
  return [client.trim(), materiales, tecnico.trim()].filter(Boolean).join("\n");
}
