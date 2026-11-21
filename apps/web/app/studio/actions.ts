"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { formatIssues, validateCartridge } from "@press-hire/cartridge";
import { deleteCartridge, getCartridge, saveCartridge, setStatus } from "@/lib/cartridges";
import { liveGamesCount, requireSession } from "@/lib/session";
import { checkPassword, sessionValue, STUDIO_COOKIE, studioConfigured } from "@/lib/studio-auth";

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
  const s = await requireSession();
  const c = await getCartridge(slug, { owner: s.accountId });
  if (!c) return { ok: false, error: "jeu introuvable" };
  if ((await liveGamesCount(s.accountId)) >= s.plan.liveGames)
    return { ok: false, error: `Ton offre (${s.plan.label}) permet ${s.plan.liveGames} jeu(x) en ligne : dépublie-en un d'abord.` };
  const r = validateCartridge(c, { strict: true });
  const errors = r.issues.filter((i) => i.severity === "error");
  if (errors.length) return { ok: false, error: formatIssues(errors) };
  await saveCartridge({ ...c, review: { ...c.review, status: "live" } }, "live", s.accountId);
  revalidatePath("/studio");
  const h = await headers();
  const origin = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  return { ok: true, url: `${origin}/${slug}` };
}

export async function unpublishGame(slug: string): Promise<void> {
  const s = await requireSession();
  await setStatus(slug, "draft", s.accountId);
  revalidatePath("/studio");
}

export async function removeGame(slug: string): Promise<void> {
  const s = await requireSession();
  await deleteCartridge(slug, s.accountId);
  revalidatePath("/studio");
}
