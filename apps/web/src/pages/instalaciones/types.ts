export interface InstalacionListItem {
  id: number;
  fecha: string;
  tipo: string;
  tipo_label: string;
  estado: string;
  estado_label: string;
  tecnico: { id: number; nom: string };
  client: { id: number; nom: string };
  materiales: string;
  materiales_lineas: string[];
  can_delete: boolean;
}

export interface InstalacionDetail extends InstalacionListItem {
  observaciones: string | null;
  id_sitio: number | null;
  id_sitio_origen: number | null;
  fecha_registro: string;
  fecha_modificacion: string | null;
  terminada_le: string | null;
  registrado_por: { id: number; nom: string } | null;
  modificado_por: { id: number; nom: string } | null;
  terminada_por: { id: number; nom: string } | null;
  client: {
    id: number;
    nom: string;
    telephone: string;
    adresse: string;
    ville: string;
  };
  sitio: {
    id: number;
    adresse: string;
    ville: string;
    activo: boolean;
    google_maps_url: string | null;
  } | null;
  sitio_origen: { id: number; adresse: string; ville: string } | null;
  salidas: {
    id: number;
    fecha: string;
    tecnico: { id: number; nom: string };
    lineas: {
      id: number;
      id_material: number;
      cantidad: number;
      material: { nombre: string; modelo: string | null } | null;
    }[];
  }[];
  traslado_lineas: {
    id: number;
    id_material: number;
    cantidad: number;
    accion: string;
    material: { nombre: string; modelo: string | null } | null;
  }[];
}

export function formatFecha(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) {
    return iso;
  }
  return `${day}/${month}/${year}`;
}

export function formatFechaHora(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const TRASLADO_ACCION_BADGE: Record<string, string> = {
  reutilizado: "bg-success",
  retirado: "bg-secondary",
};

export const TRASLADO_ACCION_LABEL: Record<string, string> = {
  reutilizado: "Reutilizado",
  retirado: "Retirado",
};

export const ESTADO_BADGE: Record<string, string> = {
  en_curso: "bg-warning text-dark",
  terminada: "bg-success",
};

export const TIPO_BADGE: Record<string, string> = {
  nueva: "bg-primary",
  traslado: "bg-info text-dark",
};
