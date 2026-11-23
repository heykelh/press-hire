import type { Issue } from "@press-hire/cartridge";

/** Noms lisibles des listes que le schéma impose dans les mécaniques. */
const LIST_FR: Record<string, string> = {
  cases: "dossiers", items: "objets", questions: "questions", rounds: "manches", notes: "notes",
  lanes: "colonnes", steps: "étapes", options: "choix", targets: "cibles", cards: "cartes",
  phases: "phases", levels: "niveaux", concepts: "notions", fields: "champs", answers: "réponses",
  waves: "vagues", slots: "emplacements", pairs: "paires", lines: "répliques",
};

/** « levels.4.mechanic.cases » → « niveau 5 » ; « boss.phases.1… » → « boss, phase 2 ». */
function where(path: string): string {
  const lv = path.match(/^levels[.[](\d+)/);
  if (lv) return `niveau ${Number(lv[1]) + 1}`;
  const ph = path.match(/^boss[.[]phases[.[](\d+)/);
  if (ph) return `boss, phase ${Number(ph[1]) + 1}`;
  if (path.startsWith("boss")) return "boss";
  return path || "jeu";
}

/** Une erreur de contrôle expliquée en une phrase pour un humain. */
export function explainIssue(i: Issue): string {
  const at = where(i.path);
  const list = LIST_FR[i.path.split(/[.[\]]/).filter(Boolean).pop() ?? ""] ?? "éléments";
  let m = i.message.match(/expected array to have >=(\d+) items/);
  const de = /^[aeéèêiouy]/i.test(list) ? `d'${list}` : `de ${list}`;
  if (m) return `${at} : le modèle a écrit trop peu ${de} (il en faut au moins ${m[1]})`;
  m = i.message.match(/expected array to have <=(\d+) items/);
  if (m) return `${at} : trop ${de} (${m[1]} au maximum)`;
  m = i.message.match(/expected string to have <=(\d+) characters/);
  if (m) return `${at} : texte trop long (${m[1]} caractères au maximum)`;
  if (/Invalid input: expected (\w+), received undefined/.test(i.message)) return `${at} : un champ obligatoire manque (${i.path})`;
  if (i.rule === "json") return "la réponse du modèle n'était pas du JSON lisible";
  if (i.rule === "balance-unwinnable") return `${at} : impossible à gagner, même en jouant parfaitement`;
  if (i.rule === "naive-win") return `${at} : se gagne sans réfléchir`;
  if (i.rule === "must-coverage") return `une compétence obligatoire de l'offre n'est jouée nulle part`;
  return `${at} : ${i.message.slice(0, 140)}`;
}

/** Les raisons d'un échec, sans doublons, en quelques lignes. */
export function explainIssues(issues: Issue[], max = 3): string[] {
  return [...new Set(issues.filter((i) => i.severity === "error").map(explainIssue))].slice(0, max);
}
