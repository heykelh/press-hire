import { afterEach, describe, expect, it } from "vitest";
import { chain, chainHead, cloudflare, gemini, zai, groq, llmsFromEnv, mistral, qwen, resetBreaker, setFetch, withRetry, type Llm } from "../src";

const ok = (text: string) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const err = (status: number, headers: Record<string, string> = {}) => new Response("{}", { status, headers });

afterEach(() => { setFetch((...a) => fetch(...a)); resetBreaker(); });

describe("fiabilité des modèles", () => {
  it("réessaie après une surcharge 503, puis réussit", async () => {
    let n = 0;
    setFetch(async () => (++n < 3 ? err(503) : ok('{"a":1}')));
    const l = withRetry(mistral("k"), { retries: 2, baseMs: 1 });
    expect(await l.complete("s", "u")).toBe('{"a":1}');
    expect(n).toBe(3);
  });

  it("respecte Retry-After sur un 429", async () => {
    let n = 0;
    setFetch(async () => (++n === 1 ? err(429, { "retry-after": "0.01" }) : ok("{}")));
    const t0 = Date.now();
    await withRetry(mistral("k"), { baseMs: 5000 }).complete("s", "u");
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it("ne réessaie pas un modèle inconnu (404) et passe au suivant", async () => {
    const calls: string[] = [];
    setFetch(async (url) => {
      calls.push(String(url));
      return String(url).includes("mistral") ? err(404) : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
    });
    const c = chain([withRetry(mistral("k"), { baseMs: 1 }), withRetry(gemini("k"), { baseMs: 1 })]);
    expect(await c.complete("s", "u")).toBe('{"ok":true}');
    expect(calls.filter((u) => u.includes("mistral")).length).toBe(1);
  });

  it("met en fin de file un fournisseur qui vient de tomber (disjoncteur)", async () => {
    const order: string[] = [];
    const mk = (name: string, fail: boolean): Llm => ({ name, async complete() { order.push(name); if (fail) throw new Error("503"); return "{}"; } });
    const c = chain([mk("A", true), mk("B", false)]);
    await c.complete("s", "u");
    await c.complete("s", "u");
    expect(order).toEqual(["A", "B", "B"]);
  });

  it("donne un message clair quand tout échoue", async () => {
    setFetch(async () => err(503));
    const c = chain([withRetry(mistral("k"), { retries: 0 })]);
    await expect(c.complete("s", "u")).rejects.toThrow(/Tous les modèles ont échoué .*surchargé \(503\)/);
  });

  it("configure la chaîne depuis l'environnement : Gemini, Qwen, Groq d'abord ; Mistral et NVIDIA en option", () => {
    const names = llmsFromEnv({ MISTRAL_API_KEY: "m", GEMINI_API_KEY: "g", GROQ_API_KEY: "q", QWEN_API_KEY: "w" }).map((l) => l.name);
    expect(names).toEqual([
      "Gemini gemini-flash-latest", "Gemini gemini-flash-lite-latest",
      "Qwen qwen-plus", "Qwen qwen-flash",
      "Groq openai/gpt-oss-120b", "Groq llama-3.3-70b-versatile",
      "Mistral mistral-small-latest",
    ]);
    expect(llmsFromEnv({ GEMINI_API_KEY: "g", DASHSCOPE_API_KEY: "w", LLM_ORDER: "qwen" }).map((l) => l.name)).toEqual(["Qwen qwen-plus", "Qwen qwen-flash"]);
    expect(llmsFromEnv({ GROQ_API_KEY: "q", GROQ_TPM: "250000" })[0]!.tpm).toBe(250000);
  });

  it("ajoute Cloudflare et Z.ai juste après Gemini", async () => {
    const names = llmsFromEnv({ GEMINI_API_KEY: "g", GROQ_API_KEY: "q", CLOUDFLARE_ACCOUNT_ID: "acc", CLOUDFLARE_API_TOKEN: "t", ZAI_API_KEY: "z" }).map((l) => l.name);
    expect(names.slice(2, 5)).toEqual(["Cloudflare @cf/zai-org/glm-4.7-flash", "Cloudflare @cf/openai/gpt-oss-120b", "Z.ai glm-4.7-flash"]);
    let seen: { url: string; body: Record<string, unknown> }[] = [];
    setFetch(async (url, init) => { seen.push({ url: String(url), body: JSON.parse(String(init?.body)) }); return ok("{}"); });
    await cloudflare("acc", "t").complete("s", "u");
    await zai("z").complete("s", "u");
    expect(seen[0]!.url).toBe("https://api.cloudflare.com/client/v4/accounts/acc/ai/v1/chat/completions");
    expect(seen[0]!.body.response_format).toBeUndefined();
    expect(seen[1]!.url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
    expect(seen[1]!.body).toMatchObject({ model: "glm-4.7-flash", thinking: { type: "disabled" } });
  });

  it("appelle Qwen sur l'adresse compatible OpenAI de Singapour, sans mode réflexion", async () => {
    let seen: { url: string; body: Record<string, unknown> } | undefined;
    setFetch(async (url, init) => { seen = { url: String(url), body: JSON.parse(String(init?.body)) }; return ok("{}"); });
    await qwen("k").complete("s", "u");
    expect(seen!.url).toBe("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
    expect(seen!.body).toMatchObject({ model: "qwen-plus", enable_thinking: false, response_format: { type: "json_object" } });
  });

  it("saute Groq sans requête quand l'appel dépasse son quota par minute, sans le marquer en panne", async () => {
    const urls: string[] = [];
    setFetch(async (url) => { urls.push(String(url)); return String(url).includes("groq") ? ok('{"g":1}') : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"w":1}' }] } }] }), { status: 200 }); });
    const big = "x".repeat(40_000); // ≈ 12 500 jetons
    const c = chain([withRetry(groq("k")), withRetry(gemini("k"))]);
    expect(await c.complete("s", big, { task: "write" })).toBe('{"w":1}');
    expect(urls.some((u) => u.includes("groq"))).toBe(false);
    expect(chainHead(c, "write", 12_500)).toBe("Gemini gemini-flash-latest");
    // petite étape : Groq (rapide) passe en premier, et n'a pas été mis en fin de file
    expect(await c.complete("s", "court", { task: "analyze" })).toBe('{"g":1}');
  });

  it("limite la sortie demandée à Groq pour rester sous son quota", async () => {
    let body: Record<string, unknown> = {};
    setFetch(async (_u, init) => { body = JSON.parse(String(init?.body)); return ok("{}"); });
    await groq("k", "llama-3.3-70b-versatile").complete("s", "x".repeat(6400), { task: "critique" });
    expect(body.max_tokens).toBeLessThanOrEqual(12000 - 2000);
    await groq("k").complete("s", "u", { task: "analyze" });
    expect(body).toMatchObject({ model: "openai/gpt-oss-120b", reasoning_effort: "low" });
  });
});
