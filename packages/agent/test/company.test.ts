import { describe, expect, it } from "vitest";
import { companyText, keepSourcedFacts, researchCompany } from "../src";

const json = (x: unknown) => new Response(JSON.stringify(x), { status: 200, headers: { "content-type": "application/json" } });

/** Faux Wikipédia : « Orange » renvoie d'abord le fruit (homonyme), puis l'entreprise. */
const wiki: typeof fetch = async (input) => {
  const url = String(input);
  if (url.includes("list=search")) return json({ query: { search: [{ title: "Orange (fruit)" }, { title: "Orange (entreprise)" }] } });
  if (url.includes("Orange_(fruit)")) return json({ type: "standard", title: "Orange (fruit)", description: "agrume", extract: "L'orange est le fruit de l'oranger, un agrume." });
  if (url.includes("Orange_(entreprise)"))
    return json({
      type: "standard", title: "Orange (entreprise)", description: "entreprise française de télécommunications",
      extract: "Orange est une société française de télécommunications.", content_urls: { desktop: { page: "https://fr.wikipedia.org/wiki/Orange_(entreprise)" } },
    });
  if (url.startsWith("https://www.orange.example")) return new Response('<html><head><title>Orange</title><meta name="description" content="Opérateur télécom : fibre, 5G et services."></head><body><h1>La fibre partout</h1></body></html>');
  return new Response("", { status: 404 });
};

describe("fiche entreprise", () => {
  it("écarte l'homonyme et garde la page de l'entreprise, plus le site officiel", async () => {
    const f = await researchCompany("Orange SA", { fetchImpl: wiki, companyUrl: "https://www.orange.example/jobs/123" });
    expect(f?.name).toBe("Orange");
    expect(f?.sources.map((s) => s.kind)).toEqual(["wikipedia", "site"]);
    expect(f?.sources[0]!.url).toBe("https://fr.wikipedia.org/wiki/Orange_(entreprise)");
    expect(f?.sources[1]!.text).toContain("fibre");
    expect(companyText(f!)).toContain("rien d'inventé");
  });

  it("ne renvoie rien sans source fiable", async () => {
    const none: typeof fetch = async () => json({ query: { search: [] } });
    expect(await researchCompany("Inconnue Industries", { fetchImpl: none })).toBeNull();
    const down: typeof fetch = async () => { throw new Error("réseau"); };
    expect(await researchCompany("Orange", { fetchImpl: down })).toBeNull();
  });

  it("supprime les faits dont la source ne vient pas de la recherche", () => {
    const brief = {
      about: {
        company: "Orange",
        facts: [
          { text: { fr: "Opérateur télécom", en: "Telecom operator" }, source: "https://fr.wikipedia.org/wiki/Orange_(entreprise)" },
          { text: { fr: "Fondée sur Mars", en: "Founded on Mars" }, source: "https://invente.example" },
        ],
      },
    };
    const out = keepSourcedFacts(structuredClone(brief), new Set(["https://fr.wikipedia.org/wiki/Orange_(entreprise)"]), "Orange");
    expect((out.about as { facts: unknown[] }).facts).toHaveLength(1);
    expect(keepSourcedFacts(structuredClone(brief), new Set(), undefined).about).toBeUndefined();
  });
});
