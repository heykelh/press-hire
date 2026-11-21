import type { Painter } from "../pixel/painter";
import type { TimeOfDay, Tone } from "./palettes";

export type Weather = "clear" | "rain" | "snow" | "fog";

export interface ActorCfg {
  type: string;
  speed: number;
  lane: number;
  color?: string;
}

/** Tout ce qu'un décor ou un acteur sait du monde où il est dessiné. */
export interface SceneCtx {
  W: number;
  H: number;
  /** ligne d'horizon / sol (y) */
  ground: number;
  time: TimeOfDay;
  tone: Tone;
  /** couleurs de la cartouche (marque évoquée, jamais copiée) */
  colors: string[];
  accent: string;
  seed: number;
  detail?: { label: string; value: string };
  /** décor intérieur : pas de ciel, pas de météo */
  indoor: boolean;
}

export interface SceneDef {
  /** proportion de hauteur où se trouve le sol (0..1) */
  groundRatio: number;
  indoor?: boolean;
  /** couche fixe, dessinée une fois par taille d'écran */
  still(p: Painter, s: SceneCtx): void;
  /** animations propres au décor, à chaque image */
  live(p: Painter, s: SceneCtx, t: number): void;
}
