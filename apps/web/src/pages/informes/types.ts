export interface InformeType {
  id: string;
  nom: string;
  description: string;
  icon: string;
  kpi: string;
}

export interface InformeListItem {
  id: number;
  titre: string;
  type_etat: string;
  type_label: string;
  statut: string;
  periode_debut: string | null;
  periode_fin: string | null;
  periode_label: string;
  date_creation: string;
}

export interface InformeDetail extends InformeListItem {
  contenu: Record<string, unknown> | null;
  parametres: Record<string, unknown>;
  date_modification: string;
  utilisateur: string | null;
}

export const STATUT_BADGE: Record<string, string> = {
  generated: "bg-success",
  generating: "bg-warning text-dark",
  error: "bg-danger",
};

export const STATUT_LABEL: Record<string, string> = {
  generated: "Generado",
  generating: "En progreso...",
  error: "Error",
};

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${h}:${m}`;
}
