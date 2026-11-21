/**
 * Lecture d'une offre d'emploi depuis son URL.
 * 1. données structurées JobPosting (présentes sur la plupart des sites d'emploi) ;
 * 2. sinon, texte visible de la page.
 * Une page trop courte signale un mur de connexion ou une page en JavaScript : il faut alors coller le texte.
 */

export interface Offer {
  url?: string;
  title?: string;
  company?: string;
  location?: string;
  contract?: string;
  text: string;
  source: "jsonld" | "html" | "pasted" | "mixed";
  /** texte trop court pour en tirer un jeu */
  thin: boolean;
}

const MAX_TEXT = 14000;
const MIN_TEXT = 500;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", ocirc: "ô", icirc: "î", ucirc: "û", laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—" };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Json = Record<string, unknown>;

function findJobPosting(node: unknown): Json | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findJobPosting(n);
      if (f) return f;
    }
    return null;
  }
  const o = node as Json;
  const t = o["@type"];
  if (t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"))) return o;
  return findJobPosting(o["@graph"]) ?? null;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function parseOfferHtml(html: string, url?: string): Offer {
  let posting: Json | null = null;
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      posting = findJobPosting(JSON.parse(m[1]!.trim()));
      if (posting) break;
    } catch {
      /* JSON-LD mal formé : on continue */
    }
  }
  if (posting) {
    const org = posting.hiringOrganization as Json | undefined;
    const loc = (Array.isArray(posting.jobLocation) ? posting.jobLocation[0] : posting.jobLocation) as Json | undefined;
    const addr = loc?.address as Json | undefined;
    const text = htmlToText(decodeEntities(str(posting.description) ?? "")).slice(0, MAX_TEXT);
    return {
      url,
      title: str(posting.title),
      company: str(org?.name),
      location: str(addr?.addressLocality) ?? str(addr?.addressRegion),
      contract: Array.isArray(posting.employmentType) ? posting.employmentType.join(", ") : str(posting.employmentType),
      text,
      source: "jsonld",
      thin: text.length < MIN_TEXT,
    };
  }
  const title = str(decodeEntities(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? html.match(/<title>([^<]+)/i)?.[1] ?? ""));
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
  const text = htmlToText(main).slice(0, MAX_TEXT);
  return { url, title, text, source: "html", thin: text.length < MIN_TEXT };
}

export async function fetchOffer(url: string, fetchImpl: typeof fetch = fetch): Promise<Offer> {
  const res = await fetchImpl(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
      "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`la page de l'offre répond ${res.status}`);
  const html = await res.text();
  return parseOfferHtml(html, url);
}

/** Combine la page lue et le texte collé : le texte collé fait foi s'il est plus complet. */
export function mergeOffer(fetched: Offer | null, pasted: string | undefined, url?: string): Offer {
  const p = pasted?.trim() ?? "";
  if (!fetched) return { url, text: p.slice(0, MAX_TEXT), source: "pasted", thin: p.length < MIN_TEXT };
  if (!p) return fetched;
  const text = (p.length >= fetched.text.length ? p : `${fetched.text}\n\n${p}`).slice(0, MAX_TEXT);
  return { ...fetched, text, source: "mixed", thin: text.length < MIN_TEXT };
}
