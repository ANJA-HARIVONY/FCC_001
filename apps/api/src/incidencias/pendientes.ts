/** Incidencias Pendiente de más de 30 minutos, misma visibilidad que la lista. */

import { incidentVisible, type Actor } from "@fcc/domain";

export interface PendienteSource {
  id: number;
  intitule: string;
  date_heure: Date;
  client_nom: string;
  client_ville: string;
  operateur_nom: string;
  creatorAgenciaId: number;
  clientCiudadId: number | null;
}

export function pendienteCutoff(now: Date): Date {
  return new Date(now.getTime() - 30 * 60 * 1000);
}

export function formatPendiente(row: PendienteSource, now: Date) {
  const elapsed = Math.max(0, now.getTime() - row.date_heure.getTime());
  const horas = Math.floor(elapsed / 3_600_000);
  const minutos = Math.floor((elapsed % 3_600_000) / 60_000);
  const fecha = row.date_heure;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    id: row.id,
    intitule: row.intitule,
    client_nom: row.client_nom,
    client_ville: row.client_ville,
    operateur_nom: row.operateur_nom,
    tiempo_transcurrido: `${horas}h ${minutos}m`,
    fecha_creacion: `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`,
  };
}

export function selectPendientes(rows: PendienteSource[], actor: Actor, now: Date) {
  const limite = pendienteCutoff(now);
  return rows
    .filter(
      (row) =>
        row.date_heure.getTime() <= limite.getTime() &&
        incidentVisible(actor, {
          creatorId: 0,
          creatorAgenciaId: row.creatorAgenciaId,
          clientCiudadId: row.clientCiudadId,
        }),
    )
    .map((row) => formatPendiente(row, now));
}
