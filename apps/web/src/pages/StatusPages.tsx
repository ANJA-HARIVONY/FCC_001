export function ForbiddenPage() {
  return (
    <main className="container py-5">
      <h1 className="h4">403</h1>
      <p>No tiene permiso para ver esta página.</p>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="container py-5">
      <h1 className="h4">404</h1>
      <p>Página no encontrada.</p>
    </main>
  );
}

export function ServerErrorPage() {
  return (
    <main className="container py-5">
      <h1 className="h4">500</h1>
      <p>Se ha producido un error. Vuelva a intentarlo.</p>
    </main>
  );
}
