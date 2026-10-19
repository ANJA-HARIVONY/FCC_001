import { DEFAULT_LIST_PER_PAGE, LIST_PER_PAGE_CHOICES } from "./literals.ts";

/** Aligné sur `clamp_list_per_page` : 50, 100, 200, 500. Défaut 50. */
export function clampListPerPage(value: unknown, fallback = DEFAULT_LIST_PER_PAGE): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if ((LIST_PER_PAGE_CHOICES as readonly number[]).includes(parsed)) {
    return parsed;
  }
  return fallback;
}
