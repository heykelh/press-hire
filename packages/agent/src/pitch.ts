/**
 * Étape « pitch » du directeur créatif : trois variantes de plan (formats, mécaniques, boss différents)
 * sont présentées au modèle, qui choisit la plus juste et la plus fun, puis écrit le concept :
 * accroche, running gag, angle et rebondissement de chaque niveau, noms et répliques du boss.
 * La structure reste celle du plan choisi (garanties de variété et de jouabilité) ; le concept apporte la créativité.
 */
import { z } from "zod";
import { catalog, designSection } from "./design";
import type { JobModel } from "./job";
import { planSummary, type GamePlan } from "./plan";

const S = (max: number) => z.string().min(1).max(max);

export const Pitch = z.object({
  choice: z.number().int().min(0).max(2),
  why: z.string().max(400).default(""),
  title: S(60),
  hook: S(400),
  runningGag: S(300),
  levels: z
    .array(z.object({ order: z.number().int().min(1), angle: S(300), twist: S(300), troll: z.string().max(300).optional() }))
    .max(6)
    .default([]),
  boss: z.object({ name: S(80), phases: z.array(z.object({ intro: S(300) })).max(3).default([]) }).optional(),
  ending: z.string().max(300).optional(),
});
export type Pitch = z.output<typeof Pitch>;

export const PITCH_SYSTEM = `Tu es le directeur créatif d'un studio de jeux rétro 8-bit (style NES) drôles et pédagogiques.
On te donne la fiche d'un métier (ou d'une idée de jeu) et TROIS variantes de structure déjà vérifiées (format, mécaniques, entrées,
modificateurs, boss à plusieurs formes). Tu choisis la variante qui colle le mieux au vrai métier ET qui sera la plus fun,
puis tu écris le CONCEPT du jeu. Tu réponds uniquement en JSON.

Ce qu'on attend :
- choice : 0, 1 ou 2. why : une phrase.
- title : un titre de jeu rétro court et percutant (pas le nom du poste). hook : l'accroche en 1 à 2 phrases.
- runningGag : un gag qui revient à chaque niveau et paie à la fin.
- levels : pour CHAQUE niveau de la variante choisie (order 1, 2…) : angle = la situation concrète du métier jouée (avec un vrai objet
  ou document du métier), twist = le rebondissement à mi-niveau, troll = un moment qui taquine le joueur (facultatif).
- boss : name (drôle, le vrai problème personnifié) et pour chaque phase une intro (ce que fait le boss, en une phrase qui claque).
- ending : la dernière blague.
Sois original : évite les clichés vus mille fois, cherche le détail vrai du métier qui fait rire les pros.`;

export function pitchPrompt(job: JobModel, variants: GamePlan[], source: string, mode: "job" | "idea"): string {
  const formats = [...new Set(variants.map((v) => v.format))]
    .map((f) => designSection("formats", f))
    .filter(Boolean)
    .map((s) => `- ${s!.key} : ${s!.summary}`)
    .join("\n");
  const bosses = [...new Set(variants.map((v) => v.boss?.archetype).filter(Boolean))]
    .map((b) => designSection("boss", b!))
    .filter(Boolean)
    .map((s) => `- ${s!.key} : ${s!.summary}`)
    .join("\n");
  return `${mode === "idea" ? "FICHE DE L'UNIVERS (idée de jeu)" : "FICHE DU POSTE"} :
${JSON.stringify({ ...job, missions: job.missions.map((m) => ({ id: m.id, label: m.label, verb: m.verb, artifacts: m.artifacts.slice(0, 3), pitfalls: m.pitfalls.slice(0, 2), kpi: m.kpi.name })) })}

${source ? `${source.slice(0, 1500)}\n\n` : ""}VARIANTES (une ligne par variante, niveaux dans l'ordre) :
${variants.map((v, i) => `${i}. ${planSummary(v)}`).join("\n")}

Formats :
${formats}
Boss :
${bosses}
Mécaniques :
${catalog("mechanics")}

Choisis une variante et écris le concept en JSON.`;
}

/** Concept rédigé pour le prompt d'écriture. */
export function pitchText(p: Pitch): string {
  return `CONCEPT DU DIRECTEUR CRÉATIF (à suivre ; tu peux l'améliorer, pas l'appauvrir) :
Titre : ${p.title}
Accroche : ${p.hook}
Running gag : ${p.runningGag}
${p.levels.map((l) => `- Niveau ${l.order} : ${l.angle} Rebondissement : ${l.twist}${l.troll ? ` Troll : ${l.troll}` : ""}`).join("\n")}
${p.boss ? `Boss « ${p.boss.name} » : ${p.boss.phases.map((ph, i) => `phase ${i + 1} : ${ph.intro}`).join(" / ")}` : ""}
${p.ending ? `Fin : ${p.ending}` : ""}`;
}
