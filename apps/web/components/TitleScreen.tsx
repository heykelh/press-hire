"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { SKINS, TitleRenderer, type SkinId, type TitleSceneConfig } from "@press-hire/engine";

type Lang = "fr" | "en";
type I18n = Record<Lang, string>;

export interface TitleScreenProps {
  title: I18n;
  tagline: I18n;
  skin: SkinId;
  palette: { bg: string; ink: string; accent: string; colors: string[] };
  scene: Omit<TitleSceneConfig, "filter">;
  animation: "drop" | "zoom" | "glitch" | "wave";
  shine: boolean;
  lang: Lang;
  languages: Lang[];
  onLang?: (l: Lang) => void;
  onStart?: () => void;
  /** bouton « comment jouer » */
  onHelp?: () => void;
  mode?: "full" | "card";
  /** texte du petit badge (habillage famicom) */
  badge?: string;
}

export default function TitleScreen(props: TitleScreenProps) {
  const { title, tagline, skin, palette, scene, animation, shine, lang, languages, onLang, onStart, onHelp, mode = "full", badge } = props;
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const def = SKINS[skin];

  useEffect(() => {
    const el = root.current, cv = canvas.current;
    if (!el || !cv) return;
    const r = new TitleRenderer(cv, { ...scene, filter: def.filter });
    let raf = 0, last = 0, visible = true;
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < 33) return; // ~30 images/s
      last = now;
      r.frame((now - t0) / 1000);
    };
    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      r.resize(e.contentRect.width, e.contentRect.height);
      r.frame((performance.now() - t0) / 1000);
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => (visible = Boolean(e?.isIntersecting)));
    io.observe(el);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
    // la scène est figée pour une cartouche donnée
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(scene), def.filter]);

  useEffect(() => {
    if (mode !== "full" || !onStart) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [mode, onStart]);

  const vars = {
    "--bg": palette.bg,
    "--ink": palette.ink,
    "--accent": palette.accent,
  } as CSSProperties;

  const words = title[lang].split(" ");
  let i = 0;

  return (
    <div
      ref={root}
      className={`ph-title ${mode} skin-${skin} anim-${animation}`}
      style={vars}
      onClick={onStart}
      role="button"
      tabIndex={0}
      aria-label={`${title[lang]}. ${def.prompt[lang]}`}
    >
      <canvas ref={canvas} aria-hidden="true" />
      <div className="ph-fx" aria-hidden="true" />
      {skin === "famicom" && badge && <div className="ph-badge">{badge}</div>}
      {languages.length > 1 && onLang && (
        <button
          className="ph-lang"
          onClick={(e) => {
            e.stopPropagation();
            onLang(lang === "fr" ? "en" : "fr");
          }}
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
      )}
      {onHelp && mode === "full" && (
        <button
          className="ph-help"
          onClick={(e) => {
            e.stopPropagation();
            onHelp();
          }}
        >
          {lang === "fr" ? "? COMMENT JOUER" : "? HOW TO PLAY"}
        </button>
      )}
      <div className="ph-overlay">
        <div className="ph-head">
          <h1 className={`ph-logo${shine ? " shine" : ""}`} aria-hidden="true">
            {words.map((w, wi) => (
              <span key={wi} className="w">
                {[...w].map((ch) => {
                  const idx = i++;
                  return (
                    <span key={idx} className="l" style={{ "--i": idx, "--lc": palette.colors[idx % palette.colors.length] } as CSSProperties}>
                      {ch}
                    </span>
                  );
                })}
                {wi < words.length - 1 && <span className="sp" />}
              </span>
            ))}
            {skin === "terminal" && <span className="cursor" />}
          </h1>
          <p className="ph-tagline">{tagline[lang]}</p>
          {skin === "corporate" && <span className="ph-prompt">{def.prompt[lang]}</span>}
        </div>
        {skin !== "corporate" && <span className="ph-prompt">{def.prompt[lang]}</span>}
      </div>
    </div>
  );
}
