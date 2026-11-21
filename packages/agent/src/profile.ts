/**
 * Profil du candidat : rempli une fois dans le studio, injecté tel quel dans chaque cartouche.
 * Le modèle de langue ne voit que les preuves (titre, lien, ce qu'elles démontrent), jamais l'e-mail.
 */
import { z } from "zod";

const I18n = z.object({ fr: z.string().min(1), en: z.string().min(1) });

export const Proof = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  label: z.string().min(1).max(40),
  url: z.string().url(),
  /** ce que ce projet démontre, en une ou deux phrases : sert à le relier aux exigences des offres */
  about: z.string().min(1).max(400),
  fact: I18n.optional(),
});
export type Proof = z.infer<typeof Proof>;

export const CandidateProfile = z.object({
  name: z.string().min(1).max(60),
  headline: I18n,
  email: z.string().min(3),
  cv: z.string().min(1),
  portfolio: z.string().min(1),
  linkedin: z.string().optional(),
  proofs: z.array(Proof).min(1).max(12),
});
export type CandidateProfile = z.infer<typeof CandidateProfile>;

/** Profil de départ (emplacements à remplir dans le studio). */
export const DEFAULT_PROFILE: CandidateProfile = {
  name: "<NOM>",
  headline: { fr: "Data & IA", en: "Data & AI" },
  email: "<EMAIL>",
  cv: "<URL_CV>",
  portfolio: "https://heykelhachiche.com",
  proofs: [
    {
      id: "proof_palier",
      label: "PALIER",
      url: "https://palier-sncf.vercel.app",
      about: "Analyse des prix TGV sur l'Open Data SNCF : collecte, nettoyage, SQL, Python, tableaux de bord.",
    },
    {
      id: "proof_lastseat",
      label: "LAST SEAT",
      url: "https://last-seat-game.vercel.app",
      about: "Jeu web rétro sur la tarification ferroviaire : rendre un sujet métier pédagogique et jouable.",
    },
    {
      id: "proof_spinthestack",
      label: "Spin the Stack",
      url: "https://spin-the-stack.vercel.app",
      about: "Jeu de roues rétro sur les métiers de la data : culture data, outils, satire bienveillante du travail.",
    },
  ],
};

export const hasPlaceholders = (p: CandidateProfile) => /<[A-Z_]{2,}>/.test(JSON.stringify(p));
