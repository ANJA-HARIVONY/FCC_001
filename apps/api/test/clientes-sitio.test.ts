import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Règle métier : une correction d'adresse met à jour le sitio actif,
 * sans en créer un second. Création client → un sitio activo.
 */
function applyAddressUpdate(
  sitios: { id: number; activo: boolean; adresse: string; ville: string }[],
  adresse: string,
  ville: string,
) {
  const actifs = sitios.filter((row) => row.activo);
  assert.equal(actifs.length <= 1, true);
  if (actifs.length === 1) {
    return sitios.map((row) => (row.id === actifs[0]!.id ? { ...row, adresse, ville } : row));
  }
  return [...sitios, { id: sitios.length + 1, activo: true, adresse, ville }];
}

describe("sitio actif", () => {
  it("la modification d'adresse ne crée pas de second sitio actif", () => {
    const before = [{ id: 1, activo: true, adresse: "Calle 1", ville: "Centro" }];
    const after = applyAddressUpdate(before, "Calle 2", "Norte");
    assert.equal(after.filter((row) => row.activo).length, 1);
    assert.equal(after[0]?.adresse, "Calle 2");
    assert.equal(after.length, 1);
  });

  it("sans sitio, on en crée un seul actif", () => {
    const after = applyAddressUpdate([], "Calle 3", "Sur");
    assert.equal(after.length, 1);
    assert.equal(after[0]?.activo, true);
  });
});
