export interface ClientItem {
  id: number;
  nom: string;
  telephone: string;
  adresse: string;
  ville: string;
  ip_router: string | null;
  ip_antea: string | null;
  username_radius: string | null;
  id_ciudad: number | null;
  categoria: string;
  latitud: number | null;
  longitud: number | null;
  ciudad: { id: number; nombre: string } | null;
  incidencias: number;
  sitio_activo_id: number | null;
}

export interface ClientListResponse {
  ok: boolean;
  items: ClientItem[];
  page: number;
  pages: number;
  per_page: number;
  total: number;
  filters: {
    search: string;
    ville: string;
    ciudad: string;
    categoria: string;
    sort: string;
    order: string;
  };
  meta: {
    villes: string[];
    ciudades: { id: number; nombre: string }[];
  };
}

export interface ClientWriteBody {
  nom: string;
  telephone: string;
  adresse: string;
  ville: string;
  ip_router?: string;
  ip_antea?: string;
  username_radius?: string;
  id_ciudad: number;
  categoria: string;
}

export const CATEGORIA_LABELS: Record<string, string> = {
  particular: "Particular",
  corporativo: "Corporativo",
};

export interface ClientFichaItem extends ClientItem {
  cree_par: string | null;
  modifie_par: string | null;
  modifie_le: string | null;
  gps_actualizado_le: string | null;
  gps_actualizado_por: string | null;
}

export interface ClientFichaResponse {
  ok: boolean;
  radius_enabled: boolean;
  max_fotos: number;
  item: ClientFichaItem;
  stats: { total: number; solucionadas: number; pendientes: number; bitrix: number };
  incidencias: {
    id: number;
    intitule: string;
    observations: string | null;
    status: string;
    ref_bitrix: string | null;
    date_heure: string;
    operateur: string;
  }[];
  fotos: { id: number; url: string }[];
  sitios_anteriores: {
    id: number;
    adresse: string;
    ville: string;
    hasta: string | null;
    latitud: number | null;
    longitud: number | null;
    fotos: number;
  }[];
  instalaciones: {
    id: number;
    fecha: string;
    tipo: string;
    estado: string;
    adresse: string | null;
    tecnico: string;
  }[];
  materiales: {
    id: number;
    fecha: string;
    nombre: string;
    tipo: string;
    cantidad: number;
    tecnico: string;
  }[];
  radius: {
    status: string;
    message?: string;
    from_cache: boolean;
    cache_age_minutes?: number;
    fetched_at?: string;
    data?: {
      account_status?: string;
      account_status_label?: string;
      connection_status?: string;
      connection_status_label?: string;
      online?: boolean;
      expiry?: string;
      days_remaining?: number | null;
      srvname?: string;
    };
  };
}
