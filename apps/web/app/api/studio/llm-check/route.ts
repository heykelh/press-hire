import { llmsFromEnv, parseJsonReply } from "@press-hire/agent";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Teste chaque modèle configuré avec une petite demande JSON : état, temps de réponse, message d'erreur. */
export async function GET() {
  if (!(await getSession())) return Response.json({ error: "non connecté" }, { status: 401 });
  const llms = llmsFromEnv(process.env, { retry: false });
  const results = await Promise.all(
    llms.map(async (l) => {
      const t0 = Date.now();
      try {
        const out = await Promise.race([
          l.complete("Tu réponds uniquement en JSON.", 'Renvoie exactement {"ok": true, "mot": "pixel"}', { task: "check", temperature: 0 }),
          new Promise<string>((_, rej) => setTimeout(() => rej(new Error("trop lent (> 25 s)")), 25_000)),
        ]);
        const json = parseJsonReply(out) as { ok?: boolean };
        return { name: l.name, ok: json?.ok === true, ms: Date.now() - t0, error: json?.ok === true ? undefined : "réponse inattendue" };
      } catch (e) {
        return { name: l.name, ok: false, ms: Date.now() - t0, error: (e as Error).message };
      }
    }),
  );
  return Response.json({ results });
}
