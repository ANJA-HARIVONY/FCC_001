import { describe, expect, it } from "vitest";

import { instalacionCopyText } from "./copy";

describe("copiar instalación", () => {
  it("omite la línea de materiales cuando está vacía", () => {
    expect(instalacionCopyText("Ana", [], "Luis")).toBe("Ana\nLuis");
  });

  it("pone cada material en su línea, entre el cliente y el técnico", () => {
    expect(instalacionCopyText("Ana", ["Router x1"], "Luis")).toBe("Ana\nRouter x1\nLuis");
  });
});
