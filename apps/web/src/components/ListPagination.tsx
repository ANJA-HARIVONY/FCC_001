import { LIST_PER_PAGE_CHOICES, clampListPerPage } from "@fcc/domain";

export function pageCount(total: number, perPage: number): number {
  if (total <= 0) {
    return 1;
  }
  return Math.ceil(total / perPage);
}

export function pageRange(page: number, perPage: number, total: number): { from: number; to: number } {
  if (total <= 0) {
    return { from: 0, to: 0 };
  }
  const from = (page - 1) * perPage + 1;
  return { from, to: Math.min(total, page * perPage) };
}

export function ListPagination({
  page,
  perPage,
  total,
  onPage,
  onPerPage,
}: {
  page: number;
  perPage: number;
  total: number;
  onPage: (page: number) => void;
  onPerPage: (perPage: number) => void;
}) {
  const safePerPage = clampListPerPage(perPage);
  const pages = pageCount(total, safePerPage);
  const { from, to } = pageRange(page, safePerPage, total);
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
      <span>
        Mostrando {from} a {to} de {total}
      </span>
      <div className="d-flex align-items-center gap-2">
        <label className="small mb-0" htmlFor="per-page">
          Por página
        </label>
        <select
          id="per-page"
          className="form-select form-select-sm"
          value={safePerPage}
          onChange={(event) => onPerPage(clampListPerPage(event.target.value))}
        >
          {LIST_PER_PAGE_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </button>
        <span>
          Página {page} de {pages}
        </span>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
