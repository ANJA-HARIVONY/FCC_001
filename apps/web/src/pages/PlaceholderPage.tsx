import { usePageMeta } from "../layout/Shell";

export function PlaceholderPage({ title, icon }: { title: string; icon: string }) {
  usePageMeta({
    title,
    icon: <i className={icon} aria-hidden="true" />,
    subtitle: "Pantalla en migración a la nueva aplicación.",
  });
  return (
    <div className="container-fluid px-0">
      <div className="card shadow-sm border-0 content-card">
        <div className="card-body text-center py-5 text-muted">
          <i className={`${icon} fa-3x mb-3`} aria-hidden="true" />
          <p className="mb-0">Esta pantalla se conectará en una fase siguiente.</p>
        </div>
      </div>
    </div>
  );
}
