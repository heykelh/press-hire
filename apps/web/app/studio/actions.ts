"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { CandidateProfile } from "@press-hire/agent";
import { formatIssues, validateCartridge } from "@press-hire/cartridge";
import { deleteCartridge, getCartridge, saveCartridge, setStatus } from "@/lib/cartridges";
import { saveProfile } from "@/lib/settings";
import { checkPassword, requireStudio, sessionValue, STUDIO_COOKIE, studioConfigured } from "@/lib/studio-auth";

export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  if (!studioConfigured()) return { error: "STUDIO_PASSWORD n'est pas réglé sur Vercel (8 caractères minimum)." };
  if (!checkPassword(String(form.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 800)); // freine les essais en série
    return { error: "Mot de passe incorrect." };
  }
  (await cookies()).set(STUDIO_COOKIE, sessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  revalidatePath("/studio");
  return {};
}

export async function logout(): Promise<void> {
  (await cookies()).delete(STUDIO_COOKIE);
  revalidatePath("/studio");
}

export async function publishGame(slug: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requireStudio();
  const c = await getCartridge(slug, { drafts: true });
  if (!c) return { ok: false, error: "jeu introuvable" };
  const r = validateCartridge(c, { strict: true });
  const errors = r.issues.filter((i) => i.severity === "error");
  if (errors.length) {
    const placeholders = errors.some((i) => i.rule === "placeholder");
    return {
      ok: false,
      error: placeholders
        ? "Ton profil contient encore des emplacements (<NOM>, <EMAIL>, <URL_CV>) : complète-le dans Profil, puis régénère ou mets à jour ce jeu."
        : formatIssues(errors),
    };
  }
  await saveCartridge({ ...c, review: { ...c.review, status: "live" } }, "live");
  revalidatePath("/studio");
  const h = await headers();
  const origin = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  return { ok: true, url: `${origin}/${slug}` };
}

/** Réinjecte le profil actuel dans un brouillon (après avoir complété son profil). */
export async function refreshProfile(slug: string): Promise<{ ok: boolean; error?: string }> {
  await requireStudio();
  const c = await getCartridge(slug, { drafts: true });
  if (!c) return { ok: false, error: "jeu introuvable" };
  const { getProfile } = await import("@/lib/settings");
  const p = await getProfile();
  const used = new Set(c.ending.skillsUnlocked.map((s) => s.proofId));
  const next = {
    ...c,
    candidate: {
      ...c.candidate,
      name: p.name,
      headline: p.headline,
      links: { cv: p.cv, portfolio: p.portfolio, email: p.email, ...(p.linkedin ? { linkedin: p.linkedin } : {}) },
      proofs: c.candidate.proofs.map((old) => {
        const np = p.proofs.find((x) => x.id === old.id);
        return np && used.has(old.id) ? { ...old, label: np.label, url: np.url } : old;
      }),
    },
    ending: {
      ...c.ending,
      cta: c.ending.cta.map((b) =>
        b.type === "cv" ? { ...b, url: p.cv }
        : b.type === "contact" ? { ...b, url: p.email.startsWith("mailto:") ? p.email : `mailto:${p.email}` }
        : b.type === "portfolio" ? { ...b, url: p.portfolio }
        : b.type === "linkedin" && p.linkedin ? { ...b, url: p.linkedin } : b),
    },
  };
  await saveCartridge(next, "draft");
  revalidatePath("/studio");
  return { ok: true };
}

export async function unpublishGame(slug: string): Promise<void> {
  await requireStudio();
  await setStatus(slug, "draft");
  revalidatePath("/studio");
}

export async function removeGame(slug: string): Promise<void> {
  await requireStudio();
  await deleteCartridge(slug);
  revalidatePath("/studio");
}

export async function saveProfileAction(json: string): Promise<{ ok: boolean; error?: string }> {
  await requireStudio();
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "formulaire illisible" };
  }
  const r = CandidateProfile.safeParse(raw);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" · ") };
  await saveProfile(r.data);
  revalidatePath("/studio");
  return { ok: true };
}
