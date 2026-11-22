"use client";

import { useRef, useState } from "react";

/** Mécaniques proposées (identifiants du format de cartouche) avec un nom et une ligne d'explication. */
const MECHS: Array<{ id: string; label: string; hint: string; arcade?: boolean }> = [
  { id: "catch", label: "ATTRAPE-TOUT", hint: "attraper ce qui tombe, éviter les pièges", arcade: true },
  { id: "whack", label: "TAPE-ALERTE", hint: "taper vite ce qui surgit", arcade: true },
  { id: "gauge", label: "JAUGE", hint: "arrêter l'aiguille dans la bonne zone", arcade: true },
  { id: "sequence", label: "MÉMOIRE", hint: "rejouer une suite dans l'ordre", arcade: true },
  { id: "wheel", label: "ROUE", hint: "faire tourner la roue et choisir" },
  { id: "inspection", label: "INSPECTION", hint: "trouver ce qui cloche dans un document" },
  { id: "investigation", label: "ENQUÊTE", hint: "trouver l'anomalie dans des indices" },
  { id: "triage", label: "TRI", hint: "classer des cartes à gauche ou à droite" },
  { id: "quiz", label: "QUIZ", hint: "questions à choix, avec explications" },
  { id: "dialogue", label: "ÉCHANGE", hint: "choisir ses répliques face à un personnage" },
  { id: "slider", label: "RÉGLAGE", hint: "doser la bonne valeur" },
];

const SKINS = [
  ["", "au choix de l'agent"], ["arcade", "Arcade (grand public)"], ["famicom", "Famicom (rouge et or)"], ["gameboy", "Game Boy (vert)"],
  ["terminal", "Terminal (vert sur noir)"], ["synth", "Synthwave (néon)"], ["corporate", "Corporate (sobre)"], ["comic", "Comic (BD)"],
] as const;

const SCENES = [
  ["", "au choix de l'agent"], ["plains", "Plaines"], ["rooftops", "Toits de la ville"], ["underground", "Souterrain"], ["jungle", "Jungle"],
  ["space", "Espace"], ["lab", "Laboratoire"], ["paris", "Paris"], ["airport", "Aéroport"], ["station", "Gare"],
  ["trading_floor", "Salle des marchés"], ["data_center", "Data center"], ["hospital", "Hôpital"], ["factory", "Usine"],
  ["warehouse", "Entrepôt"], ["headquarters", "Siège"], ["port", "Port"], ["store", "Magasin"],
] as const;

/** Idées d'exemple pour le bouton « idée au hasard ». */
const SAMPLES = [
  { idea: "Un apprenti boulanger doit sauver la fournée du 24 décembre : levain capricieux, four qui chauffe trop, clients pressés. On apprend les vraies étapes du pain.", title: "LA GRANDE FOURNÉE", hero: "apprenti boulanger", scene: "store" },
  { idea: "Une astronaute en mission sur l'ISS gère l'oxygène, les débris spatiaux et les expériences scientifiques. On apprend comment on vit vraiment en orbite.", title: "ORBITE 404", hero: "astronaute de l'ISS", scene: "space" },
  { idea: "Un chat d'appartement organise le cambriolage nocturne du placard à croquettes sans réveiller les humains. Absurde, mais on apprend de vrais comportements félins.", title: "OPÉRATION CROQUETTES", hero: "chat cambrioleur", tone: "absurde" },
  { idea: "Un agent de quai de gare doit faire partir les TGV à l'heure malgré les retards, les colis oubliés et les voyageurs perdus. Les vraies règles de la sécurité ferroviaire.", title: "DÉPART IMMINENT", hero: "agent de quai", scene: "station" },
  { idea: "Un jeune DPO découvre le RGPD en un vendredi : demandes d'accès, fuite de données, consentement des cookies. Satire du bureau, notions exactes.", title: "VENDREDI RGPD", hero: "DPO débutant", tone: "satirique" },
  { idea: "Une apicultrice protège ses ruches pendant une saison : frelons asiatiques, varroa, récolte du miel. On découvre la vie d'une ruche.", title: "RUCHE PANIQUE", hero: "apicultrice", scene: "plains" },
  { idea: "Un collectionneur de cartes Pokémon doit repérer les fausses cartes, les prix gonflés et les arnaques en ligne avant le grand salon.", title: "LE VRAI DU FAUX", hero: "collectionneur averti" },
  { idea: "Une équipe data migre un vieux système vers le cloud en une nuit : pipelines qui cassent, données en double, coûts qui s'envolent.", title: "LA NUIT DE LA MIGRATION", hero: "data engineer de garde", scene: "data_center", tone: "epique" },
];

/** Corps de la requête à partir du formulaire, ou message d'erreur. */
export function ideaBody(fd: FormData): Record<string, unknown> | { error: string } {
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const idea = str("idea");
  if (idea.length < 15) return { error: "Décris ton idée en une ou deux phrases (15 caractères minimum)." };
  return {
    mode: "idea",
    idea: {
      idea,
      title: str("title"),
      hero: str("hero"),
      audience: str("audience") || undefined,
      tone: str("tone") || undefined,
      goal: str("goal") || undefined,
      difficulty: str("difficulty") || undefined,
      levels: Number(str("levels") || 5),
      mechanics: fd.getAll("mechanics").map(String),
      skin: str("skin"),
      scene: str("scene"),
      boss: fd.get("boss") === "on",
      lang: str("lang") || undefined,
    },
    notes: str("notes") || undefined,
  };
}

export default function IdeaFields() {
  const [picked, setPicked] = useState<string[]>([]);
  const [levels, setLevels] = useState(5);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);
  const sceneRef = useRef<HTMLSelectElement>(null);
  const toneRef = useRef<HTMLSelectElement>(null);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function random() {
    const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]!;
    if (ideaRef.current) ideaRef.current.value = s.idea;
    if (titleRef.current) titleRef.current.value = s.title;
    if (heroRef.current) heroRef.current.value = s.hero;
    if (sceneRef.current) sceneRef.current.value = s.scene ?? "";
    if (toneRef.current) toneRef.current.value = s.tone ?? "drole";
  }

  return (
    <>
      <label className="full">
        <span>TON IDÉE</span>
        <textarea
          ref={ideaRef}
          name="idea"
          required
          minLength={15}
          maxLength={4000}
          placeholder="Ex. : un pompier forestier qui doit stopper un incendie en été ; on apprend le triangle du feu, les vents, les pare-feux…"
        />
      </label>
      <div className="full st-row">
        <button type="button" className="st-btn small" onClick={random}>🎲 IDÉE AU HASARD</button>
        <span className="st-hint">Une phrase suffit. Plus tu donnes de détails vrais sur le sujet, plus le jeu sera juste.</span>
      </div>

      <label>
        <span>NOM DU JEU <em>facultatif</em></span>
        <input ref={titleRef} name="title" maxLength={80} placeholder="inventé par l'agent si vide" />
      </label>
      <label>
        <span>LE JOUEUR INCARNE <em>facultatif</em></span>
        <input ref={heroRef} name="hero" maxLength={120} placeholder="ex. une apprentie pâtissière" />
      </label>

      <label>
        <span>PUBLIC</span>
        <select name="audience" defaultValue="grand_public">
          <option value="grand_public">Grand public</option>
          <option value="enfants">Enfants (8–12 ans)</option>
          <option value="pros">Professionnels du sujet</option>
          <option value="equipe">Une équipe interne</option>
        </select>
      </label>
      <label>
        <span>TON</span>
        <select ref={toneRef} name="tone" defaultValue="drole">
          <option value="drole">Drôle</option>
          <option value="absurde">Absurde</option>
          <option value="epique">Épique</option>
          <option value="satirique">Satirique</option>
          <option value="serieux">Sérieux</option>
        </select>
      </label>
      <label>
        <span>OBJECTIF</span>
        <select name="goal" defaultValue="apprendre">
          <option value="apprendre">Faire apprendre</option>
          <option value="divertir">Divertir</option>
          <option value="former">Former à des réflexes</option>
          <option value="promouvoir">Faire découvrir un projet</option>
        </select>
      </label>
      <label>
        <span>DIFFICULTÉ</span>
        <select name="difficulty" defaultValue="normal">
          <option value="facile">Facile</option>
          <option value="normal">Normale</option>
          <option value="dur">Difficile</option>
        </select>
      </label>

      <label>
        <span>NIVEAUX : {levels}</span>
        <input name="levels" type="range" min={3} max={6} value={levels} onChange={(e) => setLevels(Number(e.target.value))} />
      </label>
      <label className="st-check">
        <input name="boss" type="checkbox" defaultChecked />
        <span>BOSS FINAL</span>
      </label>

      <label>
        <span>HABILLAGE</span>
        <select name="skin" defaultValue="">
          {SKINS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>
        <span>DÉCOR DE L&apos;ÉCRAN TITRE</span>
        <select ref={sceneRef} name="scene" defaultValue="">
          {SCENES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>

      <fieldset className="full st-mechs">
        <legend>MÉCANIQUES <em>{picked.length ? `${picked.length} choisie${picked.length > 1 ? "s" : ""}` : "aucune : l'agent choisit selon l'idée"}</em></legend>
        {MECHS.map((m) => (
          <label key={m.id} className={`st-chip${picked.includes(m.id) ? " on" : ""}`} title={m.hint}>
            <input type="checkbox" name="mechanics" value={m.id} checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
            {m.label}{m.arcade ? " ⚡" : ""}
            <small>{m.hint}</small>
          </label>
        ))}
        {picked.length > levels && <p className="st-hint">Plus de mécaniques que de niveaux : les premières choisies passent en priorité.</p>}
      </fieldset>

      <label>
        <span>LANGUE PRINCIPALE</span>
        <select name="lang" defaultValue="fr">
          <option value="fr">Français</option>
          <option value="en">Anglais</option>
        </select>
      </label>
      <label className="full">
        <span>CONSIGNES EN PLUS <em>facultatif</em></span>
        <textarea name="notes" style={{ minHeight: 60 }} placeholder="Ex. : un personnage de grand-mère qui donne des conseils, une fin qui fait sourire, pas de vocabulaire technique…" />
      </label>
    </>
  );
}
