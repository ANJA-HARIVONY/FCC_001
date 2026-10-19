export function Footer() {
  return (
    <footer className="app-footer" role="contentinfo">
      <div
        className="app-footer__inner"
        style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}
      >
        <p className="app-footer__copy mb-1">
          &copy; 2026 CONNEXIA - Registro de Atención al cliente - Reservados todos los derechos
        </p>
        <p className="app-footer__meta mb-0">
          Teléfono: 222 304 981 · Email: anjaharivoni@gmail.com | jefe.incidencias@conexxiaeg.com
        </p>
        <p className="app-footer__version mb-0">Versión 2.0.0</p>
      </div>
    </footer>
  );
}
