import { iterPages } from "@fcc/domain";

export function pageCount(total: number, perPage: number): number {
  if (total <= 0 || perPage <= 0) {
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
  noun,
  onPage,
  variant = "numbers",
  align = "center",
  label = "Paginación",
}: {
  page: number;
  perPage: number;
  total: number;
  noun?: string;
  onPage: (page: number) => void;
  variant?: "numbers" | "compact";
  align?: "center" | "end";
  label?: string;
}) {
  const pages = pageCount(total, perPage);
  if (pages <= 1) {
    return null;
  }
  const justify = align === "end" ? "justify-content-end" : "justify-content-center";
  return (
    <>
      <nav aria-label={label}>
        <ul className={`pagination${variant === "compact" ? " pagination-sm" : ""} ${justify} mb-0`}>
          <PageStep
            label="Anterior"
            icon={variant === "numbers" ? "left" : undefined}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          />
          {variant === "numbers" ? (
            iterPages(page, pages).map((token, index) =>
              token == null ? (
                <li key={`gap-${index}`} className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              ) : (
                <li key={token} className={`page-item${token === page ? " active" : ""}`}>
                  {token === page ? (
                    <span className="page-link" aria-current="page">
                      {token}
                    </span>
                  ) : (
                    <button type="button" className="page-link" onClick={() => onPage(token)}>
                      {token}
                    </button>
                  )}
                </li>
              ),
            )
          ) : (
            <li className="page-item disabled">
              <span className="page-link">
                {page} / {pages}
              </span>
            </li>
          )}
          <PageStep
            label="Siguiente"
            icon={variant === "numbers" ? "right" : undefined}
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          />
        </ul>
      </nav>
      {variant === "numbers" ? (
        <div className="text-center mt-3">
          <small className="text-muted">
            Mostrando {pageRange(page, perPage, total).from} a {pageRange(page, perPage, total).to} de {total}
            {noun ? ` ${noun}` : ""}
          </small>
        </div>
      ) : null}
    </>
  );
}

function PageStep({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon?: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const chevron = icon ? <i className={`fas fa-chevron-${icon}`} aria-hidden="true" /> : null;
  const content =
    icon === "left" ? (
      <>
        {chevron} {label}
      </>
    ) : icon === "right" ? (
      <>
        {label} {chevron}
      </>
    ) : (
      label
    );
  return (
    <li className={`page-item${disabled ? " disabled" : ""}`}>
      {disabled ? (
        <span className="page-link">{content}</span>
      ) : (
        <button type="button" className="page-link" onClick={onClick}>
          {content}
        </button>
      )}
    </li>
  );
}
