import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSafeIpv4, parsePingOutput } from "../src/clientes/ping.ts";
import { coercePayload, daysRemaining, normalizeUserdata, radiusEnabled, safeIpv4 } from "../src/clientes/radius-read.ts";

describe("ping de la fiche", () => {
  it("refuse une adresse qui n'est pas une IPv4", () => {
    assert.equal(isSafeIpv4("10.0.0.1"), true);
    assert.equal(isSafeIpv4("10.0.0.1;id"), false);
    assert.equal(isSafeIpv4("10.0.0.1 && ls"), false);
    assert.equal(isSafeIpv4(""), false);
  });

  it("lit les paquets reçus du ping Unix", () => {
    const output = "10 packets transmitted, 8 received, 20% packet loss, time 9012ms\nrtt min/avg/max/mdev = 1.2/3.4/5.6/0.1 ms";
    const result = parsePingOutput(output, "10.0.0.1", 10, false);
    assert.equal(result.packets_received, 8);
    assert.equal(result.packets_lost, 2);
    assert.equal(result.success, true);
    assert.equal(result.min_time, 1.2);
    assert.equal(result.avg_time, 3.4);
    assert.equal(result.max_time, 5.6);
  });
});

describe("lecture RADIUS", () => {
  it("n'est actif que si le drapeau ou les deux identifiants sont présents", () => {
    assert.equal(radiusEnabled({ RADIUS_ENABLED: "off", RADIUS_API_USER: "a", RADIUS_API_PASS: "b" }), false);
    assert.equal(radiusEnabled({ RADIUS_ENABLED: "on" }), true);
    assert.equal(radiusEnabled({ RADIUS_API_USER: "a", RADIUS_API_PASS: "b" }), true);
    assert.equal(radiusEnabled({}), false);
  });

  it("normalise un tableau positionnel SysAPI", () => {
    const fields = new Array(48).fill("");
    fields[0] = 0;
    fields[1] = "1";
    fields[19] = "014000 YOSYP";
    fields[47] = "2026-12-31 00:00:00";
    const data = coercePayload(fields);
    assert.ok(data);
    const normalized = normalizeUserdata(data, "014000", new Date(2026, 9, 20));
    assert.equal(normalized.account_status, "enabled");
    assert.equal(normalized.firstname, "014000 YOSYP");
    assert.equal(normalized.expiry, "31/12/2026");
    assert.equal(daysRemaining("31/12/2026", new Date(2026, 9, 20)), 72);
  });

  it("reconnaît le succès DMA Softlab {0, 1, expiry}", () => {
    const data = coercePayload({
      0: 0,
      1: {
        enableuser: "1",
        srvid: "40",
        firstname: "014000 YOSYP",
        staticipcpe: "10.1.2.3",
      },
      expiry: "2026-12-31 00:00:00",
      simuse: "0",
      2: { nasipaddress: "10.0.0.1", cpeipaddress: "10.9.8.7" },
    });
    assert.ok(data);
    assert.equal(Number(data.code), 0);
    assert.equal(data.expiry, "2026-12-31 00:00:00");
    assert.equal(data.firstname, "014000 YOSYP");
    const sessions = data.sessions as { cpeipaddress: string }[];
    assert.equal(sessions[0]?.cpeipaddress, "10.9.8.7");
    const normalized = normalizeUserdata(data, "014000", new Date(2026, 9, 20));
    assert.equal(normalized.account_status, "enabled");
    assert.equal(normalized.expiry, "31/12/2026");
    assert.equal(normalized.cpeipaddress, "10.1.2.3");
    assert.equal(normalized.online, true);
  });

  it("laisse une erreur courte [code, message] inchangée", () => {
    const data = coercePayload([1, "User not found!"]);
    assert.deepEqual(data, { code: 1, str: "User not found!" });
  });

  it("n'aligne le routeur que sur une IPv4", () => {
    assert.equal(safeIpv4("10.1.2.3"), "10.1.2.3");
    assert.equal(safeIpv4("pas-une-ip"), null);
  });
});
