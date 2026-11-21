/**
 * Offres du futur SaaS. Aujourd'hui, seul le compte « owner » (toi) existe et n'a aucune limite.
 * Les limites sont déjà appliquées partout : ajouter des clients ne demandera pas de réécrire le studio.
 */
export type PlanId = "owner" | "free" | "pro";

export interface Plan {
  id: PlanId;
  label: string;
  /** générations par mois civil */
  generationsPerMonth: number;
  /** jeux en ligne en même temps */
  liveGames: number;
  /** mention « Fait avec PRESS HIRE » en fin de partie */
  badge: boolean;
  /** notifications ntfy */
  notifications: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  owner: { id: "owner", label: "Propriétaire", generationsPerMonth: Infinity, liveGames: Infinity, badge: false, notifications: true },
  free: { id: "free", label: "Gratuit", generationsPerMonth: 3, liveGames: 1, badge: true, notifications: false },
  pro: { id: "pro", label: "Pro", generationsPerMonth: 60, liveGames: 30, badge: false, notifications: true },
};

export const planOf = (id: string | null | undefined): Plan => PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;
