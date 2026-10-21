import { isAdmin, isSuperadmin } from "@fcc/domain";
import { useTranslation } from "react-i18next";

import { usePageMeta } from "../layout/Shell";

const SECTIONS = [
  { id: "inicio", title: "Dashboard", level: "all" },
  { id: "incidencias", title: "Incidencias", level: "all" },
  { id: "clientes", title: "Clientes", level: "all" },
  { id: "informes", title: "Informes", level: "all" },
  { id: "materiales", title: "Materiales", level: "admin" },
  { id: "instalaciones", title: "Instalaciones", level: "admin" },
  { id: "usuarios", title: "Usuarios", level: "superadmin" },
  { id: "trazabilidad", title: "Trazabilidad", level: "superadmin" },
  { id: "base-de-datos", title: "Base de datos", level: "superadmin" },
  { id: "cuenta", title: "Cuenta", level: "all" },
] as const;

function visible(role: string, level: (typeof SECTIONS)[number]["level"]): boolean {
  if (level === "admin") {
    return isAdmin(role);
  }
  if (level === "superadmin") {
    return isSuperadmin(role);
  }
  return true;
}

export function AyudaPage({ role }: { role: string }) {
  const { t } = useTranslation();
  usePageMeta({
    title: t("Ayuda"),
    icon: <i className="fas fa-question-circle" aria-hidden="true" />,
    subtitle: t("Centro de ayuda"),
  });
  const sections = SECTIONS.filter((section) => visible(role, section.level));
  const toc = (
    <ul className="list-unstyled mb-0">
      {sections.map((section) => (
        <li key={section.id} className="mb-1">
          <a href={`#${section.id}`}>{t(section.title)}</a>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="container-fluid px-0">
      <div className="row g-3">
        <nav id="aide-toc" className="col-lg-3 d-none d-lg-block" aria-label={t("Sumario")}>
          <div className="card shadow-sm border-0 content-card">
            <div className="card-body">{toc}</div>
          </div>
        </nav>
        <div className="col-lg-9">
          <details id="aide-toc-mobile" className="d-lg-none mb-3 card shadow-sm border-0 content-card">
            <summary className="card-header">{t("Contenido")}</summary>
            <div className="card-body">{toc}</div>
          </details>
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="card shadow-sm border-0 content-card mb-3"
              data-aide-keywords={section.title}
            >
              <div className="card-body">
                <h2 className="h5">{t(section.title)}</h2>
                {section.id === "clientes" ? (
                  <>
                    <p>
                      El listado de <strong>Clientes</strong> es compartido entre agencias. Use los filtros Buscar,
                      barrio, ciudad y categoría; la paginación admite 50, 100, 200 o 500 filas. Las columnas ID,
                      Nombre, Dirección e Incidencias se ordenan. Imprimir y Excel cubren solo la página actual.
                      Copiar información lleva el nombre, el teléfono, la dirección y las IP.
                    </p>
                    <p>
                      <strong>Nuevo Cliente</strong> y <strong>Modificar</strong> actualizan el sitio activo: no se
                      crea un segundo sitio al corregir la dirección. El Traslado (cambio de domicilio) se gestiona
                      desde la ficha del cliente, no desde Instalaciones.
                    </p>
                    <p>
                      La <strong>ficha</strong> muestra el contacto, el historial de incidencias, la impresión,{" "}
                      <strong>Verificar</strong> (ping de la antena y del router) y, si hay Username RADIUS, la
                      información RADIUS en solo lectura. Un admin guarda el GPS y hasta 10 fotos (JPG, PNG o WEBP,
                      5 MB como máximo cada una).
                    </p>
                    <details className="mt-2">
                      <summary>¿Por qué no veo solo los clientes de mi agencia?</summary>
                      <p className="mb-0 mt-2 small text-muted">
                        El referencial de clientes es compartido. Los movimientos (incidencias, salidas, instalaciones)
                        sí están limitados a su ciudad y agencia.
                      </p>
                    </details>
                  </>
                ) : section.id === "incidencias" ? (
                  <>
                    <p>
                      Las <strong>Incidencias</strong> visibles son las de su agencia cuyo cliente está en su ciudad
                      (el superadmin ve todas). Estados: Pendiente, Solucionadas, Bitrix. Con el filtro Bitrix aparece
                      la columna Técnico y el subfiltro Tarea Bitrix.
                    </p>
                    <p>
                      La tabla ordena por Cliente, Asunto, Usuario y Fecha/Hora (y Técnico si el estado es Bitrix).
                      Acciones: Modificar, Copiar información y Eliminar. Imprimir y Excel cubren solo la página
                      actual. La ficha permite copiar, hacer ping al router y a la antena, comentar (1000 caracteres) y,
                      si está Pendiente, marcarla Solucionadas. El estado Bitrix muestra la tarea en lectura. Quien
                      puede ver una incidencia puede modificarla. Eliminar: creador o admin. El creador no cambia al
                      editar. Una incidencia Pendiente de más de 30 minutos muestra un aviso; cada aviso aparece una
                      vez y puede volver al cabo de una hora.
                    </p>
                    <details className="mt-2">
                      <summary>¿Por qué no veo una incidencia de otra agencia?</summary>
                      <p className="mb-0 mt-2 small text-muted">
                        La regla 10.4 limita la lista y la ficha a la agencia del creador y la ciudad del cliente.
                      </p>
                    </details>
                  </>
                ) : section.id === "materiales" ? (
                  <>
                    <p>
                      El hub <strong>Materiales</strong> (admin) incluye Catálogo compartido y Salidas limitadas a su
                      agencia y ciudad. El catálogo ordena por Nombre y Modelo, se edita en la lista y admite una foto
                      JPG, PNG o WEBP (máx. 2 MB). La modale <strong>Nueva salida</strong> solo ofrece Uso interno e
                      Incidencia. El formulario busca técnico y cliente (obligatorio salvo Uso interno) y registra las
                      líneas de material.
                    </p>
                    <p>
                      La lista de salidas permite copiar, imprimir y exportar a Excel solo la página actual. Una salida{" "}
                      <code>instalacion</code> se registra desde Nueva instalación. Al editar una salida, el tipo queda
                      fijo y el estado pasa a <code>modificada</code>. El <strong>Informe de salidas</strong> toma los
                      últimos 30 días, filtra por tipo, técnico y material, muestra 50 líneas por página y exporta
                      todas las líneas filtradas a Excel.
                    </p>
                  </>
                ) : section.id === "instalaciones" ? (
                  <>
                    <p>
                      El hub <strong>Instalaciones</strong> lista instalaciones (nueva / traslado) con filtros y
                      acciones Ver, Modificar, Copiar información y Eliminar. Copiar lleva el cliente, los materiales
                      y el técnico. Eliminar solo aplica a tipo <code>nueva</code>.
                    </p>
                    <p>
                      <strong>Nueva instalación</strong> puede crear la primera salida de material. Desde la ficha,{" "}
                      <strong>Añadir material</strong> abre una salida de tipo instalación con el cliente fijo.{" "}
                      <strong>Traslado</strong> y GPS se gestionan desde la ficha del cliente (admin), no desde este
                      hub.
                    </p>
                  </>
                ) : section.id === "informes" ? (
                  <>
                    <p>
                      Los <strong>Informes</strong> resumen incidencias del período (Estado General, Evolución,
                      Actividad por Usuario, Análisis Personalizado). El hub muestra los 20 más recientes.
                    </p>
                    <p>
                      Un usuario o admin solo ve los informes de su agencia. El superadmin ve todos y puede filtrar
                      por agencia al generar. Con la clave Gemini configurada, el texto lo redacta Gemini en español.
                      Sin clave, o con la IA desactivada, el texto se genera en local. Desde un informe generado se
                      exporta JSON o Excel.
                    </p>
                    <details className="mt-2">
                      <summary>¿Por qué no veo un informe de otra agencia?</summary>
                      <p className="mb-0 mt-2 small text-muted">
                        La visibilidad se basa en el parámetro <code>agence_id</code> guardado al generar el informe.
                      </p>
                    </details>
                  </>
                ) : section.id === "inicio" ? (
                  <p className="mb-0">
                    El <strong>Dashboard</strong> muestra los KPI del período (Registrados, Solucionadas, Pendientes,
                    Bitrix), la evolución por día, mes o año, la distribución por operador, las instalaciones del día
                    y los 5 clientes recurrentes. El superadmin puede filtrar por ciudad y agencia. La nota del día
                    (admin, máximo 120 caracteres, una por día, ciudad y agencia) se edita desde el gráfico.
                  </p>
                ) : section.id === "usuarios" ? (
                  <p className="mb-0">
                    <strong>Usuarios</strong> (superadmin): alta, modificación, avatar, rol, categoría, ciudad, agencia
                    y desactivación. No puede desactivar su propia cuenta. <em>Ficha</em> de Atención al cliente lista
                    los cambios a Bitrix o Solucionadas que superan el umbral (30 min por defecto, mes en curso) y
                    exporta todas las filas filtradas a Excel. <em>Ficha</em> de un técnico lista el material que se
                    le asignó.
                  </p>
                ) : section.id === "base-de-datos" ? (
                  <p className="mb-0">
                    <strong>Base de datos</strong> (superadmin) comprueba la conexión y el recuento de tablas.{" "}
                    <em>Descargar archivo .sql</em> genera <code>backup_YYYYMMDD_HHMMSS.sql</code>, compatible con
                    HeidiSQL.
                  </p>
                ) : section.id === "cuenta" ? (
                  <p className="mb-0">
                    En <strong>Perfil</strong> puede subir un avatar (JPG, PNG o WEBP, máx. 2 MB) y cambiar nombre,
                    teléfono y contraseña (mínimo 6 caracteres, con confirmación). En la cabecera y arriba a la
                    derecha del inicio de sesión, elija ES, FR o EN.
                  </p>
                ) : (
                  <p className="mb-0 text-muted">
                    Pantalla prevista en la nueva aplicación. El detalle operativo sigue el de la aplicación actual.
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
