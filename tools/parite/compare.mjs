/**
 * Compare les listes Flask et Node sur la copie fcc_001_parite.
 * FLASK_URL (défaut http://127.0.0.1:8091) et NODE_URL (défaut http://127.0.0.1:4001).
 */
const flaskBase = process.env.FLASK_URL ?? "http://127.0.0.1:8091";
const nodeBase = process.env.NODE_URL ?? "http://127.0.0.1:4001";
const password = process.env.PARITE_PASSWORD ?? "parite-9";

const accounts = {
  superadmin: "parite.super@example.test",
  admin: "parite.admin@example.test",
  usuario: "parite.usuario@example.test",
};

const failures = [];

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function idsFrom(html, pattern) {
  return unique([...html.matchAll(pattern)].map((match) => match[1]));
}

class Jar {
  constructor() {
    this.cookies = new Map();
  }

  store(response) {
    const raw = response.headers.getSetCookie?.() ?? [];
    for (const line of raw) {
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
    const response = await fetch(url, { ...options, headers, redirect: options.redirect ?? "manual" });
    this.store(response);
    return response;
  }
}

async function loginFlask(email) {
  const jar = new Jar();
  const page = await jar.fetch(`${flaskBase}/login`);
  const html = await page.text();
  const token = html.match(/name="csrf_token" value="([^"]+)"/)?.[1];
  if (!token) throw new Error(`CSRF Flask absent pour ${email}`);
  const body = new URLSearchParams({ csrf_token: token, identifiant: email, password });
  const posted = await jar.fetch(`${flaskBase}/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (posted.status >= 400) throw new Error(`Login Flask ${email} → ${posted.status}`);
  return jar;
}

async function loginNode(email) {
  const jar = new Jar();
  const csrf = await jar.fetch(`${nodeBase}/api/auth/csrf`);
  const payload = await csrf.json();
  const posted = await jar.fetch(`${nodeBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrftoken": payload.token },
    body: JSON.stringify({ identifiant: email, password }),
  });
  const result = await posted.json();
  if (!result.ok) throw new Error(`Login Node ${email} → ${result.error ?? posted.status}`);
  return jar;
}

async function flaskPage(jar, path) {
  const response = await jar.fetch(`${flaskBase}${path}`, { redirect: "follow" });
  const html = await response.text();
  return { status: response.status, html };
}

async function nodeJson(jar, path) {
  const response = await jar.fetch(`${nodeBase}${path}`);
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: response.status, body };
}

function check(label, flaskIds, nodeIds) {
  const same = flaskIds.length === nodeIds.length && flaskIds.every((id, index) => id === nodeIds[index]);
  if (!same) {
    failures.push(`${label} : Flask [${flaskIds.join(", ")}] Node [${nodeIds.join(", ")}]`);
    console.log(`ÉCART ${label}`);
    console.log(`  Flask ${flaskIds.join(", ") || "(vide)"}`);
    console.log(`  Node  ${nodeIds.join(", ") || "(vide)"}`);
    return;
  }
  console.log(`OK    ${label} [${flaskIds.join(", ")}]`);
}

function checkStatus(label, flaskStatus, nodeStatus) {
  if (flaskStatus !== nodeStatus) {
    failures.push(`${label} : Flask ${flaskStatus} Node ${nodeStatus}`);
    console.log(`ÉCART ${label} : Flask ${flaskStatus} Node ${nodeStatus}`);
    return;
  }
  console.log(`OK    ${label} ${flaskStatus}`);
}

async function compareRole(role) {
  console.log(`\n# ${role}`);
  const flask = await loginFlask(accounts[role]);
  const node = await loginNode(accounts[role]);

  const clientsHtml = await flaskPage(flask, "/clients");
  const clientsJson = await nodeJson(node, "/api/clients");
  check(
    `${role} clients`,
    idsFrom(clientsHtml.html, /data-export-id="#(\d+)"/g),
    (clientsJson.body.items ?? []).map((row) => String(row.id)),
  );

  const incidentsHtml = await flaskPage(flask, "/incidents");
  const incidentsJson = await nodeJson(node, "/api/incidents");
  check(
    `${role} incidencias`,
    idsFrom(incidentsHtml.html, /class="incident-export-row"[\s\S]*?data-export-id="#(\d+)"/g),
    (incidentsJson.body.items ?? []).map((row) => String(row.id)),
  );

  const salidasHtml = await flaskPage(flask, "/materiales/salidas");
  const salidasJson = await nodeJson(node, "/api/materiales/salidas");
  if (role === "usuario") {
    checkStatus(`${role} salidas`, salidasHtml.status, salidasJson.status);
  } else {
    check(
      `${role} salidas`,
      idsFrom(salidasHtml.html, /data-export-id="#(\d+)"/g),
      (salidasJson.body.items ?? []).map((row) => String(row.id)),
    );
  }

  const instHtml = await flaskPage(flask, "/instalaciones");
  const instJson = await nodeJson(node, "/api/instalaciones");
  if (role === "usuario") {
    checkStatus(`${role} instalaciones`, instHtml.status, instJson.status);
  } else {
    const desktop = instHtml.html.split("d-lg-none")[0] ?? instHtml.html;
    check(
      `${role} instalaciones`,
      idsFrom(desktop, /<strong>#(\d+)<\/strong>/g),
      (instJson.body.items ?? []).map((row) => String(row.id)),
    );
  }

  const catalogHtml = await flaskPage(flask, "/materiales/catalogo");
  const catalogJson = await nodeJson(node, "/api/materiales/catalogo");
  if (role === "usuario") {
    checkStatus(`${role} catálogo`, catalogHtml.status, catalogJson.status);
  } else {
    const known = ["Bobina", "Cable", "Antena", "Router"];
    const flaskNames = known
      .map((name) => ({ name, at: catalogHtml.html.indexOf(`>${name}<`) }))
      .filter((row) => row.at >= 0)
      .sort((a, b) => a.at - b.at)
      .map((row) => row.name);
    check(
      `${role} catálogo`,
      flaskNames,
      (catalogJson.body.items ?? []).map((row) => row.nombre),
    );
  }

  const informesHtml = await flaskPage(flask, "/etats");
  const informesJson = await nodeJson(node, "/api/informes");
  check(
    `${role} informes`,
    idsFrom(informesHtml.html, /\/etats\/(\d+)/g),
    (informesJson.body.items ?? []).map((row) => String(row.id)),
  );
}

for (const role of ["superadmin", "admin", "usuario"]) {
  await compareRole(role);
}

if (failures.length) {
  console.log(`\n${failures.length} écart(s)`);
  process.exit(1);
}
console.log("\nListes identiques pour les trois rôles.");
