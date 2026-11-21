/**
 * Fournisseurs de modèles de langue, essayés dans l'ordre.
 * Les identifiants de modèles changent souvent : ils se règlent par variables d'environnement.
 */

export interface CallOpts {
  /** étape du pipeline (analyze, write, critique, revise, repair) : utile aux modèles simulés et aux journaux */
  task?: string;
  temperature?: number;
}

export interface Llm {
  name: string;
  /** renvoie le texte brut de la réponse (censé être du JSON) */
  complete(system: string, user: string, opts?: CallOpts): Promise<string>;
}

export class LlmError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

const TIMEOUT = 150_000;

async function post(url: string, headers: Record<string, string>, body: unknown, who: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch (e) {
    throw new LlmError(`${who} injoignable (${(e as Error).message})`, true);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    const hint = res.status === 404 ? " : identifiant de modèle inconnu, vérifie la variable *_MODEL" : res.status === 429 ? " : quota atteint" : "";
    throw new LlmError(`${who} répond ${res.status}${hint}. ${detail}`, res.status === 429 || res.status >= 500 || res.status === 404);
  }
  return res.json();
}

export function gemini(apiKey: string, model = "gemini-flash-latest"): Llm {
  return {
    name: `Gemini (${model})`,
    async complete(system, user, opts) {
      const data = (await post(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { "x-goog-api-key": apiKey },
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", temperature: opts?.temperature ?? 0.9, maxOutputTokens: 32768 },
        },
        "Gemini",
      )) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }> };
      const cand = data.candidates?.[0];
      const text = cand?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
      if (!text) throw new LlmError(`Gemini n'a rien renvoyé (${cand?.finishReason ?? "sans raison"})`, true);
      return text;
    },
  };
}

export function groq(apiKey: string, model = "llama-3.3-70b-versatile"): Llm {
  return {
    name: `Groq (${model})`,
    async complete(system, user, opts) {
      const data = (await post(
        "https://api.groq.com/openai/v1/chat/completions",
        { authorization: `Bearer ${apiKey}` },
        {
          model,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          response_format: { type: "json_object" },
          temperature: opts?.temperature ?? 0.8,
          max_tokens: 16000,
        },
        "Groq",
      )) as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text) throw new LlmError("Groq n'a rien renvoyé", true);
      return text;
    },
  };
}

/** Essaie chaque fournisseur jusqu'au premier qui répond. */
export function chain(llms: Llm[], onFallback?: (from: string, err: string) => void): Llm {
  if (!llms.length) throw new LlmError("aucun modèle configuré : ajoute GEMINI_API_KEY ou GROQ_API_KEY", false);
  return {
    name: llms.map((l) => l.name).join(" → "),
    async complete(system, user, opts) {
      let last: unknown;
      for (const l of llms) {
        try {
          return await l.complete(system, user, opts);
        } catch (e) {
          last = e;
          onFallback?.(l.name, (e as Error).message);
          if (e instanceof LlmError && !e.retryable) break;
        }
      }
      throw last instanceof Error ? last : new Error(String(last));
    },
  };
}

/** Fournisseurs configurés par l'environnement (GEMINI_API_KEY, GROQ_API_KEY, *_MODEL). */
export function llmsFromEnv(env: Record<string, string | undefined> = process.env): Llm[] {
  const out: Llm[] = [];
  if (env.GEMINI_API_KEY) out.push(gemini(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined));
  if (env.GROQ_API_KEY) out.push(groq(env.GROQ_API_KEY, env.GROQ_MODEL || undefined));
  return out;
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
