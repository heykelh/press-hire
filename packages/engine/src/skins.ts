import type { ImageFilter } from "./title/render";

export type SkinId = "arcade" | "famicom" | "gameboy" | "terminal" | "synth" | "corporate" | "comic";

/**
 * Un habillage change tout ce qui n'est pas le décor : police, logo, invite,
 * cadres, et pour certains le rendu de l'image entière.
 * Le style visuel vit dans le CSS de l'app (classe .skin-<id>).
 */
export interface SkinDef {
  id: SkinId;
  label: string;
  filter: ImageFilter;
  /** l'habillage impose sa palette (Game Boy, terminal) */
  ownPalette: boolean;
  prompt: { fr: string; en: string };
  /** pour l'agent : quand choisir cet habillage */
  fits: string;
}

export const SKINS: Record<SkinId, SkinDef> = {
  arcade: {
    id: "arcade", label: "Borne d'arcade", filter: "none", ownPalette: false,
    prompt: { fr: "INSÉREZ UNE PIÈCE", en: "INSERT COIN" },
    fits: "grand public, divertissement, jeu, retail",
  },
  famicom: {
    id: "famicom", label: "Boîte de jeu 8-bit", filter: "none", ownPalette: false,
    prompt: { fr: "APPUYEZ SUR START", en: "PUSH START BUTTON" },
    fits: "transport, industrie, énergie, marques populaires",
  },
  gameboy: {
    id: "gameboy", label: "Console portable", filter: "gameboy", ownPalette: true,
    prompt: { fr: "PRESS START", en: "PRESS START" },
    fits: "startups, produit, mobile, équipes tech détendues",
  },
  terminal: {
    id: "terminal", label: "Terminal vert", filter: "phosphor", ownPalette: true,
    prompt: { fr: "> appuyez sur une touche_", en: "> press any key_" },
    fits: "finance, cybersécurité, data engineering, infra",
  },
  synth: {
    id: "synth", label: "Néon synthwave", filter: "none", ownPalette: false,
    prompt: { fr: "★ JOUER ★", en: "★ PLAY ★" },
    fits: "IA, cloud, médias, innovation, scale-ups",
  },
  corporate: {
    id: "corporate", label: "Pixel corporate", filter: "none", ownPalette: false,
    prompt: { fr: "Commencer ▸", en: "Start ▸" },
    fits: "banques, assurance, conseil, secteur public, santé (ton formel)",
  },
  comic: {
    id: "comic", label: "Bande dessinée", filter: "none", ownPalette: false,
    prompt: { fr: "À TOI DE JOUER !", en: "YOUR TURN!" },
    fits: "logistique, retail, agences, ton très décontracté",
  },
};
