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
  terminada_le: string | null;
  client: {
    id: number;
    nom: string;
    telephone: string;
    adresse: string;
    ville: string;
  };
  sitio: { id: number; adresse: string; ville: string } | null;
  salidas: {
    id: number;
    lineas: {
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

export const ESTADO_BADGE: Record<string, string> = {
  en_curso: "bg-warning text-dark",
  terminada: "bg-success",
};

export const TIPO_BADGE: Record<string, string> = {
  nueva: "bg-primary",
  traslado: "bg-info text-dark",
};
