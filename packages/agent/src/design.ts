/**
 * Bibliothèque de game design (design/*.md) : le savoir-faire du studio, découpé en sections.
 * Les prompts n'en reçoivent que les morceaux utiles (le format choisi, les mécaniques du plan, l'archétype du boss),
 * pour rester compacts. Modifier un fichier .md puis lancer : pnpm --filter @press-hire/agent design
 */
import { DESIGN_FILES } from "./design.generated";

export interface DesignSection {
  file: string;
  key: string;
  title: string;
  summary: string;
  body: string;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function parse(): { intros: Record<string, string>; sections: DesignSection[] } {
  const intros: Record<string, string> = {};
  const sections: DesignSection[] = [];
  for (const [file, text] of Object.entries(DESIGN_FILES)) {
    let cur: DesignSection | null = null;
    const intro: string[] = [];
    for (const line of text.split("\n")) {
      const h = line.match(/^(#{1,2}) (.+)$/);
      if (h) {
        if (cur) sections.push(cur);
        // « # Titre » de premier niveau en tête de fichier : simple titre ; plus loin : nouvelle section
        if (h[1] === "#" && !sections.some((s) => s.file === file) && !cur) { intro.push(line); cur = null; continue; }
        const title = h[2]!.trim();
        cur = { file, key: h[1] === "##" ? title.split(/\s/)[0]!.toLowerCase() : slug(title), title, summary: "", body: "" };
        continue;
      }
      if (!cur) { intro.push(line); continue; }
      const sm = line.match(/^Résumé : (.+)$/);
      if (sm && !cur.summary) cur.summary = sm[1]!.trim();
      else cur.body += line + "\n";
    }
    if (cur) sections.push(cur);
    intros[file] = intro.join("\n").trim();
  }
  for (const s of sections) s.body = s.body.trim();
  return { intros, sections };
}

const LIB = parse();

export const designIntro = (file: string) => LIB.intros[file] ?? "";
export const designSections = (file: string) => LIB.sections.filter((s) => s.file === file);
export const designSection = (file: string, key: string) => LIB.sections.find((s) => s.file === file && s.key === key);

/** Formats narratifs disponibles (identifiants). */
export const FORMATS = designSections("formats").map((s) => s.key);
/** Archétypes de boss disponibles (sauf la section des règles). */
export const BOSS_ARCHETYPES = designSections("boss").filter((s) => s.summary).map((s) => s.key);

/** Une ligne par entrée : « - clé : résumé ». */
export const catalog = (file: string) => designSections(file).filter((s) => s.summary).map((s) => `- ${s.key} : ${s.summary}`).join("\n");

const full = (s: DesignSection | undefined) => (s ? `### ${s.title}\n${s.summary ? `${s.summary}\n` : ""}${s.body}` : "");

/** Extrait de la bibliothèque pour l'écriture : seulement ce qui sert à ce jeu. */
export function designBrief(o: { format?: string; mechanics: string[]; bossArchetype?: string; withEntries?: boolean }): string {
  const mechs = [...new Set(o.mechanics)].map((m) => full(designSection("mechanics", m))).filter(Boolean);
  const parts = [
    "BIBLIOTHÈQUE DU STUDIO (extraits utiles à CE jeu) :",
    designIntro("role"),
    designSections("role").map(full).join("\n\n"),
    o.format ? `## Format choisi\n${full(designSection("formats", o.format))}` : "",
    `## Mécaniques de ce jeu\n${mechs.join("\n\n")}`,
    o.withEntries !== false ? `${full(designSection("mechanics", "entries"))}\n\n${full(designSection("mechanics", "modifiers"))}` : "",
    o.bossArchetype ? `## Boss\n${full(designSection("boss", o.bossArchetype))}\n\n${full(designSections("boss").find((s) => !s.summary))}` : "",
    designSections("humor").map(full).join("\n\n"),
    designSections("level-design").map(full).join("\n\n"),
  ];
  return parts.filter(Boolean).join("\n\n");
}
