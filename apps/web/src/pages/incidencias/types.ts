export interface IncidentListItem {
  id: number;
  intitule: string;
  observations?: string | null;
  status: string;
  ref_bitrix: string | null;
  date_heure: string;
  bitrix_task_status: string | null;
  bitrix_status_label: string | null;
  bitrix_status_emoji: string | null;
  bitrix_responsible: string | null;
  bitrix_auto_load?: boolean;
  client: {
    id: number;
    nom: string;
    adresse: string;
    categoria: string;
    telephone: string;
    ville?: string;
    ip_router?: string | null;
    ip_antea?: string | null;
    username_radius?: string | null;
  };
  operateur: { id: number; nom: string; avatar_url?: string | null };
  can_delete: boolean;
  can_modify: boolean;
}

export interface IncidentDetail extends IncidentListItem {
  observations: string | null;
  modifie_le: string | null;
  modifie_par_nom: string | null;
  bitrix_fetch_locked: boolean;
  client: IncidentListItem["client"] & {
    ville: string;
    ip_router: string | null;
    ip_antea: string | null;
    username_radius: string | null;
    id_ciudad: number | null;
  };
  bitrix_api_enabled?: boolean;
  bitrix_error?: string | null;
  bitrix_extras?: {
    status_icon: string;
    show_plazo: boolean;
    deadline_label: string;
    is_overdue: boolean;
    plazo_label: string;
    priority_label: string;
    priority_icon: string;
    is_closed: boolean;
    closed_label: string;
    created_label: string;
    changed_label: string;
    moved_recently: boolean;
    moved_label: string;
  } | null;
  comentarios: {
    id: number;
    contenido: string;
    creado_en: string;
    operateur: { id: number; nom: string; avatar_url?: string | null } | null;
  }[];
  historial: {
    id: number;
    estado_anterior: string | null;
    estado_nuevo: string;
    ref_bitrix: string | null;
    cambiado_en: string;
    operateur: { id: number; nom: string } | null;
  }[];
}

export interface IncidentListResponse {
  ok: boolean;
  items: IncidentListItem[];
  page: number;
  pages: number;
  per_page: number;
  total: number;
  counts: { corporativo: number; particular: number };
  filters: Record<string, string>;
  meta: {
    operateurs: { id: number; nom: string }[];
    ciudades: { id: number; nombre: string }[];
    agencias: { id: number; nombre: string; id_ciudad: number }[];
    bitrix_status_choices: { code: string; emoji: string; label: string }[];
    bitrix_api_enabled: boolean;
  };
}

export interface BitrixInfoResponse {
  ok: boolean;
  error?: string;
  cached?: boolean;
  data?: {
    status_label: string;
    status_emoji: string;
    responsible_name: string;
    task_status: string;
  };
}

export function bitrixTaskUrl(ref: string): string {
  return `https://conexxia.bitrix24.es/company/personal/user/7/tasks/task/view/${ref}/`;
}

const BITRIX_NETWORK_MARKERS = [
  "name resolution",
  "getaddrinfo",
  "errno -3",
  "errno -2",
  "no se puede contactar con bitrix24",
  "bitrix24_api",
  "tiempo de espera agotado",
  "conexión de red",
];

export function isBitrixNetworkError(message: string): boolean {
  const msg = message.toLowerCase();
  return BITRIX_NETWORK_MARKERS.some((marker) => msg.includes(marker));
}

export interface MovementClient {
  id: number;
  nom: string;
  telephone: string;
  ville: string;
  adresse: string;
  id_ciudad: number | null;
  categoria: string;
  ip_router: string | null;
  ip_antea: string | null;
}

export const STATUS_OPTIONS = [
  { value: "Pendiente", label: "Pendiente" },
  { value: "Solucionadas", label: "Solucionadas" },
  { value: "Bitrix", label: "Bitrix" },
] as const;

export function statusBadgeClass(status: string): string {
  if (status === "Solucionadas") {
    return "badge badge-resolut";
  }
  if (status === "Bitrix") {
    return "badge bg-info";
  }
  return "badge badge-attente";
}

export function formatIncidentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
