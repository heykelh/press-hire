"use client";

import type { Cartridge, Condition, Level } from "@press-hire/cartridge";
import { Icon } from "./arcade";
import { howTo } from "./howto";
import type { Ctx } from "./ui";

const ICON_OF: Record<string, string> = {
  wheel: "star", slider: "chart", triage: "file", quiz: "key", dialogue: "heart",
  catch: "box", whack: "warning", gauge: "bolt", sequence: "clock", inspection: "shield", investigation: "chart",
};

/** « Disponibilité ≥ 96 », « Score +15 pendant ce niveau ». */
export function goalText(c: Cartridge, g: Condition, lang: "fr" | "en"): string {
  const v = c.state.vars.find((x) => x.id === g.var);
  const label = v ? v.label[lang] : g.var;
  const op = g.op === ">=" ? "≥" : g.op === "<=" ? "≤" : g.op;
  const unit = v?.unit ? ` ${v.unit}` : "";
  if (g.scope === "level") {
    const up = g.op === ">=" || g.op === ">";
    return lang === "fr"
      ? `${label} : ${up ? "+" : ""}${g.value}${unit} ${up ? "au moins" : "au plus"} pendant ce niveau`
      : `${label}: ${up ? "+" : ""}${g.value}${unit} ${up ? "at least" : "at most"} during this level`;
  }
  return `${label} ${op} ${g.value}${unit}`;
}

/** Fiche « comment jouer » d'un niveau. */
export function HowToCard({ ctx, level, compact = false }: { ctx: Ctx; level: Level; compact?: boolean }) {
  const h = howTo(level.mechanic);
  const fr = ctx.lang === "fr";
  return (
    <div className={`g-howto${compact ? " compact" : ""}`}>
      <p className="g-howto-head">
        <Icon name={ICON_OF[level.mechanic.type] ?? "star"} size={24} /> {fr ? "COMMENT JOUER" : "HOW TO PLAY"} · {ctx.t(h.name)}
        {h.retro && <small> — {ctx.t(h.retro)}</small>}
      </p>
      <p>{ctx.t(h.goal)}</p>
      <p className="g-howto-goal">🎯 <b>{fr ? "Pour gagner" : "To win"}</b> : {level.win.map((w) => goalText(ctx.c, w, ctx.lang)).join(fr ? " et " : " and ")}</p>
      <p className="g-howto-keys">⌨ {ctx.t(h.controls)}</p>
      {h.metric && <p className="g-howto-metric">📊 {ctx.t(h.metric)}</p>}
      {level.howTo && <p className="g-howto-tip">💡 {ctx.t(level.howTo)}</p>}
    </div>
  );
}

/** Tutoriel général, depuis l'écran titre. */
export function TutorialOverlay({ ctx, levels, onClose }: { ctx: Ctx; levels: Level[]; onClose: () => void }) {
  const fr = ctx.lang === "fr";
  return (
    <div className="g-overlay" role="dialog" aria-modal="true" aria-label={fr ? "Comment jouer" : "How to play"} onClick={onClose}>
      <div className="g-panel g-tuto" onClick={(e) => e.stopPropagation()}>
        <h2 className="g-level-title">{fr ? "COMMENT JOUER" : "HOW TO PLAY"}</h2>
        <ol className="g-tuto-steps">
          <li>{fr ? `Chaque niveau fait jouer une vraie mission du poste. Il y en a ${levels.length}${ctx.c.boss ? ", plus un boss" : ""}.` : `Each level plays a real mission of the job. There are ${levels.length}${ctx.c.boss ? ", plus a boss" : ""}.`}</li>
          <li>{fr ? "En haut de l'écran, la barre d'objectif : remplis-la jusqu'au repère pour réussir le niveau." : "At the top, the goal bar: fill it up to the marker to clear the level."}</li>
          <li>{fr ? "Raté ? Tu recommences le niveau. Un indice arrive après quelques essais." : "Missed? Replay the level. A hint shows up after a few tries."}</li>
          <li>{fr ? "Souris, doigt ou clavier : Entrée et espace valident, les chiffres choisissent, les flèches déplacent." : "Mouse, finger or keyboard: Enter and space confirm, numbers pick, arrows move."}</li>
          <li>{fr ? "Jusqu'à 3 étoiles par niveau : réussi, du premier coup, et largement au-dessus de l'objectif. Les étoiles font monter ton grade." : "Up to 3 stars per level: cleared, first try, and well above the goal. Stars raise your rank."}</li>
          <li>{fr ? "Les notions du métier deviennent des cartes à collectionner. Les erreurs te montrent ce qui se passerait dans la vraie vie." : "Job concepts become collectible cards. Mistakes show what would happen in real life."}</li>
          <li>{fr ? "Le bouton ? en haut rouvre la fiche du niveau à tout moment (le jeu se met en pause)." : "The ? button at the top reopens the level card anytime (the game pauses)."}</li>
        </ol>
        <h3 className="g-h3">{fr ? "AU PROGRAMME" : "ON THE MENU"}</h3>
        <ul className="g-tuto-levels">
          {levels.map((l) => {
            const h = howTo(l.mechanic);
            return (
              <li key={l.id}>
                <Icon name={ICON_OF[l.mechanic.type] ?? "star"} size={22} />
                <span><b>{ctx.t(l.title)}</b> · {ctx.t(h.name)}{h.retro ? ` (${ctx.t(h.retro)})` : ""}</span>
              </li>
            );
          })}
        </ul>
        <button className="g-btn primary big" autoFocus onClick={onClose}>{fr ? "COMPRIS ▶" : "GOT IT ▶"}</button>
      </div>
    </div>
  );
}
