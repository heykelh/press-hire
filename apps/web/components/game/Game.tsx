"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
import { applyEffects, checkConditions, initState, playBest, type Cartridge, type GameState, type I18n, type Modifier } from "@press-hire/cartridge";
import { Chip, finalScore, pickWeighted, rng, SKINS } from "@press-hire/engine";
import TitleScreen from "../TitleScreen";
import Ending from "./Ending";
import { BossFight, Mechanic } from "./mechanics";
import { HowToCard, TutorialOverlay } from "./Tutorial";
import { levelStars, rankIndex, ranksOf } from "./progress";
import { BannerView, ColdOpen, ConceptChip, Stars, conceptById, type Banner } from "./story";
import { Backdrop, BossSprite, deltaText, Hud, Portrait, useFx, type Ctx, type Lang } from "./ui";

type Phase =
  | { k: "title" }
  | { k: "open" }
  | { k: "intro"; i: number }
  | { k: "ambush"; i: number }
  | { k: "play"; i: number }
  | { k: "result"; i: number; won: boolean }
  | { k: "event"; next: number; id: string; lines: string[] }
  | { k: "bossIntro" }
  | { k: "boss" }
  | { k: "bphase"; j: number; missed?: boolean }
  | { k: "bplay"; j: number }
  | { k: "bossResult"; won: boolean }
  | { k: "ending" };

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];


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

export default function Game({ c, track = false, badge = true }: { c: Cartridge; track?: boolean; badge?: boolean }) {
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
  const [help, setHelp] = useState(false);
  // progression
  const [stars, setStars] = useState<Record<string, number>>({});
  const [learned, setLearned] = useState<string[]>([]);
  const learnedRef = useRef(new Set<string>());
  const [gained, setGained] = useState<string[]>([]); // cartes gagnées pendant le niveau en cours
  const reports = useRef<Record<string, Array<{ label: string; value: string }>>>({});
  const [banners, setBanners] = useState<Banner[]>([]);
  const twistShown = useRef(false);
  const lastOops = useRef(0);
  const combo = useRef({ cur: 0, max: 0 });
  const [comboShow, setComboShow] = useState(0);
  const [bossWon, setBossWon] = useState(false);
  const [bossHp, setBossHp] = useState(0);
  const [bossLives, setBossLives] = useState(3);
  const [extendWon, setExtendWon] = useState(false);
  const [answered, setAnswered] = useState(false); // appel entrant décroché
  const bossStart = useRef<GameState>({ ...st.current });
  const ambushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(ambushTimer.current), []);
  const [rankUp, setRankUp] = useState<string | null>(null);
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

  const pushBanner = (b: Banner) => setBanners((q) => (q.length > 2 ? q : [...q, b]));
  useEffect(() => {
    if (!banners.length) return;
    const ms = banners[0]!.kind === "concept" ? 4800 : 3200;
    const id = setTimeout(() => setBanners((q) => q.slice(1)), ms);
    return () => clearTimeout(id);
  }, [banners]);

  const curLevelRef = useRef(0);
  const ctx: Ctx = {
    c, lang, t, fx, rand,
    track: trackOnce,
    chip: chip.current ?? new Chip(),
    apply: (effects) => { const d = applyEffects(c, st.current, effects); bump(); return d; },
    assist: levelFails >= 4 ? 2 : levelFails >= 2 ? 1 : 0,
    twist: () => {
      const lv = levels[curLevelRef.current];
      if (twistShown.current || !lv?.twist) return;
      twistShown.current = true;
      chip.current?.sfx("tick");
      pushBanner({ kind: "twist", text: t(lv.twist.text) });
    },
    learn: (id) => {
      if (!id || learnedRef.current.has(id)) return;
      const concept = conceptById(c, id);
      if (!concept) return;
      learnedRef.current.add(id);
      setLearned([...learnedRef.current]);
      setGained((g) => [...g, id]);
      pushBanner({ kind: "concept", concept });
    },
    oops: (text) => {
      if (!text || Date.now() - lastOops.current < 2500) return;
      lastOops.current = Date.now();
      pushBanner({ kind: "oops", text });
    },
    combo: (good) => {
      const k = combo.current;
      k.cur = good ? k.cur + 1 : 0;
      k.max = Math.max(k.max, k.cur);
      setComboShow(k.cur);
      if (good && k.cur >= 3 && k.cur % 3 === 0) chip.current?.blip(880 + k.cur * 20, 0.06);
    },
    report: (rows) => { reports.current[levels[curLevelRef.current]?.id ?? "?"] = rows; },
  };

  const say = (s: string) => { setToast(s); setTimeout(() => setToast(null), 3200); };

  useEffect(() => {
    if (phase.k === "ending") trackOnce("end");
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
      }
    };
    arm();
    window.addEventListener("keydown", k);
    window.addEventListener("pointerdown", arm);
    return () => { clearTimeout(idleTimer); window.removeEventListener("keydown", k); window.removeEventListener("pointerdown", arm); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  /* ---------- READY / GO façon borne d'arcade au début de chaque partie de jeu ---------- */
  const readyKey = phase.k === "play" ? `p${phase.i}-${attempt}` : phase.k === "bplay" ? `b${phase.j}-${attempt}` : "";

  /* ---------- modificateur « séisme » : l'écran tremble par moments ---------- */
  const quake = (phase.k === "play" && levels[phase.i]?.modifiers?.includes("quake")) ||
    (phase.k === "bplay" && c.boss?.phases?.[phase.j]?.modifiers?.includes("quake"));
  useEffect(() => {
    if (!quake) return;
    const id = setInterval(() => { if (!help) { fx.shake(); chip.current?.sfx("hit"); } }, 3600);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quake, help]);

  /* ---------- enchaînement ---------- */
  const startLevel = (i: number) => {
    setHelp(false);
    curLevelRef.current = i;
    levelStart.current = { ...st.current };
    setLevelFails(0);
    setGained([]);
    setRankUp(null);
    setAnswered(false);
    const entry = levels[i]?.entry ?? "briefing";
    if (entry === "ambush") {
      // embuscade : pas d'écran d'explication, une alerte puis ça démarre
      chip.current?.sfx("lose");
      fx.shake();
      setPhase({ k: "ambush", i });
      clearTimeout(ambushTimer.current);
      ambushTimer.current = setTimeout(() => play(i), 2400);
      return;
    }
    if (entry === "call") chip.current?.sfx("coin");
    setPhase({ k: "intro", i });
  };
  const play = (i: number) => {
    clearTimeout(ambushTimer.current);
    twistShown.current = false;
    setBanners([]);
    setComboShow(0);
    combo.current.cur = 0;
    chip.current?.jingle("ready");
    setPhase({ k: "play", i });
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
    else if (c.boss) {
      levelStart.current = { ...st.current }; bossStart.current = { ...st.current };
      setBossHp(c.boss.phases?.length ?? c.boss.hp);
      // vie bonus façon arcade (« extend ») : 80 % des étoiles avant le boss
      const extend = !!c.boss.phases && Object.values(stars).reduce((a, b) => a + b, 0) >= levels.length * 3 * 0.8;
      setBossLives(extend ? 4 : 3);
      if (extend) { chip.current?.jingle("oneup"); fx.pop("1UP !", true); }
      setExtendWon(extend);
      chip.current?.jingle("boss");
      setPhase({ k: "bossIntro" });
    }
    else setPhase({ k: "ending" });
  };
  const maxStars = levels.length * 3;
  const finishLevel = (i: number) => {
    const lv = levels[i]!;
    const won = checkConditions(lv.win, st.current, levelStart.current);
    trackOnce("level", `${lv.id}:${won ? 1 : 0}`);
    if (won) {
      chip.current?.jingle("clear");
      fx.confetti();
      const n = levelStars(lv, st.current, levelStart.current, levelFails);
      const next = { ...stars, [lv.id]: Math.max(stars[lv.id] ?? 0, n) };
      const before = rankIndex(Object.values(stars).reduce((a, b) => a + b, 0), maxStars);
      const after = rankIndex(Object.values(next).reduce((a, b) => a + b, 0), maxStars);
      setStars(next);
      if (after > before) setRankUp(t(ranksOf(c)[after]!));
      // les notions du niveau rejoignent la collection
      const fresh = lv.teaches.filter((id) => !learnedRef.current.has(id) && conceptById(c, id));
      fresh.forEach((id) => learnedRef.current.add(id));
      if (fresh.length) { setLearned([...learnedRef.current]); setGained((g) => [...g, ...fresh]); }
    } else { chip.current?.sfx("lose"); fx.shake(); setFails((f) => f + 1); setLevelFails((f) => f + 1); }
    setBanners([]);
    setPhase({ k: "result", i, won });
  };
  const retry = (i: number) => {
    st.current = { ...levelStart.current };
    bump();
    setAttempt((a) => a + 1);
    setGained([]);
    play(i);
  };
  const restart = () => {
    st.current = initState(c);
    levelStart.current = { ...st.current };
    setFails(0);
    setStars({});
    reports.current = {};
    combo.current = { cur: 0, max: 0 };
    setBossWon(false);
    bump();
    startLevel(0);
  };

  const start = () => {
    trackOnce("start");
    chip.current?.sfx("coin");
    if (c.story) setPhase({ k: "open" });
    else startLevel(0);
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
      <>
      <TitleScreen
        title={c.design.title} tagline={c.design.tagline} skin={c.design.skin} palette={p}
        scene={scene} animation={ts.logo.animation} shine={ts.logo.shine}
        lang={lang} languages={c.meta.languages} onLang={setLang}
        onStart={help ? undefined : start}
        onHelp={() => setHelp(true)}
        badge={c.target.company.sector.toUpperCase()}
      />
      {help && <div className={`g-root-lite gskin-${c.design.skin}`} style={vars}><TutorialOverlay ctx={ctx} levels={levels} onClose={() => setHelp(false)} /></div>}
      </>
    );

  const fr = lang === "fr";
  const char = (id?: string) => c.characters.find((x) => x.id === id);
  const toolbar = (
    <>
      <button className="g-tool" onClick={() => setSound((s) => ({ ...s, sfx: !s.sfx }))} aria-pressed={sound.sfx} title="SFX">{sound.sfx ? "SFX ●" : "SFX ○"}</button>
      <button className="g-tool" onClick={() => setSound((s) => ({ ...s, music: !s.music }))} aria-pressed={sound.music} title={fr ? "Musique" : "Music"}>{sound.music ? "♪ ●" : "♪ ○"}</button>
      {c.meta.languages.length > 1 && <button className="g-tool" onClick={() => setLang(fr ? "en" : "fr")}>{fr ? "EN" : "FR"}</button>}
      {(phase.k === "play" || phase.k === "bplay") && <button className="g-tool accent" onClick={() => setHelp(true)} title={fr ? "Comment jouer (pause)" : "How to play (pause)"} aria-label={fr ? "Comment jouer" : "How to play"}>?</button>}
    </>
  );

  const levelIdx = "i" in phase ? phase.i : phase.k === "event" ? phase.next - 1 : phase.k === "open" ? 0 : levels.length - 1;
  const level = levels[Math.max(0, Math.min(levels.length - 1, levelIdx))]!;
  const inBoss = phase.k === "boss" || phase.k === "bossIntro" || phase.k === "bossResult" || phase.k === "bphase" || phase.k === "bplay";
  const bossPhase = (phase.k === "bphase" || phase.k === "bplay") ? c.boss?.phases?.[phase.j] : undefined;
  const goals = bossPhase ? bossPhase.win : inBoss ? [] : level.win;
  const mods: Modifier[] = phase.k === "play" ? level.modifiers ?? [] : phase.k === "bplay" ? bossPhase?.modifiers ?? [] : [];
  const playCtx: Ctx = mods.length ? { ...ctx, speed: mods.includes("turbo") ? 1.35 : 1, mirror: mods.includes("mirror") } : ctx;
  const levelNo = inBoss ? "BOSS" : level.day ? `${t(level.day)} · ${level.order}` : String(level.order);
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);
  // score façon borne d'arcade : étoiles, niveaux réussis du premier coup, meilleur combo
  const firstTries = Object.values(stars).filter((n) => n >= 2).length;
  const runScore = totalStars * 150 + firstTries * 200 + combo.current.max * 15;

  let body: React.ReactNode = null;

  switch (phase.k) {
    case "open":
      body = <ColdOpen ctx={ctx} onDone={() => startLevel(0)} />;
      break;
    case "ambush":
      body = (
        <div className="g-intro ambush" key={`amb-${phase.i}`}>
          <p className="g-stage warn">⚠ {fr ? "ALERTE" : "ALERT"} ⚠</p>
          {level.day ? <p className="g-day">{t(level.day)}</p> : null}
          <h2 className="g-level-title">{t(level.title)}</h2>
          <p className="g-bubble">{t(level.intro)}</p>
          <ModTags mods={level.modifiers ?? []} fr={fr} />
          <button className="g-btn primary" onClick={() => play(phase.i)}>{fr ? "GO ! ▶" : "GO! ▶"}</button>
        </div>
      );
      break;
    case "intro": {
      const ch = char(level.characterId ?? (level.mechanic.type === "dialogue" ? level.mechanic.characterId : undefined));
      if (level.entry === "call" && !answered) {
        body = (
          <div className="g-intro call" key={`call-${phase.i}`}>
            {level.day ? <p className="g-day">{t(level.day)}</p> : null}
            <p className="g-stage">{fr ? "APPEL ENTRANT" : "INCOMING CALL"}</p>
            <div className="g-phone">
              {ch ? <Portrait palette={ch.palette} size={84} talking /> : <span className="g-phone-icon">☎</span>}
              <p className="g-speaker-name">{ch ? <>{ch.name} <small>{t(ch.role)}</small></> : (fr ? "Numéro masqué" : "Unknown caller")}</p>
              <p className="g-ring">♪ DRING ♪ DRING ♪</p>
            </div>
            <div className="g-row">
              <button className="g-btn primary big" autoFocus onClick={() => { chip.current?.sfx("click"); setAnswered(true); }}>{fr ? "📞 DÉCROCHER" : "📞 ANSWER"}</button>
              <button className="g-btn" onClick={() => { chip.current?.sfx("lose"); say(fr ? "Il rappelle. Il rappelle toujours." : "They call back. They always call back."); setAnswered(true); }}>{fr ? "IGNORER" : "IGNORE"}</button>
            </div>
          </div>
        );
        break;
      }
      const rq = c.analysis.requirements.find((r) => r.id === level.requirementId);
      body = (
        <div className="g-intro" key={`intro-${phase.i}`}>
          {level.day ? <p className="g-day">{t(level.day)}</p> : null}
          <p className="g-stage">{fr ? "NIVEAU" : "LEVEL"} {level.order} / {levels.length}{stars[level.id] ? <> · <Stars n={stars[level.id]!} /></> : null}</p>
          <h2 className="g-level-title">{t(level.title)}</h2>
          {ch && (
            <div className="g-speaker">
              <Portrait palette={ch.palette} size={72} talking />
              <div><p className="g-speaker-name">{ch.name} <small>{t(ch.role)}</small></p><p className="g-bubble">{t(level.intro)}</p></div>
            </div>
          )}
          {!ch && <p className="g-bubble">{t(level.intro)}</p>}
          {rq && <p className="g-req">{fr ? "Mission du poste" : "Job mission"} : <b>{t(rq.label)}</b></p>}
          {level.teaches.length > 0 && (
            <p className="g-learn-row">
              <span>{fr ? "À découvrir :" : "You'll learn:"}</span>
              {level.teaches.map((id) => conceptById(c, id)).filter((x) => !!x).map((x) => <ConceptChip key={x!.id} ctx={ctx} concept={x!} />)}
            </p>
          )}
          <ModTags mods={level.modifiers ?? []} fr={fr} />
          <HowToCard ctx={ctx} level={level} />
          <button className="g-btn primary big" autoFocus onClick={() => { chip.current?.sfx("click"); play(phase.i); }}>
            {fr ? "C'EST PARTI ▶" : "LET'S GO ▶"}
          </button>
        </div>
      );
      break;
    }
    case "play": {
      const ch = char(level.mechanic.type === "dialogue" ? level.mechanic.characterId ?? level.characterId : level.characterId);
      body = (
        <>
          <ReadyGo key={readyKey} fr={fr} />
          <ModFrame mods={mods}>
            <Mechanic key={`${phase.i}-${attempt}`} ctx={playCtx} m={level.mechanic} character={ch} paused={help} onDone={() => finishLevel(phase.i)} />
          </ModFrame>
          {help && (
            <div className="g-overlay" onClick={() => setHelp(false)}>
              <div className="g-panel g-tuto" onClick={(e) => e.stopPropagation()}>
                <p className="g-stage">PAUSE</p>
                <HowToCard ctx={ctx} level={level} />
                <button className="g-btn primary big" autoFocus onClick={() => setHelp(false)}>{fr ? "REPRENDRE ▶" : "RESUME ▶"}</button>
              </div>
            </div>
          )}
        </>
      );
      break;
    }
    case "result": {
      const joke = level.failJokes[(levelFails - 1 + level.failJokes.length) % level.failJokes.length]!;
      const showHint = !phase.won && level.hint && levelFails >= level.hintAfterFails;
      body = (
        <div className={`g-result ${phase.won ? "won" : "lost"}`}>
          <p className="g-stamp">{phase.won ? (fr ? "NIVEAU RÉUSSI" : "LEVEL CLEARED") : fr ? "RATÉ !" : "MISSED!"}</p>
          {phase.won && <Stars n={stars[level.id] ?? 1} animate />}
          {phase.won && (
            <p className="g-tally">
              <span>★ ×{stars[level.id] ?? 1} <b>+{(stars[level.id] ?? 1) * 150}</b></span>
              {(stars[level.id] ?? 1) >= 2 && <span>{fr ? "DU PREMIER COUP" : "FIRST TRY"} <b>+200</b></span>}
              <span className="g-tally-total">SCORE <Counter to={runScore} /></span>
            </p>
          )}
          <p className="g-bubble">{t(phase.won ? level.winLine : joke)}</p>
          {phase.won && level.outro && (() => {
            const oc = char(level.outro.characterId);
            return (
              <div className="g-speaker">
                {oc && <Portrait palette={oc.palette} size={56} talking />}
                <div>{oc && <p className="g-speaker-name">{oc.name}</p>}<p className="g-bubble small">{t(level.outro.text)}</p></div>
              </div>
            );
          })()}
          {reports.current[level.id] && (
            <ul className="g-mini-report">{reports.current[level.id]!.map((r, k) => <li key={k}>{r.label} <b>{r.value}</b></li>)}</ul>
          )}
          {phase.won && gained.length > 0 && (
            <p className="g-learn-row gained">
              <span>📘 {fr ? "Cartes métier gagnées :" : "Job cards earned:"}</span>
              {gained.map((id) => conceptById(c, id)).filter((x) => !!x).map((x) => <ConceptChip key={x!.id} ctx={ctx} concept={x!} />)}
            </p>
          )}
          {phase.won && rankUp && <p className="g-rankup">▲ {fr ? "PROMOTION" : "PROMOTED"} : <b>{rankUp}</b></p>}
          {!phase.won && (levelFails === 2 || levelFails === 4) && (
            <p className="g-hint">🛟 {fr ? "Coup de pouce activé : un peu plus lent, un peu moins de pièges." : "Assist on: a bit slower, a few fewer traps."}</p>
          )}
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
          <p className="g-rule">{b.phases
            ? fr ? `Il a ${b.phases.length} formes. Gagne chaque phase pour lui infliger un coup. ${bossLives} vies${extendWon ? " (dont une vie bonus pour tes étoiles)" : ""}.` : `It has ${b.phases.length} forms. Win each phase to land a hit. ${bossLives} lives${extendWon ? " (one bonus life for your stars)" : ""}.`
            : b.mechanic?.type === "quiz"
            ? fr ? `Bonne réponse = 1 coup. ${b.hp} coups pour gagner, 3 vies.` : `Right answer = 1 hit. ${b.hp} hits to win, 3 lives.`
            : fr ? `Case favorable = 1 coup. ${b.hp} coups pour gagner, 3 vies.` : `Good slot = 1 hit. ${b.hp} hits to win, 3 lives.`}</p>
          <button className="g-btn primary big" autoFocus onClick={() => {
            chip.current?.sfx("coin"); setAttempt((a) => a + 1);
            setPhase(b.phases ? { k: "bphase", j: 0 } : { k: "boss" });
          }}>{fr ? "COMBATTRE ▶" : "FIGHT ▶"}</button>
        </div>
      );
      break;
    }
    case "boss":
      body = (
        <BossFight key={`boss-${attempt}`} ctx={ctx} boss={c.boss!} character={char(c.boss!.characterId)}
          onEnd={(won) => {
            if (won) { chip.current?.jingle("clear"); fx.confetti(); setBossWon(true); } else { chip.current?.jingle("gameover"); setFails((f) => f + 1); }
            setPhase({ k: "bossResult", won });
          }} />
      );
      break;
    case "bphase": {
      const b = c.boss!;
      const ph = b.phases![phase.j]!;
      const ch = char(b.characterId);
      body = (
        <div className="g-intro boss" key={`bph-${phase.j}-${phase.missed ? 1 : 0}`}>
          <BossHead ctx={ctx} name={t(b.name)} hp={bossHp} max={b.phases!.length} lives={bossLives} character={ch} hurt={false} />
          <p className="g-stage warn">{fr ? "PHASE" : "PHASE"} {phase.j + 1} / {b.phases!.length}</p>
          <p className="g-bubble boss">{phase.missed ? t(ph.taunt ?? b.taunts[(phase.j + 1) % b.taunts.length]!) : t(ph.intro)}</p>
          <ModTags mods={ph.modifiers ?? []} fr={fr} />
          <button className="g-btn primary big" autoFocus onClick={() => {
            chip.current?.sfx("click");
            st.current = { ...levelStart.current }; bump();
            setAttempt((a) => a + 1); setPhase({ k: "bplay", j: phase.j });
          }}>{phase.missed ? (fr ? "↺ ENCORE ▶" : "↺ AGAIN ▶") : (fr ? "ATTAQUER ▶" : "ATTACK ▶")}</button>
        </div>
      );
      break;
    }
    case "bplay": {
      const b = c.boss!;
      const ph = b.phases![phase.j]!;
      const ch = char(ph.mechanic.type === "dialogue" ? ph.mechanic.characterId ?? b.characterId : b.characterId);
      const j = phase.j;
      body = (
        <>
        <ReadyGo key={readyKey} fr={fr} />
        <ModFrame mods={mods}>
          <Mechanic key={`bp-${j}-${attempt}`} ctx={playCtx} m={ph.mechanic} character={ch} paused={help} onDone={() => {
            const won = checkConditions(ph.win, st.current, levelStart.current);
            trackOnce("level", `boss${j + 1}:${won ? 1 : 0}`);
            if (won) {
              chip.current?.sfx("hit"); fx.shake(); fx.confetti();
              const hp = bossHp - 1; setBossHp(hp);
              levelStart.current = { ...st.current };
              if (hp <= 0 || j + 1 >= b.phases!.length) { chip.current?.sfx("win"); setBossWon(true); setPhase({ k: "bossResult", won: true }); }
              else setPhase({ k: "bphase", j: j + 1 });
            } else {
              chip.current?.sfx("lose"); fx.shake(); setFails((f) => f + 1);
              const l = bossLives - 1; setBossLives(l);
              if (l <= 0) { chip.current?.jingle("gameover"); setPhase({ k: "bossResult", won: false }); }
              else setPhase({ k: "bphase", j, missed: true });
            }
          }} />
        </ModFrame>
        </>
      );
      break;
    }
    case "bossResult":
      body = (
        <div className={`g-result ${phase.won ? "won" : "lost"}`}>
          <p className="g-stamp">{phase.won ? "K.O. !" : fr ? "PERDU…" : "DEFEATED…"}</p>
          <p className="g-bubble">{phase.won ? t(c.boss!.defeatLine) : t(c.boss!.taunts[c.boss!.taunts.length - 1]!)}</p>
          {phase.won ? (
            <button className="g-btn primary big" autoFocus onClick={() => setPhase({ k: "ending" })}>{fr ? "VICTOIRE ▶" : "VICTORY ▶"}</button>
          ) : (
            <button className="g-btn primary big" autoFocus onClick={() => {
              st.current = { ...bossStart.current }; levelStart.current = { ...bossStart.current }; bump(); setAttempt((a) => a + 1);
              if (c.boss!.phases) { setBossHp(c.boss!.phases.length); setBossLives(extendWon ? 4 : 3); setPhase({ k: "bphase", j: 0 }); } else setPhase({ k: "boss" });
            }}>{fr ? "↺ REVANCHE" : "↺ REMATCH"}</button>
          )}
        </div>
      );
      break;
    case "ending": {
      const perfect = fails === 0 ? c.easterEggs.find((e) => e.trigger === "perfect_run") : undefined;
      body = (
        <Ending ctx={ctx} fails={fails} score={finalScore(c, st.current, fails) + runScore + (bossWon && c.boss?.phases ? bossLives * 250 : 0)}
          slug={c.meta.id} canSubmit={track}
          perfectEgg={perfect ? t(perfect.content) : undefined}
          badge={badge} levels={levels} stars={stars} learned={learned} reports={reports.current}
          maxCombo={combo.current.max} bossWon={bossWon}
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
        <Hud ctx={ctx} state={st.current} levelStart={levelStart.current} goals={phase.k === "intro" || phase.k === "play" || phase.k === "result" || phase.k === "bplay" || phase.k === "bphase" ? goals : []} levelNo={levelNo} levelCount={levels.length}>
          <span className="g-tool-stars" title={fr ? "Étoiles · grade" : "Stars · rank"}>★ {totalStars} · {t(ranksOf(c)[rankIndex(totalStars, maxStars)]!)}</span>
          {toolbar}
        </Hud>
      )}
      {banners[0] && <div className="g-banner-zone"><BannerView ctx={ctx} b={banners[0]} /></div>}
      {(phase.k === "play" || phase.k === "bplay") && comboShow >= 3 && <div className="g-combo" key={comboShow}>COMBO ×{comboShow}</div>}
      <main className="g-stage-area">
        {phase.k === "open" ? body : <div className="g-panel main" key={phase.k}>{body}</div>}
      </main>
      {toast && <div className="g-toast" role="status">{toast}</div>}
    </div>
  );
}

const MOD_FR: Record<Modifier, [string, string, string, string]> = {
  turbo: ["TURBO", "tout va 35 % plus vite", "TURBO", "everything is 35% faster"],
  fog: ["BROUILLARD", "on ne voit pas le haut de l'écran", "FOG", "the top of the screen is hidden"],
  mirror: ["MIROIR", "gauche et droite sont inversées", "MIRROR", "left and right are swapped"],
  quake: ["SÉISME", "l'écran tremble par moments", "QUAKE", "the screen shakes now and then"],
  blackout: ["COUPURE", "la lumière saute par moments", "BLACKOUT", "the lights go out now and then"],
};

/** Étiquettes des modificateurs, avant de jouer. */
function ModTags({ mods, fr }: { mods: Modifier[]; fr: boolean }) {
  if (!mods.length) return null;
  return (
    <p className="g-modtags">
      {mods.map((m) => (
        <span key={m} className={`g-modtag mod-${m}`}><b>{MOD_FR[m][fr ? 0 : 2]}</b> {MOD_FR[m][fr ? 1 : 3]}</span>
      ))}
    </p>
  );
}

/** Cadre qui applique les effets visuels des modificateurs (brouillard, coupures). */
function ModFrame({ mods, children }: { mods: Modifier[]; children: React.ReactNode }) {
  if (!mods.length) return <>{children}</>;
  return <div className={`g-modframe ${mods.map((m) => `mod-${m}`).join(" ")}`}>{children}</div>;
}

/** En-tête de boss (portrait, points de vie, vies) pour les boss à plusieurs formes. */
function BossHead({ ctx, name, hp, max, lives, character, hurt }: {
  ctx: Ctx; name: string; hp: number; max: number; lives: number; character?: ReturnType<Ctx["c"]["characters"]["find"]>; hurt: boolean;
}) {
  return (
    <div className={`g-boss-head${hurt ? " hurt" : ""}`}>
      {character ? <Portrait palette={character.palette} size={96} talking={!hurt} /> : <BossSprite color={ctx.c.design.palette.colors[0]!} hurt={hurt} />}
      <div className="g-boss-info">
        <p className="g-boss-name">{name}</p>
        <div className="g-hp" aria-label={`HP ${hp}/${max}`}>{Array.from({ length: max }, (_, k) => <i key={k} className={k < hp ? "on" : ""} />)}</div>
        <p className="g-lives">{ctx.lang === "fr" ? "Vies" : "Lives"} {"♥".repeat(Math.max(0, lives))}{"♡".repeat(Math.max(0, 3 - Math.max(0, lives)))}</p>
      </div>
    </div>
  );
}

/** « PRÊT ? » puis « GO ! » par-dessus la zone de jeu (n'empêche pas de jouer). */
function ReadyGo({ fr }: { fr: boolean }) {
  return (
    <div className="g-readygo" aria-hidden>
      <span className="r">{fr ? "PRÊT ?" : "READY?"}</span>
      <span className="g">GO !</span>
    </div>
  );
}

/** Nombre qui défile jusqu'à sa valeur. */
function Counter({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 900);
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <b>{String(v).padStart(6, "0")}</b>;
}
