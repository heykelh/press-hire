"use client";

import type { Cartridge } from "@press-hire/cartridge";
import Game from "./game/Game";

/** Point d'entrée d'une cartouche : écran titre, niveaux, boss, fin. */
export default function GameShell({ c }: { c: Cartridge }) {
  return <Game c={c} />;
}
