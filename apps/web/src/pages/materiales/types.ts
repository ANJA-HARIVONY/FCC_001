export function materialFotoSrc(foto: string | null): string | null {
  if (!foto) {
    return null;
  }
  const name = foto.replaceAll("\\", "/").split("/").pop() ?? "";
  if (!/^material_\d+\.(jpe?g|png|webp)$/i.test(name)) {
    return null;
  }
  return `/api/materiales/fotos/${name}`;
}

export interface MaterialItem {
  id: number;
  nombre: string;
  tipo: string;
  tipo_label: string;
  activo: boolean;
  descripcion: string | null;
  modelo: string | null;
  foto: string | null;
}

export interface SalidaLineaVista {
  nombre: string;
  modelo: string | null;
  cantidad: number;
}

export interface SalidaListItem {
  id: number;
  fecha: string;
  tipo_salida: string;
  tipo_label: string;
  estado: string;
  tecnico: { id: number; nom: string };
  client: { id: number; nom: string; telephone: string } | null;
  observaciones: string | null;
  lineas_vista: SalidaLineaVista[];
  materiales: string;
}

export function salidaClienteLabel(item: Pick<SalidaListItem, "client" | "tipo_salida">): string {
  if (item.client) {
    return item.client.nom;
  }
  if (item.tipo_salida === "uso_interno") {
    return "Uso interno";
  }
  return "Uso general";
}

export function formatSalidaFecha(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return iso;
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export interface SalidaDetail extends SalidaListItem {
  observaciones: string | null;
  id_instalacion: number | null;
  lineas: {
    id: number;
    id_material: number;
    cantidad: number;
    material: { id: number; nombre: string; modelo: string | null; tipo: string } | null;
  }[];
}

export const SALIDA_TIPO_BADGE: Record<string, string> = {
  uso_interno: "bg-success",
  incidencia: "bg-warning text-dark",
  instalacion: "bg-primary",
};
