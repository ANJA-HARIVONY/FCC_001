/**
 * Reprise des scénarios Flask (salidas, instalaciones) et parcours métier
 * sur l'API de la copie. NODE_URL défaut http://127.0.0.1:4001.
 */
const nodeBase = process.env.NODE_URL ?? "http://127.0.0.1:4001";
const password = process.env.PARITE_PASSWORD ?? "parite-9";
const failures = [];

class Jar {
  constructor() {
    this.cookies = new Map();
  }

  store(response) {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const pair = line.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq > 0) this.cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }

  header() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }

  async fetch(url, options = {}) {
    const headers = new Headers(options.headers);
    const cookie = this.header();
    if (cookie) headers.set("cookie", cookie);
    const response = await fetch(url, { ...options, headers });
    this.store(response);
    return response;
  }
}

async function login(email) {
  const jar = new Jar();
  const csrf = await jar.fetch(`${nodeBase}/api/auth/csrf`);
  const token = (await csrf.json()).token;
  const posted = await jar.fetch(`${nodeBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrftoken": token },
    body: JSON.stringify({ identifiant: email, password }),
  });
  const result = await posted.json();
  if (!result.ok) throw new Error(result.error ?? "login");
  jar.token = token;
  return jar;
}

async function send(jar, path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof URLSearchParams)) {
    headers.set("content-type", "application/json");
  }
  if (options.method && options.method !== "GET") headers.set("x-csrftoken", jar.token);
  const response = await jar.fetch(`${nodeBase}${path}`, { ...options, headers });
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("json")) {
    const body = await response.json();
    return { status: response.status, body, type };
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { status: response.status, buffer, type };
}

function expect(label, condition, detail) {
  if (!condition) {
    failures.push(`${label} : ${detail}`);
    console.log(`ÉCART ${label} : ${detail}`);
    return;
  }
  console.log(`OK    ${label}`);
}

const admin = await login("parite.admin@example.test");
const usuario = await login("parite.usuario@example.test");

const page = await send(admin, "/api/materiales/salidas?per_page=abc");
expect("per_page invalide retombe sur 50", page.body?.per_page === 50, JSON.stringify(page.body?.per_page));

const denied = await send(usuario, "/api/materiales/salidas/1", { method: "DELETE" });
expect("usuario ne supprime pas une salida", denied.status === 403, String(denied.status));

const created = await send(admin, "/api/materiales/salidas", {
  method: "POST",
  body: JSON.stringify({
    fecha: "2026-10-21",
    id_tecnico: 2,
    tipo_salida: "uso_interno",
    lineas: [{ id_material: 1, cantidad: 1 }],
  }),
});
const salidaId = created.body?.item?.id;
expect("admin crée une salida uso_interno", created.status === 200 && salidaId, JSON.stringify(created.body));
if (salidaId) {
  const removed = await send(admin, `/api/materiales/salidas/${salidaId}`, { method: "DELETE" });
  expect("admin supprime cette salida", removed.status === 200, String(removed.status));
}

const sansInst = await send(admin, "/api/materiales/salidas", {
  method: "POST",
  body: JSON.stringify({
    fecha: "2026-10-21",
    id_tecnico: 2,
    tipo_salida: "instalacion",
    id_client: 1,
    lineas: [{ id_material: 1, cantidad: 1 }],
  }),
});
expect("salida instalacion sans installation refusée", sansInst.status === 400, String(sansInst.status));

const autreClient = await send(admin, "/api/materiales/salidas", {
  method: "POST",
  body: JSON.stringify({
    fecha: "2026-10-21",
    id_tecnico: 2,
    tipo_salida: "instalacion",
    id_instalacion: 1,
    id_client: 2,
    lineas: [{ id_material: 1, cantidad: 1 }],
  }),
});
expect("salida instalacion refuse un autre client", autreClient.status === 400, String(autreClient.status));

const inst = await send(admin, "/api/instalaciones", {
  method: "POST",
  body: JSON.stringify({
    fecha: "2026-10-21",
    id_tecnico: 2,
    id_client: 1,
    lineas: [
      { id_material: 1, cantidad: 2 },
      { id_material: 2, cantidad: 1 },
    ],
  }),
});
const instId = inst.body?.item?.id;
const lineCount = (inst.body?.item?.salidas ?? []).reduce((sum, salida) => sum + (salida.lineas?.length ?? 0), 0);
expect(
  "installation avec deux lignes crée une salida liée",
  inst.status === 200 && inst.body?.item?.tipo === "nueva" && lineCount === 2,
  JSON.stringify({ status: inst.status, tipo: inst.body?.item?.tipo, lineCount, error: inst.body?.error }),
);

if (instId) {
  const done = await send(admin, `/api/instalaciones/${instId}/terminar`, { method: "POST" });
  expect("terminar", done.body?.item?.estado === "terminada", JSON.stringify(done.body?.error ?? done.body?.item?.estado));
  const opened = await send(admin, `/api/instalaciones/${instId}/reabrir`, { method: "POST" });
  expect("reabrir admin", opened.body?.item?.estado === "en_curso", JSON.stringify(opened.body?.error ?? opened.status));
  const userReopen = await send(usuario, `/api/instalaciones/${instId}/reabrir`, { method: "POST" });
  expect("reabrir refusé au usuario", userReopen.status === 403, String(userReopen.status));
  const drop = await send(admin, `/api/instalaciones/${instId}`, { method: "DELETE" });
  expect("eliminar nueva", drop.status === 200, String(drop.status));
}

const traslado = await send(admin, "/api/instalaciones/2", { method: "DELETE" });
expect("traslado non supprimable", traslado.status === 400, String(traslado.status));

const incident = await send(usuario, "/api/incidents", {
  method: "POST",
  body: JSON.stringify({
    id_client: 1,
    intitule: "Prueba paridad",
    status: "Pendiente",
    observations: "Creada en el recorrido",
  }),
});
const incidentId = incident.body?.item?.id ?? incident.body?.id;
expect("usuario crée une incidencia", incident.status === 200 && incidentId, JSON.stringify(incident.body?.error ?? incident.status));
if (incidentId) {
  const comment = await send(admin, `/api/incidents/${incidentId}/comentarios`, {
    method: "POST",
    body: JSON.stringify({ contenido: "Comentario de paridad" }),
  });
  expect("admin commente", comment.status === 200, JSON.stringify(comment.body?.error ?? comment.status));
}

const move = await send(admin, "/api/instalaciones/clientes/1/traslado", {
  method: "POST",
  body: JSON.stringify({
    fecha: "2026-10-21",
    id_tecnico: 2,
    adresse: "Calle Nueva 9",
    ville: "Malabo",
    lineas: [{ id_material: 3, cantidad: 1, accion: "reutilizado" }],
  }),
});
expect("traslado ferme le sitio et crée une installation", move.status === 200 && move.body?.item?.tipo === "traslado", JSON.stringify(move.body?.error ?? move.body?.item?.tipo));

const report = await send(usuario, "/api/informes", {
  method: "POST",
  body: JSON.stringify({ type_etat: "summary", periode: "current_month", titre: "Informe sin Gemini" }),
});
const reportId = report.body?.item?.id;
const localText = JSON.stringify(report.body?.item?.contenu ?? "");
expect(
  "informe sans clé reste en espagnol",
  report.status === 200 && report.body?.item?.statut === "generated" && /incidente|Período/.test(localText),
  JSON.stringify({ status: report.status, statut: report.body?.item?.statut, error: report.body?.error }),
);
if (reportId) {
  const xlsx = await send(usuario, `/api/informes/${reportId}/export.xlsx`);
  const zip = xlsx.buffer?.[0] === 0x50 && xlsx.buffer?.[1] === 0x4b;
  expect("excel d'un informe generated", xlsx.status === 200 && zip, `${xlsx.status} ${xlsx.type}`);
}

const clientsXlsx = await send(usuario, "/api/clients/export.xlsx");
const clientsZip = clientsXlsx.buffer?.[0] === 0x50 && clientsXlsx.buffer?.[1] === 0x4b;
expect("excel de la page clients", clientsXlsx.status === 200 && clientsZip, `${clientsXlsx.status} ${clientsXlsx.type}`);

const anon = await fetch(`${nodeBase}/api/clients`);
expect("session absente refusée", anon.status === 401, String(anon.status));

if (failures.length) {
  console.log(`\n${failures.length} écart(s)`);
  process.exit(1);
}
console.log("\nParcours et oracle tenus.");
