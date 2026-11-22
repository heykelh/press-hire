/**
 * Fournisseurs de modèles de langue, avec trois protections contre les pannes :
 *  1. nouvel essai automatique sur surcharge (503), quota (429) ou réseau, avec attente croissante et respect de Retry-After ;
 *  2. chaîne de secours : si un fournisseur reste indisponible, on passe au suivant (autre modèle, autre entreprise) ;
 *  3. disjoncteur : un fournisseur qui vient de tomber passe en fin de file pendant 5 minutes.
 * Les fournisseurs à petit quota par minute (Groq gratuit) déclarent leur limite : un appel trop gros
 * les saute sans requête, et les petites étapes (analyse, relecture) passent par eux en priorité.
 * Les identifiants de modèles changent souvent : ils se règlent par variables d'environnement.
 */

export interface CallOpts {
  /** étape du pipeline (analyze, write, critique, revise, repair) : utile aux modèles simulés et aux journaux */
  task?: string;
  temperature?: number;
}

export interface Llm {
  name: string;
  /** jetons par minute autorisés (entrée + sortie) : au-delà, l'appel saute ce fournisseur sans requête */
  tpm?: number;
  /** fournisseur très rapide, à essayer d'abord pour les petites étapes */
  fast?: boolean;
  /** renvoie le texte brut de la réponse (censé être du JSON) */
  complete(system: string, user: string, opts?: CallOpts): Promise<string>;
}

export class LlmError extends Error {
  /** vrai quand l'appel a été sauté (trop gros pour ce fournisseur) : le fournisseur n'est pas en panne */
  skipped = false;
  constructor(message: string, readonly retryable: boolean, readonly status?: number, readonly retryAfterMs?: number) {
    super(message);
  }
}

/** Estimation grossière du nombre de jetons (français + JSON : environ 3,2 caractères par jeton). */
export const estimateTokens = (s: string) => Math.ceil(s.length / 3.2);
/** Sortie minimale à réserver selon l'étape. */
const MIN_OUT: Record<string, number> = { write: 7000, revise: 7000, repair: 7000, analyze: 1800, critique: 1200, check: 800 };
/** Étapes courtes où l'on préfère le fournisseur le plus rapide. */
const SMALL_TASKS = new Set(["analyze", "critique", "check"]);

const TIMEOUT = 150_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Message court et lisible à partir d'une réponse d'erreur. */
function reason(status: number): string {
  if (status === 503 || status === 529) return "surchargé";
  if (status === 429) return "quota atteint";
  if (status === 404) return "modèle inconnu (vérifie la variable *_MODEL)";
  if (status === 401 || status === 403) return "clé refusée";
  if (status === 400) return "requête refusée";
  return `erreur ${status}`;
}

let fetchImpl: typeof fetch = (...a) => fetch(...a);
/** Pour les tests : remplace fetch. */
export function setFetch(f: typeof fetch) { fetchImpl = f; }

async function post(url: string, headers: Record<string, string>, body: unknown, who: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch (e) {
    const timeout = (e as Error).name === "TimeoutError";
    throw new LlmError(`${who} : ${timeout ? "trop lent (délai dépassé)" : "injoignable"}`, true);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
    const ra = Number(res.headers.get("retry-after"));
    throw new LlmError(
      `${who} : ${reason(res.status)} (${res.status})`,
      res.status === 429 || res.status >= 500 || res.status === 404 || res.status === 408,
      res.status,
      Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined,
    ) as LlmError & { detail?: string };
  }
  return res.json();
}

/**
 * Nouvel essai sur les erreurs passagères (surcharge, quota par minute, réseau).
 * Pas de nouvel essai sur 404 (modèle inconnu) ni 401/403 (clé) : on passe directement au fournisseur suivant.
 */
export function withRetry(llm: Llm, opts: { retries?: number; baseMs?: number; maxWaitMs?: number } = {}): Llm {
  const retries = opts.retries ?? 2;
  const base = opts.baseMs ?? 2500;
  const maxWait = opts.maxWaitMs ?? 20_000;
  return {
    name: llm.name,
    tpm: llm.tpm,
    fast: llm.fast,
    async complete(system, user, o) {
      for (let attempt = 0; ; attempt++) {
        try {
          return await llm.complete(system, user, o);
        } catch (e) {
          const err = e as LlmError;
          const passing = err instanceof LlmError && err.retryable && !err.skipped && err.status !== 404;
          if (!passing || attempt >= retries) throw e;
          const wait = Math.min(maxWait, err.retryAfterMs ?? base * 2 ** attempt * (0.75 + Math.random() * 0.5));
          await sleep(wait);
        }
      }
    },
  };
}

/* ---------------- fournisseurs ---------------- */

export function gemini(apiKey: string, model = "gemini-flash-latest"): Llm {
  return {
    name: `Gemini ${model}`,
    async complete(system, user, opts) {
      const data = (await post(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { "x-goog-api-key": apiKey },
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", temperature: opts?.temperature ?? 0.9, maxOutputTokens: 32768 },
        },
        `Gemini ${model}`,
      )) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }> };
      const cand = data.candidates?.[0];
      const text = cand?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
      if (!text) throw new LlmError(`Gemini ${model} : réponse vide (${cand?.finishReason ?? "sans raison"})`, true);
      return text;
    },
  };
}

/** Toute API compatible OpenAI (Groq, Qwen, OpenRouter, Mistral, NVIDIA…). */
export function openaiCompatible(o: {
  label: string; baseUrl: string; apiKey: string; model: string; maxTokens?: number; jsonMode?: boolean;
  headers?: Record<string, string>; extraBody?: Record<string, unknown>; tpm?: number; fast?: boolean;
}): Llm {
  const name = `${o.label} ${o.model}`;
  return {
    name,
    tpm: o.tpm,
    fast: o.fast,
    async complete(system, user, opts) {
      let maxTokens = o.maxTokens ?? 16000;
      if (o.tpm) {
        const input = estimateTokens(system) + estimateTokens(user);
        const need = MIN_OUT[opts?.task ?? ""] ?? 2000;
        if (input + need > o.tpm) {
          const err = new LlmError(`${name} : appel trop gros pour son quota (≈${Math.round((input + need) / 1000)}k jetons, limite ${Math.round(o.tpm / 1000)}k/min)`, false);
          err.skipped = true;
          throw err;
        }
        maxTokens = Math.min(maxTokens, o.tpm - input);
      }
      const data = (await post(
        `${o.baseUrl.replace(/\/+$/, "")}/chat/completions`,
        { authorization: `Bearer ${o.apiKey}`, ...(o.headers ?? {}) },
        {
          model: o.model,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          ...(o.jsonMode === false ? {} : { response_format: { type: "json_object" } }),
          temperature: opts?.temperature ?? 0.8,
          max_tokens: maxTokens,
          ...(o.extraBody ?? {}),
        },
        name,
      )) as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text) throw new LlmError(`${name} : réponse vide (${data.choices?.[0]?.finish_reason ?? "?"})`, true);
      return text;
    },
  };
}

/**
 * Groq : très rapide, gratuit sans carte, mais petit quota par minute sur le plan gratuit.
 * Limites gratuites publiées (jetons par minute) ; GROQ_TPM les remplace (ex. 250000 sur le plan payant).
 */
export const GROQ_FREE_TPM: Record<string, number> = {
  "openai/gpt-oss-120b": 8000,
  "openai/gpt-oss-20b": 8000,
  "qwen/qwen3.8-27b": 8000,
  "llama-3.3-70b-versatile": 12000,
  "groq/compound": 70000,
};
export const groq = (apiKey: string, model = "openai/gpt-oss-120b", tpm?: number) =>
  openaiCompatible({
    label: "Groq", baseUrl: "https://api.groq.com/openai/v1", apiKey, model, maxTokens: 16000, fast: true,
    tpm: tpm ?? GROQ_FREE_TPM[model] ?? 8000,
    // modèles qui raisonnent : on limite la réflexion pour garder le quota pour la réponse
    extraBody: model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : undefined,
  });

/**
 * Qwen (Alibaba Cloud Model Studio, région Singapour) : quota gratuit à l'ouverture du compte, propre à chaque modèle.
 * QWEN_BASE_URL change la région (ex. https://dashscope-us.aliyuncs.com/compatible-mode/v1).
 */
export const qwen = (apiKey: string, model = "qwen-plus", baseUrl = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1") =>
  openaiCompatible({ label: "Qwen", baseUrl, apiKey, model, maxTokens: 16000, extraBody: { enable_thinking: false } });

/**
 * Cloudflare Workers AI : 10 000 « neurons » gratuits par jour, sans carte.
 * Avec GLM-4.7-Flash, une écriture de jeu coûte environ 500 neurons : une dizaine de jeux par jour.
 */
export const cloudflare = (accountId: string, apiToken: string, model = "@cf/zai-org/glm-4.7-flash") =>
  openaiCompatible({
    label: "Cloudflare", baseUrl: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1`,
    apiKey: apiToken, model, maxTokens: 16000, jsonMode: false,
  });

/** Z.ai (GLM) : modèles « Flash » gratuits en permanence ; une seule requête à la fois sur l'offre gratuite. */
export const zai = (apiKey: string, model = "glm-4.7-flash") =>
  openaiCompatible({
    label: "Z.ai", baseUrl: "https://api.z.ai/api/paas/v4", apiKey, model, maxTokens: 16000,
    extraBody: { thinking: { type: "disabled" } },
  });

export const openrouter = (apiKey: string, model: string) =>
  openaiCompatible({
    label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", apiKey, model, maxTokens: 16000,
    headers: { "HTTP-Referer": "https://press-hire.vercel.app", "X-Title": "PRESS HIRE" },
  });

/** Facultatifs (payant pour Mistral) : gardés pour qui a déjà une clé. */
export const mistral = (apiKey: string, model = "mistral-medium-latest") =>
  openaiCompatible({ label: "Mistral", baseUrl: "https://api.mistral.ai/v1", apiKey, model, maxTokens: 24000 });
export const nvidia = (apiKey: string, model = "meta/llama-3.3-70b-instruct") =>
  openaiCompatible({ label: "NVIDIA", baseUrl: "https://integrate.api.nvidia.com/v1", apiKey, model, maxTokens: 16000, jsonMode: false });

/* ---------------- chaîne de secours et disjoncteur ---------------- */

/** Fournisseurs tombés récemment (mémoire de l'instance) : ils passent en fin de file. */
const tripped = new Map<string, number>();
const TRIP_MS = 5 * 60_000;
export const resetBreaker = () => tripped.clear();

/** Essaie chaque fournisseur jusqu'au premier qui répond ; ceux qui viennent d'échouer passent en dernier. */
export function chain(llms: Llm[], onFallback?: (from: string, err: string) => void): Llm & { members: Llm[] } {
  if (!llms.length) throw new LlmError("aucun modèle configuré : ajoute GEMINI_API_KEY, CLOUDFLARE_API_TOKEN ou ZAI_API_KEY", false);
  return {
    name: llms.map((l) => l.name).join(" → "),
    members: llms,
    async complete(system, user, opts) {
      const now = Date.now();
      const small = SMALL_TASKS.has(opts?.task ?? "");
      const down = (l: Llm) => Number((tripped.get(l.name) ?? 0) > now);
      const order = [...llms].sort((a, b) => down(a) - down(b) || (small ? Number(!!b.fast) - Number(!!a.fast) : 0));
      let last: unknown;
      for (const l of order) {
        try {
          const out = await l.complete(system, user, opts);
          tripped.delete(l.name);
          return out;
        } catch (e) {
          // un appel sauté (trop gros) n'est ni une panne ni un repli à signaler
          if ((e as LlmError).skipped) { last ??= e; continue; }
          last = e;
          tripped.set(l.name, Date.now() + TRIP_MS);
          onFallback?.(l.name, (e as Error).message);
        }
      }
      const msg = (last as Error)?.message ?? String(last);
      throw new LlmError(`Tous les modèles ont échoué (dernier : ${msg}). Réessaie dans quelques minutes.`, true);
    },
  };
}

/** Nom affiché du premier fournisseur qui sera essayé. */
export const chainHead = (l: Llm & { members?: Llm[] }, task?: string, size = 0) => {
  const m = l.members?.find((x) => !x.tpm || size + (MIN_OUT[task ?? ""] ?? 2000) <= x.tpm);
  return m?.name ?? l.name.split(" → ")[0]!;
};

/**
 * Fournisseurs configurés par l'environnement. Ordre par défaut :
 *   Gemini (GEMINI_API_KEY) → Cloudflare (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN) → Z.ai (ZAI_API_KEY)
 *   → Qwen (QWEN_API_KEY) → Groq (GROQ_API_KEY, petites étapes seulement en gratuit)
 *   → OpenRouter (OPENROUTER_API_KEY + OPENROUTER_MODEL) → Mistral, NVIDIA (facultatifs).
 * LLM_ORDER change l'ordre (ex. « qwen,gemini,groq ») ; chaque *_MODEL accepte plusieurs modèles séparés par des virgules.
 */
export const DEFAULT_ORDER = ["gemini", "cloudflare", "zai", "qwen", "groq", "openrouter", "mistral", "nvidia"];
export function llmsFromEnv(env: Record<string, string | undefined> = process.env, opts: { retry?: boolean } = {}): Llm[] {
  const list = (v: string | undefined, def: string[]) => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : def);
  const qwenKey = env.QWEN_API_KEY || env.DASHSCOPE_API_KEY;
  const groqTpm = Number(env.GROQ_TPM) || undefined;
  const by: Record<string, Llm[]> = {
    gemini: env.GEMINI_API_KEY ? list(env.GEMINI_MODEL, ["gemini-flash-latest", "gemini-flash-lite-latest"]).map((m) => gemini(env.GEMINI_API_KEY!, m)) : [],
    cloudflare: env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN
      ? list(env.CLOUDFLARE_MODEL, ["@cf/zai-org/glm-4.7-flash", "@cf/openai/gpt-oss-120b"]).map((m) => cloudflare(env.CLOUDFLARE_ACCOUNT_ID!, env.CLOUDFLARE_API_TOKEN!, m))
      : [],
    zai: env.ZAI_API_KEY ? list(env.ZAI_MODEL, ["glm-4.7-flash"]).map((m) => zai(env.ZAI_API_KEY!, m)) : [],
    qwen: qwenKey ? list(env.QWEN_MODEL, ["qwen-plus", "qwen-flash"]).map((m) => qwen(qwenKey, m, env.QWEN_BASE_URL || undefined)) : [],
    groq: env.GROQ_API_KEY ? list(env.GROQ_MODEL, ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]).map((m) => groq(env.GROQ_API_KEY!, m, groqTpm)) : [],
    openrouter: env.OPENROUTER_API_KEY && env.OPENROUTER_MODEL ? list(env.OPENROUTER_MODEL, []).map((m) => openrouter(env.OPENROUTER_API_KEY!, m)) : [],
    mistral: env.MISTRAL_API_KEY ? list(env.MISTRAL_MODEL, ["mistral-small-latest"]).map((m) => mistral(env.MISTRAL_API_KEY!, m)) : [],
    nvidia: env.NVIDIA_API_KEY ? list(env.NVIDIA_MODEL, ["meta/llama-3.3-70b-instruct"]).map((m) => nvidia(env.NVIDIA_API_KEY!, m)) : [],
  };
  const order = list(env.LLM_ORDER, DEFAULT_ORDER);
  const all = order.flatMap((k) => by[k] ?? []);
  return opts.retry === false ? all : all.map((l) => withRetry(l));
}

/** Extrait l'objet JSON d'une réponse (tolère les blocs ``` et le texte autour). */
export function parseJsonReply(text: string): unknown {
  const t = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error("la réponse du modèle n'est pas du JSON");
  }
}
