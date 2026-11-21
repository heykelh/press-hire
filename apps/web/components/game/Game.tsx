"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
import { applyEffects, checkConditions, initState, playBest, type Cartridge, type GameState, type I18n } from "@press-hire/cartridge";
import { Chip, finalScore, pickWeighted, rng, SKINS } from "@press-hire/engine";
import TitleScreen from "../TitleScreen";
import Ending from "./Ending";
import { BossFight, Mechanic } from "./mechanics";
import { Backdrop, BossSprite, deltaText, Hud, Portrait, useFx, type Ctx, type Lang } from "./ui";

type Phase =
  | { k: "title" }
  | { k: "intro"; i: number }
  | { k: "play"; i: number }
  | { k: "result"; i: number; won: boolean }
  | { k: "event"; next: number; id: string; lines: string[] }
  | { k: "bossIntro" }
  | { k: "boss" }
  | { k: "bossResult"; won: boolean }
  | { k: "ending"; recruiter: boolean };

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

const HOWTO: Record<string, I18n> = {
  wheel: { fr: "ROUE", en: "WHEEL" },
  slider: { fr: "RÉGLAGE", en: "TUNING" },
  triage: { fr: "TRI", en: "SORTING" },
  quiz: { fr: "QUIZ", en: "QUIZ" },
  dialogue: { fr: "ÉCHANGE", en: "TALK" },
};

/** Envoie un événement de partie (début, fin, clic) sans bloquer le jeu. */
function sendTrack(slug: string, kind: string, detail?: string) {
  try {
    let sid = sessionStorage.getItem("ph_sid");
    if (!sid) { sid = Math.random().toString(36).slice(2, 12); sessionStorage.setItem("ph_sid", sid); }
    const body = JSON.stringify({ slug, kind, sid, detail });
    if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" })))
      void fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {
    /* suivi facultatif */
  }
}

export default function Game({ c, track = false }: { c: Cartridge; track?: boolean }) {
  const [lang, setLang] = useState<Lang>(c.meta.defaultLang);
  const t = useCallback((x: I18n) => x[lang] || x[c.meta.defaultLang], [lang, c.meta.defaultLang]);
  const levels = useMemo(() => [...c.levels].sort((a, b) => a.order - b.order), [c]);
  const skin = SKINS[c.design.skin];
  const p = c.design.palette;

  const st = useRef<GameState>(initState(c));
  const levelStart = useRef<GameState>({ ...st.current });
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const [phase, setPhase] = useState<Phase>({ k: "title" });
  const [attempt, setAttempt] = useState(0); // remonte la mécanique à chaque essai
  const [fails, setFails] = useState(0);
  const [levelFails, setLevelFails] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [sound, setSound] = useState({ sfx: true, music: false });
  const chip = useRef<Chip | null>(null);
  if (!chip.current && typeof window !== "undefined") chip.current = new Chip();
  const rand = useRef(rng(Date.now() >>> 0)).current;
  const root = useRef<HTMLDivElement>(null);
  const fx = useFx(root, c.design.juice);

  const tracked = useRef(new Set<string>());
  const trackOnce = (kind: string, detail?: string) => {
    if (!track || tracked.current.has(kind + (detail ?? ""))) return;
    tracked.current.add(kind + (detail ?? ""));
    sendTrack(c.meta.id, kind, detail);
  };

  const ctx: Ctx = {
    c, lang, t, fx, rand,
    track: trackOnce,
    chip: chip.current ?? new Chip(),
    apply: (effects) => { const d = applyEffects(c, st.current, effects); bump(); return d; },
  };

  const say = (s: string) => { setToast(s); setTimeout(() => setToast(null), 3200); };

  useEffect(() => {
    if (phase.k === "ending" && !phase.recruiter) trackOnce("end");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ---------- son ---------- */
  useEffect(() => {
    const ch = chip.current;
    if (!ch) return;
    ch.sfxOn = sound.sfx;
    ch.musicOn = sound.music;
    if (sound.music && phase.k !== "title") ch.startMusic(c.design.music.preset, c.design.music.bpm);
    else ch.stopMusic();
    return () => ch.stopMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound, phase.k === "title"]);

  /* ---------- œufs de Pâques ---------- */
  useEffect(() => {
    const eggs = c.easterEggs;
    const konami = eggs.find((e) => e.trigger === "konami");
    const idle = eggs.find((e) => e.trigger === "idle_30s");
    let buf: string[] = [];
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(idleTimer);
      if (idle) idleTimer = setTimeout(() => say(t(idle.content)), 30000);
    };
    const k = (e: KeyboardEvent) => {
      arm();
      if (!konami) return;
      buf = [...buf, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
      if (buf.join() === KONAMI.join()) {
        buf = [];
        chip.current?.sfx("coin");
        say(t(konami.content));
        if (konami.effect === "recruiter_mode") setPhase({ k: "ending", recruiter: true });
      }
    };
    arm();
    window.addEventListener("keydown", k);
    window.addEventListener("pointerdown", arm);
    return () => { clearTimeout(idleTimer); window.removeEventListener("keydown", k); window.removeEventListener("pointerdown", arm); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  /* ---------- enchaînement ---------- */
  const startLevel = (i: number) => {
    levelStart.current = { ...st.current };
    setLevelFails(0);
    setPhase({ k: "intro", i });
  };
  const afterLevel = (i: number) => {
    const next = i + 1;
    // un événement tous les deux niveaux, s'il y en a
    // seuls les imprévus qui laissent le niveau suivant gagnable
    const lv = levels[next];
    const pool = lv ? c.events.filter((e) => {
      const s = { ...st.current };
      applyEffects(c, s, e.effects);
      return playBest(c, lv.mechanic, lv.win, s) !== null;
    }) : [];
    if (pool.length && next % 2 === 0) {
      const ev = pool[pickWeighted(pool.map((e) => e.weight), rand)]!;
      const d = applyEffects(c, st.current, ev.effects);
      bump();
      setPhase({ k: "event", next, id: ev.id, lines: deltaText(c, d, t).map((l) => l.text) });
      return;
    }
    goTo(next);
  };
  const goTo = (next: number) => {
    if (next < levels.length) startLevel(next);
    else if (c.boss) { levelStart.current = { ...st.current }; setPhase({ k: "bossIntro" }); }
    else setPhase({ k: "ending", recruiter: false });
  };
  const finishLevel = (i: number) => {
    const won = checkConditions(levels[i]!.win, st.current, levelStart.current);
    if (won) { chip.current?.sfx("win"); fx.confetti(); }
    else { chip.current?.sfx("lose"); fx.shake(); setFails((f) => f + 1); setLevelFails((f) => f + 1); }
    setPhase({ k: "result", i, won });
  };
  const retry = (i: number) => {
    st.current = { ...levelStart.current };
    bump();
    setAttempt((a) => a + 1);
    setPhase({ k: "play", i });
  };
  const restart = () => {
    st.current = initState(c);
    levelStart.current = { ...st.current };
    setFails(0);
    bump();
    startLevel(0);
  };

  const start = () => {
    trackOnce("start");
    chip.current?.sfx("coin");
    startLevel(0);
  };

  const vars = {
    "--bg": p.bg, "--panel": p.panel, "--ink": p.ink, "--accent": p.accent,
    "--c1": p.colors[0], "--c2": p.colors[1] ?? p.accent, "--c3": p.colors[2] ?? p.accent,
  } as CSSProperties;

  const ts = c.titleScreen;
  const scene = {
    scene: ts.scene, time: ts.time, weather: ts.weather, actors: ts.actors,
    colors: p.colors, accent: p.accent, seed: c.meta.id,
    detail: ts.detail ? { label: ts.detail.label[lang], value: ts.detail.value } : undefined,
  };

  if (phase.k === "title")
    return (
      <TitleScreen
        title={c.design.title} tagline={c.design.tagline} skin={c.design.skin} palette={p}
        scene={scene} animation={ts.logo.animation} shine={ts.logo.shine}
        lang={lang} languages={c.meta.languages} onLang={setLang}
        onStart={start}
        onRecruiter={() => { trackOnce("recruiter"); setPhase({ k: "ending", recruiter: true }); }}
        badge={c.target.company.sector.toUpperCase()}
      />
    );

  const fr = lang === "fr";
  const char = (id?: string) => c.characters.find((x) => x.id === id);
  const toolbar = (
    <>
      <button className="g-tool" onClick={() => setSound((s) => ({ ...s, sfx: !s.sfx }))} aria-pressed={sound.sfx} title="SFX">{sound.sfx ? "SFX ●" : "SFX ○"}</button>
      <button className="g-tool" onClick={() => setSound((s) => ({ ...s, music: !s.music }))} aria-pressed={sound.music} title={fr ? "Musique" : "Music"}>{sound.music ? "♪ ●" : "♪ ○"}</button>
      {c.meta.languages.length > 1 && <button className="g-tool" onClick={() => setLang(fr ? "en" : "fr")}>{fr ? "EN" : "FR"}</button>}
      {phase.k !== "ending" && <button className="g-tool accent" onClick={() => { trackOnce("recruiter"); setPhase({ k: "ending", recruiter: true }); }} title={fr ? "Voir le résumé" : "See the summary"}>{fr ? "RECRUTEUR >" : "RECRUITER >"}</button>}
    </>
  );

  const levelIdx = "i" in phase ? phase.i : phase.k === "event" ? phase.next - 1 : levels.length - 1;
  const level = levels[Math.max(0, Math.min(levels.length - 1, levelIdx))]!;
  const inBoss = phase.k === "boss" || phase.k === "bossIntro" || phase.k === "bossResult";
  const goals = inBoss ? [] : level.win;
  const levelNo = inBoss ? "BOSS" : String(level.order);

  let body: React.ReactNode = null;

  switch (phase.k) {
    case "intro": {
      const ch = char(level.characterId ?? (level.mechanic.type === "dialogue" ? level.mechanic.characterId : undefined));
      const rq = c.analysis.requirements.find((r) => r.id === level.requirementId);
      body = (
        <div className="g-intro" key={`intro-${phase.i}`}>
          <p className="g-stage">{fr ? "NIVEAU" : "LEVEL"} {level.order} · {t(HOWTO[level.mechanic.type]!)}</p>
          <h2 className="g-level-title">{t(level.title)}</h2>
          {ch && (
            <div className="g-speaker">
              <Portrait palette={ch.palette} size={72} talking />
              <div><p className="g-speaker-name">{ch.name} <small>{t(ch.role)}</small></p><p className="g-bubble">{t(level.intro)}</p></div>
            </div>
          )}
          {!ch && <p className="g-bubble">{t(level.intro)}</p>}
          {rq && <p className="g-req">{fr ? "Dans l'offre" : "In the job ad"} : <b>{t(rq.label)}</b></p>}
          <button className="g-btn primary big" autoFocus onClick={() => { chip.current?.sfx("click"); setPhase({ k: "play", i: phase.i }); }}>
            {fr ? "C'EST PARTI ▶" : "LET'S GO ▶"}
          </button>
        </div>
      );
      break;
    }
    case "play": {
      const ch = char(level.mechanic.type === "dialogue" ? level.mechanic.characterId ?? level.characterId : level.characterId);
      body = <Mechanic key={`${phase.i}-${attempt}`} ctx={ctx} m={level.mechanic} character={ch} onDone={() => finishLevel(phase.i)} />;
      break;
    }
    case "result": {
      const joke = level.failJokes[(levelFails - 1 + level.failJokes.length) % level.failJokes.length]!;
      const showHint = !phase.won && level.hint && levelFails >= level.hintAfterFails;
      body = (
        <div className={`g-result ${phase.won ? "won" : "lost"}`}>
          <p className="g-stamp">{phase.won ? (fr ? "NIVEAU RÉUSSI" : "LEVEL CLEARED") : fr ? "RATÉ !" : "MISSED!"}</p>
          <p className="g-bubble">{t(phase.won ? level.winLine : joke)}</p>
          {showHint && <p className="g-hint">💡 {t(level.hint!)}</p>}
          {phase.won ? (
            <button className="g-btn primary big" autoFocus onClick={() => afterLevel(phase.i)}>{fr ? "CONTINUER ▶" : "CONTINUE ▶"}</button>
          ) : (
            <div className="g-choice-row">
              <button className="g-btn primary big" autoFocus onClick={() => retry(phase.i)}>{fr ? "↺ RÉESSAYER" : "↺ RETRY"}</button>
              {levelFails >= 3 && <button className="g-btn" onClick={() => goTo(phase.i + 1)}>{fr ? "PASSER >>" : "SKIP >>"}</button>}
            </div>
          )}
        </div>
      );
      break;
    }
    case "event": {
      const ev = c.events.find((e) => e.id === phase.id)!;
      body = (
        <div className="g-event">
          <p className="g-stamp small">{fr ? "IMPRÉVU !" : "PLOT TWIST!"}</p>
          <p className="g-bubble">{t(ev.text)}</p>
          {phase.lines.length > 0 && <ul className="g-log">{phase.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
          <button className="g-btn primary" autoFocus onClick={() => goTo(phase.next)}>OK ▶</button>
        </div>
      );
      break;
    }
    case "bossIntro": {
      const b = c.boss!;
      const pain = c.analysis.painPoints.find((x) => x.id === b.painPointId);
      const ch = char(b.characterId);
      body = (
        <div className="g-intro boss">
          <p className="g-stage warn">⚠ BOSS ⚠</p>
          <h2 className="g-level-title">{t(b.name)}</h2>
          {ch ? <Portrait palette={ch.palette} size={96} talking /> : <BossSprite color={p.colors[0]!} size={110} />}
          <p className="g-bubble boss">{t(b.taunts[0]!)}</p>
          {pain && <p className="g-req">{fr ? "Le vrai problème" : "The real problem"} : <b>{t(pain.label)}</b></p>}
          <p className="g-rule">{b.mechanic.type === "quiz"
            ? fr ? `Bonne réponse = 1 coup. ${b.hp} coups pour gagner, 3 vies.` : `Right answer = 1 hit. ${b.hp} hits to win, 3 lives.`
            : fr ? `Case favorable = 1 coup. ${b.hp} coups pour gagner, 3 vies.` : `Good slot = 1 hit. ${b.hp} hits to win, 3 lives.`}</p>
          <button className="g-btn primary big" autoFocus onClick={() => { chip.current?.sfx("coin"); setAttempt((a) => a + 1); setPhase({ k: "boss" }); }}>{fr ? "COMBATTRE ▶" : "FIGHT ▶"}</button>
        </div>
      );
      break;
    }
    case "boss":
      body = (
        <BossFight key={`boss-${attempt}`} ctx={ctx} boss={c.boss!} character={char(c.boss!.characterId)}
          onEnd={(won) => {
            if (won) { chip.current?.sfx("win"); fx.confetti(); } else { chip.current?.sfx("lose"); setFails((f) => f + 1); }
            setPhase({ k: "bossResult", won });
          }} />
      );
      break;
    case "bossResult":
      body = (
        <div className={`g-result ${phase.won ? "won" : "lost"}`}>
          <p className="g-stamp">{phase.won ? "K.O. !" : fr ? "PERDU…" : "DEFEATED…"}</p>
          <p className="g-bubble">{phase.won ? t(c.boss!.defeatLine) : t(c.boss!.taunts[c.boss!.taunts.length - 1]!)}</p>
          {phase.won ? (
            <button className="g-btn primary big" autoFocus onClick={() => setPhase({ k: "ending", recruiter: false })}>{fr ? "VICTOIRE ▶" : "VICTORY ▶"}</button>
          ) : (
            <button className="g-btn primary big" autoFocus onClick={() => { st.current = { ...levelStart.current }; bump(); setAttempt((a) => a + 1); setPhase({ k: "boss" }); }}>{fr ? "↺ REVANCHE" : "↺ REMATCH"}</button>
          )}
        </div>
      );
      break;
    case "ending": {
      const perfect = !phase.recruiter && fails === 0 ? c.easterEggs.find((e) => e.trigger === "perfect_run") : undefined;
      body = (
        <Ending ctx={ctx} recruiter={phase.recruiter} fails={fails}
          score={phase.recruiter ? null : finalScore(c, st.current, fails)}
          perfectEgg={perfect ? t(perfect.content) : undefined}
          onReplay={restart} />
      );
      break;
    }
  }

  return (
    <div ref={root} className={`g-root gskin-${c.design.skin}`} style={vars}>
      <Backdrop scene={scene} filter={skin.filter} />
      {phase.k === "ending" ? (
        <header className="g-hud slim"><div className="g-hud-top"><span className="g-hud-title">{t(c.design.title)}</span><span className="g-hud-actions">{toolbar}</span></div></header>
      ) : (
        <Hud ctx={ctx} state={st.current} levelStart={levelStart.current} goals={phase.k === "intro" || phase.k === "play" || phase.k === "result" ? goals : []} levelNo={levelNo} levelCount={levels.length}>
          {toolbar}
        </Hud>
      )}
      <main className="g-stage-area">
        <div className="g-panel main" key={phase.k}>{body}</div>
      </main>
      {toast && <div className="g-toast" role="status">{toast}</div>}
    </div>
  );
}
