import { describe, expect, it } from "vitest";
import { SCENES, SKINS, glyph, internalSize, textWidth } from "../src";
import { Scene } from "@press-hire/cartridge";

describe("moteur d'écran titre", () => {
  it("chaque décor du format de cartouche a un rendu", () => {
    for (const s of Scene.options) expect(SCENES[s], s).toBeDefined();
  });
  it("taille interne : ~150 px de haut en paysage, ~112 px de large en portrait", () => {
    expect(internalSize(1280, 720)).toEqual({ W: 267, H: 150 });
    expect(internalSize(390, 844).W).toBe(112);
  });
  it("la police 3×5 couvre lettres accentuées et chiffres", () => {
    for (const ch of "ÉÀÇ0123456789€%") expect(glyph(ch)).toHaveLength(15);
    expect(textWidth("ABC")).toBe(11);
  });
  it("9 habillages, dont 2 qui imposent leur palette", () => {
    expect(Object.keys(SKINS)).toHaveLength(9);
    expect(Object.values(SKINS).filter((s) => s.ownPalette)).toHaveLength(2);
  });
});
