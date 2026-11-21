"use client";

import type { Cartridge } from "@press-hire/cartridge";
import Game from "./game/Game";

/** Point d'entrée d'une cartouche : écran titre, niveaux, boss, fin. */
export default function GameShell({ c, track = true, badge = true }: { c: Cartridge; track?: boolean; badge?: boolean }) {
  return <Game c={c} track={track && c.tracking.enabled} badge={badge} />;
}
