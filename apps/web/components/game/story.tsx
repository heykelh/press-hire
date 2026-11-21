"use client";

/**
 * Habillage narratif : scène d'ouverture, bandeaux (notion, rebondissement, conséquence),
 * étoiles, cartes métier.
 */
import { useEffect, useState } from "react";
import type { Cartridge, Concept } from "@press-hire/cartridge";
import { Icon } from "./arcade";
import { useTyped } from "./mechanics";
import { Portrait, type Ctx } from "./ui";

/* ---------------- scène d'ouverture ---------------- */

export function ColdOpen({ ctx, onDone }: { ctx: Ctx; onDone: () => void }) {
  const story = ctx.c.story!;
  const co = story.coldOpen;
  const ch = ctx.c.characters.find((x) => x.id === co.characterId);
  const [i, setI] = useState(0);
  const line = ctx.t(co.lines[i]!);
  const typed = useTyped(line, 40);
  const last = i >= co.lines.length - 1;

  useEffect(() => {
    if (typed.length < line.length) return;
    const id = setTimeout(() => (last ? undefined : setI(i + 1)), 1600);
    return () => clearTimeout(id);
  }, [typed, line, last, i]);
  useEffect(() => {
    ctx.chip.blip(220, 0.12);
    const k = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  const next = () => {
    if (typed.length < line.length) return;
    if (last) onDone(); else setI(i + 1);
  };

  return (
    <div className="g-cold" onClick={next}>
      <div className="g-cold-bar" />
      <div className="g-cold-body">
        {co.time && <p className="g-cold-time">{ctx.t(co.time)}</p>}
        <div className="g-cold-scene">
          {ch && <Portrait palette={ch.palette} size={96} talking={typed.length < line.length} />}
          <div>
            {ch && <p className="g-speaker-name">{ch.name} <small>{ctx.t(ch.role)}</small></p>}
            {co.lines.slice(0, i).map((l, k) => <p key={k} className="g-cold-line done">{ctx.t(l)}</p>)}
            <p className="g-cold-line">{typed}<span className="g-caret" /></p>
          </div>
        </div>
        <div className="g-cold-actions">
          {last && typed.length >= line.length && (
            <button className="g-btn primary big" autoFocus onClick={(e) => { e.stopPropagation(); onDone(); }}>
              {ctx.lang === "fr" ? "AU TRAVAIL ▶" : "GET TO WORK ▶"}
            </button>
          )}
          <button className="g-skip" onClick={(e) => { e.stopPropagation(); onDone(); }}>{ctx.lang === "fr" ? "PASSER >>" : "SKIP >>"}</button>
        </div>
      </div>
      <div className="g-cold-bar" />
    </div>
  );
}

/* ---------------- bandeaux non bloquants ---------------- */

export type Banner =
  | { kind: "concept"; concept: Concept }
  | { kind: "twist"; text: string }
  | { kind: "oops"; text: string };

export function BannerView({ ctx, b }: { ctx: Ctx; b: Banner }) {
  const fr = ctx.lang === "fr";
  if (b.kind === "concept")
    return (
      <div className="g-banner concept" role="status">
        <Icon name={b.concept.icon} size={30} />
        <div>
          <b>{fr ? "NOTION" : "CONCEPT"} · {ctx.t(b.concept.term)}</b>
          <span>{ctx.t(b.concept.definition)}</span>
        </div>
      </div>
    );
  if (b.kind === "twist")
    return (
      <div className="g-banner twist" role="status">
        <b>{fr ? "REBONDISSEMENT !" : "PLOT TWIST!"}</b>
        <span>{b.text}</span>
      </div>
    );
  return (
    <div className="g-banner oops" role="status">
      <b>{fr ? "DANS LA VRAIE VIE…" : "IN REAL LIFE…"}</b>
      <span>{b.text}</span>
    </div>
  );
}

/* ---------------- étoiles et cartes ---------------- */

export function Stars({ n, max = 3, animate = false }: { n: number; max?: number; animate?: boolean }) {
  return (
    <span className={`g-stars${animate ? " anim" : ""}`} aria-label={`${n} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < n ? "on" : ""} style={{ animationDelay: `${0.25 + i * 0.3}s` }}>★</i>
      ))}
    </span>
  );
}

export function ConceptChip({ ctx, concept, locked = false }: { ctx: Ctx; concept: Concept; locked?: boolean }) {
  return (
    <span className={`g-cchip${locked ? " locked" : ""}`}>
      <Icon name={concept.icon} size={18} /> {locked ? "???" : ctx.t(concept.term)}
    </span>
  );
}

/** Carte métier à retourner (recto : terme ; verso : définition). */
export function ConceptCard({ ctx, concept, owned }: { ctx: Ctx; concept: Concept; owned: boolean }) {
  const [flip, setFlip] = useState(false);
  return (
    <button className={`g-card3d${flip ? " flip" : ""}${owned ? "" : " locked"}`} onClick={() => owned && setFlip(!flip)} disabled={!owned}>
      <span className="front">
        <Icon name={owned ? concept.icon : "key"} size={34} />
        <b>{owned ? ctx.t(concept.term) : "???"}</b>
        {owned && <small>{ctx.lang === "fr" ? "touche pour retourner" : "tap to flip"}</small>}
      </span>
      <span className="back">
        <b>{ctx.t(concept.term)}</b>
        <span>{ctx.t(concept.definition)}</span>
        {concept.example && <em>{ctx.t(concept.example)}</em>}
      </span>
    </button>
  );
}

export const conceptById = (c: Cartridge, id: string) => c.concepts.find((x) => x.id === id);
