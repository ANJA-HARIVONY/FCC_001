/** Plages de dates pour les périodes prédéfinies (parité `_get_date_range_for_period`). */

/** Bornes Flask `get_date_range_for_period`. `now` sert aux tests. */
export function getDateRangeForPeriod(
  period: string,
  now: Date = new Date(),
): { debut: Date | null; fin: Date | null } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  if (period === "current_month") {
    return { debut: dateOnly(new Date(y, m, 1)), fin: null };
  }
  if (period === "current_week") {
    const daysSinceMonday = (now.getDay() + 6) % 7;
    const weekStart = new Date(y, m, d - daysSinceMonday);
    const monthStart = new Date(y, m, 1);
    const start = weekStart.getTime() > monthStart.getTime() ? weekStart : monthStart;
    return { debut: dateOnly(start), fin: null };
  }
  if (period === "last_week") {
    const daysSinceMonday = (now.getDay() + 6) % 7;
    const currentWeekStart = new Date(y, m, d - daysSinceMonday);
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(currentWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    return { debut: dateOnly(lastWeekStart), fin: dateOnly(lastWeekEnd) };
  }
  if (period === "last_month") {
    const start = m === 0 ? new Date(y - 1, 11, 1) : new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { debut: dateOnly(start), fin: dateOnly(end) };
  }
  if (period === "last_3_months") {
    return { debut: daysBefore(now, 90), fin: null };
  }
  if (period === "last_6_months") {
    return { debut: daysBefore(now, 180), fin: null };
  }
  if (period === "current_year") {
    return { debut: dateOnly(new Date(y, 0, 1)), fin: null };
  }
  if (period === "all_data") {
    return { debut: null, fin: null };
  }
  return { debut: daysBefore(now, 90), fin: null };
}

function daysBefore(now: Date, days: number): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - days);
  return dateOnly(start);
}

export function parseIsoDate(value: string | undefined | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [yy, mm, dd] = value.split("-").map(Number);
  return dateOnly(new Date(yy, mm - 1, dd));
}

export function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatEsDate(d: Date | null | undefined): string {
  if (!d) {
    return "";
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
