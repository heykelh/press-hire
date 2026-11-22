/**
 * Fiche entreprise : quelques faits publics et vérifiables sur l'employeur, pour personnaliser le jeu
 * (produits, activité, ville, histoire) sans rien inventer.
 * Sources : la page Wikipédia de l'entreprise (en vérifiant que c'est bien une entreprise, pas un homonyme)
 * et la page d'accueil de son site officiel quand l'offre la donne. Jamais d'avis d'employés ni de forums.
 */
export interface CompanySource {
  url: string;
  kind: "wikipedia" | "site";
  title: string;
  text: string;
}

export interface CompanyFacts {
  name: string;
  sources: CompanySource[];
}

const UA = "PRESS-HIRE/0.7 (generateur de jeux pedagogiques; https://press-hire.vercel.app)";
const BUSINESS = /entreprise|soci[ée]t[ée]|groupe|compagnie|banque|assureur|mutuelle|start-?up|enseigne|op[ée]rateur|constructeur|fabricant|cabinet|[ée]tablissement public|organisme|administration|minist[èe]re|r[ée]seau|plateforme|distributeur|transporteur|laboratoire|company|corporation|firm|bank|insurer|retailer|manufacturer|airline|group/i;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function getJson(fetchImpl: typeof fetch, url: string): Promise<unknown> {
  const r = await fetchImpl(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/** Page Wikipédia (fr puis en) dont le titre correspond au nom et qui décrit bien une entreprise ou une organisation. */
async function wikipedia(name: string, fetchImpl: typeof fetch): Promise<CompanySource | null> {
  for (const lang of ["fr", "en"]) {
    try {
      const search = (await getJson(fetchImpl, `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=4&origin=*&srsearch=${encodeURIComponent(name)}`)) as {
        query?: { search?: Array<{ title: string }> };
      };
      const n = norm(name);
      const hits = (search.query?.search ?? []).filter((h) => norm(h.title).startsWith(n) || norm(h.title).includes(n));
      for (const h of hits.slice(0, 2)) {
        const sum = (await getJson(fetchImpl, `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(h.title.replace(/ /g, "_"))}`)) as {
          type?: string; title?: string; description?: string; extract?: string; content_urls?: { desktop?: { page?: string } };
        };
        if (sum.type === "disambiguation" || !sum.extract) continue;
        const about = `${sum.description ?? ""} ${sum.extract.slice(0, 400)}`;
        if (!BUSINESS.test(about)) continue; // un homonyme (fruit, ville, personne…) : on ne prend pas
        return {
          url: sum.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(h.title)}`,
          kind: "wikipedia",
          title: sum.title ?? h.title,
          text: `${sum.description ? `${sum.description}. ` : ""}${sum.extract}`.slice(0, 1800),
        };
      }
    } catch {
      /* Wikipédia indisponible : on continue sans */
    }
  }
  return null;
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const meta = (html: string, key: string) =>
  html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']{10,400})`, "i"))?.[1]
  ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']{10,400})["'][^>]+(?:name|property)=["']${key}["']`, "i"))?.[1];

/** Page d'accueil du site officiel : titre, description, grands titres (ce que l'entreprise dit d'elle-même). */
async function site(url: string, fetchImpl: typeof fetch): Promise<CompanySource | null> {
  try {
    const home = new URL(url).origin;
    const r = await fetchImpl(home, { headers: { "user-agent": "Mozilla/5.0 (compatible; PRESS-HIRE/0.7)", accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 400_000);
    const title = decode(html.match(/<title[^>]*>([^<]{2,160})/i)?.[1] ?? "").trim();
    const desc = decode(meta(html, "description") ?? meta(html, "og:description") ?? "").trim();
    const heads = [...html.matchAll(/<h[12][^>]*>([\s\S]{3,200}?)<\/h[12]>/gi)]
      .map((m) => decode(m[1]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()))
      .filter((x) => x.length > 3 && x.length < 140)
      .slice(0, 8);
    const text = [desc, ...heads].filter(Boolean).join(" · ").slice(0, 1200);
    if (!text) return null;
    return { url: home, kind: "site", title: title || home, text };
  } catch {
    return null;
  }
}

export async function researchCompany(name: string | undefined, opts: { companyUrl?: string; fetchImpl?: typeof fetch } = {}): Promise<CompanyFacts | null> {
  const clean = name?.replace(/\s+(SAS|SA|SARL|SE|Group|Groupe)$/i, "").trim();
  if (!clean || clean.length < 2) return null;
  const f = opts.fetchImpl ?? fetch;
  const [w, s] = await Promise.all([wikipedia(clean, f), opts.companyUrl ? site(opts.companyUrl, f) : Promise.resolve(null)]);
  const sources = [w, s].filter((x): x is CompanySource => !!x);
  return sources.length ? { name: clean, sources } : null;
}

/** Bloc pour les prompts : les sources, numérotées, avec les règles d'usage. */
export function companyText(c: CompanyFacts): string {
  return `FICHE ENTREPRISE (sources publiques ; seuls ces faits peuvent servir, rien d'autre sur l'entreprise) :
${c.sources.map((s, i) => `[${i + 1}] ${s.kind === "wikipedia" ? "Wikipédia" : "Site officiel"} — ${s.title} — ${s.url}\n${s.text}`).join("\n\n")}

RÈGLES : utilise 1 à 3 faits VRAIS de cette fiche comme clins d'œil (un produit, un métier, une ville, un chiffre public, une date)
dans les documents, les noms de dossiers ou les répliques ; jamais de logo, jamais d'avis d'employés, jamais de moquerie de l'entreprise,
de ses clients ou de ses salariés, rien d'inventé. Remplis about.facts (2 à 3 faits courts, chacun avec l'URL exacte de sa source ci-dessus).
Si la fiche ne suffit pas, laisse about vide plutôt que de deviner.`;
}
