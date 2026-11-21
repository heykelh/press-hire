import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const STUDIO_COOKIE = "ph_studio";

const token = (password: string) => createHmac("sha256", password).update("press-hire-studio-v1").digest("hex");

export const studioConfigured = () => (process.env.STUDIO_PASSWORD ?? "").length >= 8;

export function checkPassword(candidate: string): boolean {
  const pw = process.env.STUDIO_PASSWORD ?? "";
  if (pw.length < 8) return false;
  const a = Buffer.from(token(candidate)), b = Buffer.from(token(pw));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Valeur du cookie de session pour le mot de passe configuré. */
export const sessionValue = () => token(process.env.STUDIO_PASSWORD ?? "");

export function isStudioCookie(value: string | undefined): boolean {
  if (!value || !studioConfigured()) return false;
  const a = Buffer.from(value), b = Buffer.from(sessionValue());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isStudio(): Promise<boolean> {
  return isStudioCookie((await cookies()).get(STUDIO_COOKIE)?.value);
}

export async function requireStudio(): Promise<void> {
  if (!(await isStudio())) throw new Error("accès réservé au studio");
}
