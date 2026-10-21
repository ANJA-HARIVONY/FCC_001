import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { materialFotoExt, storedMaterialFotoName } from "../src/materiales/material-foto.ts";

describe("foto du catalogue", () => {
  it("n'accepte que jpg, png et webp, et un nom material_id", () => {
    assert.equal(materialFotoExt("image/jpeg", "a.jpeg"), "jpg");
    assert.equal(materialFotoExt("image/png", "a.png"), "png");
    assert.equal(materialFotoExt("image/webp", "a.webp"), "webp");
    assert.equal(materialFotoExt("", "pieza.JPEG"), "jpg");
    assert.equal(materialFotoExt("image/gif", "a.gif"), null);
    assert.equal(storedMaterialFotoName("material_12.png"), "material_12.png");
    assert.equal(storedMaterialFotoName("../material_12.png"), "material_12.png");
    assert.equal(storedMaterialFotoName("autre.png"), null);
    assert.equal(storedMaterialFotoName("material_12.txt"), null);
  });
});