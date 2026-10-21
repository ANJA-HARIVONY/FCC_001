import { DEFAULT_LIST_PER_PAGE, LIST_PER_PAGE_CHOICES } from "./literals.ts";

/** Aligné sur `clamp_list_per_page` : 50, 100, 200, 500. Défaut 50. */
export function clampListPerPage(value: unknown, fallback = DEFAULT_LIST_PER_PAGE): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if ((LIST_PER_PAGE_CHOICES as readonly number[]).includes(parsed)) {
    return parsed;
  }
  return fallback;
}

/**
 * Même fenêtre que Flask-SQLAlchemy
 * `iter_pages(left_edge=1, right_edge=1, left_current=1, right_current=2)`.
 * `null` est le trou « … ».
 */
export function iterPages(page: number, pages: number): Array<number | null> {
  if (pages < 1) {
    return [];
  }
  const current = Math.min(Math.max(1, page), pages);
  const tokens: Array<number | null> = [];
  let last = 0;
  for (let num = 1; num <= pages; num += 1) {
    const near = num > current - 2 && num < current + 2;
    if (num <= 1 || near || num > pages - 1) {
      if (last + 1 !== num) {
        tokens.push(null);
      }
      tokens.push(num);
      last = num;
    }
  }
  return tokens;
}
