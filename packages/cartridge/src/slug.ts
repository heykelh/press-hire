/** Slug d'URL lisible et impossible à deviner : entreprise-poste-xxxx */

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // sans 0/o, 1/l

export function slugify(s: string, maxLen = 24): string {
  const base = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // coupe sur un mot entier, jamais au milieu
  let out = "";
  for (const w of base.split("-")) {
    const next = out ? `${out}-${w}` : w;
    if (next.length > maxLen) break;
    out = next;
  }
  return out || base.slice(0, maxLen);
}

export function randomSuffix(n = 4, rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return out;
}

export function makeSlug(company: string, jobTitle: string, rand?: () => number): string {
  const job = slugify(jobTitle, 28)
    .split("-")
    .filter((w) => !["h", "f", "hf", "fh", "m", "w", "x"].includes(w))
    .join("-");
  return [slugify(company, 20), job, randomSuffix(4, rand)].filter(Boolean).join("-");
}
