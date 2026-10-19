export function ForbiddenPage() {
  return (
    <div className="container-fluid px-0">
      <div className="card shadow-sm border-0 content-card">
        <div className="card-body text-center py-5">
          <h1 className="h4">403</h1>
          <p className="mb-0 text-muted">No tiene permiso para ver esta página.</p>
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <main className="container py-5 text-center">
      <h1 className="h4">404</h1>
      <p className="text-muted">Página no encontrada.</p>
    </main>
  );
}

export function ServerErrorPage() {
  return (
    <main className="container py-5 text-center">
      <h1 className="h4">500</h1>
      <p className="text-muted">Se ha producido un error. Vuelva a intentarlo.</p>
    </main>
  );
}
