import { z } from "zod";
import { chain, EXAMPLE_BRIEF, EXAMPLE_BRIEF_ARCADE, EXAMPLE_JOB, generate, IdeaOptions, llmsFromEnv, type GenerateEvent, type Llm } from "@press-hire/agent";
import { saveCartridge } from "@/lib/cartridges";
import { dbConfigured } from "@/lib/db";
import { generationsThisMonth, getSession, logGeneration } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** une génération avec deux tours de correction peut prendre quelques minutes */
export const maxDuration = 300;

const Input = z.object({
  offerUrl: z.string().url().max(2000).optional().or(z.literal("").transform(() => undefined)),
  offerText: z.string().max(40000).optional(),
  company: z.string().max(120).optional(),
  jobTitle: z.string().max(160).optional(),
  notes: z.string().max(2000).optional(),
  contactName: z.string().max(120).optional(),
  contactRole: z.string().max(120).optional(),
  /** "idea" : jeu créé à partir d'une idée et d'options, sans offre d'emploi */
  mode: z.enum(["offer", "idea"]).default("offer"),
  idea: IdeaOptions.optional(),
}).refine((x) => x.mode !== "idea" || !!x.idea, { message: "idée manquante", path: ["idea"] });

/** Modèle simulé pour les tests de bout en bout (PRESS_HIRE_MOCK_LLM=1), jamais en production. */
function mockLlm(company?: string, job?: string): Llm {
  return {
    name: "modèle simulé",
    async complete(_system, _user, opts) {
      await new Promise((r) => setTimeout(r, 300));
      if (opts?.task === "analyze") return JSON.stringify({ ...EXAMPLE_JOB, ...(company ? { company } : {}), ...(job ? { jobTitle: job } : {}) });
      if (opts?.task === "critique")
        return JSON.stringify({ scores: { accuracy: 8, pedagogy: 8, fun: 9, wow: 8 }, levels: [], global: ["Ajouter un exemple de MFA."] });
      const b = JSON.parse(JSON.stringify(EXAMPLE_BRIEF_ARCADE));
      if (company) b.target.company.name = company;
      if (job) b.target.job.title = job;
      void EXAMPLE_BRIEF;
      return JSON.stringify(b);
    },
  };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "non connecté" }, { status: 401 });
  if (!dbConfigured()) return Response.json({ error: "la base Neon n'est pas configurée" }, { status: 500 });
  const used = await generationsThisMonth(session.accountId);
  if (used >= session.plan.generationsPerMonth)
    return Response.json({ error: `Quota atteint : ${session.plan.generationsPerMonth} jeux par mois avec l'offre ${session.plan.label}.` }, { status: 402 });
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: `formulaire invalide : ${parsed.error.issues.slice(0, 2).map((i) => `${i.path.join(".")} ${i.message}`).join(" ; ")}`, issues: parsed.error.issues }, { status: 400 });
  const input = parsed.data;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (e: GenerateEvent | Record<string, unknown>) => ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      const t0 = Date.now();
      let provider = "";
      try {
        const llm =
          process.env.PRESS_HIRE_MOCK_LLM === "1" && process.env.VERCEL !== "1"
            ? mockLlm(input.idea?.title ?? input.company, input.idea?.hero ?? input.jobTitle)
            : chain(llmsFromEnv(), (from, err) => send({ type: "warn", message: `${err.slice(0, 160)} → modèle suivant…` }));
        provider = llm.name;
        const contact = input.contactName ? { name: input.contactName, ...(input.contactRole ? { role: input.contactRole } : {}) } : undefined;
        const genInput = input.mode === "idea"
          ? { idea: input.idea, notes: input.notes }
          : { offerUrl: input.offerUrl, offerText: input.offerText, company: input.company, jobTitle: input.jobTitle, notes: input.notes, contact };
        for await (const e of generate(genInput, { llm })) {
          if (e.type === "done") {
            await saveCartridge(e.cartridge, "draft", session.accountId, input.offerUrl);
            await logGeneration({ accountId: session.accountId, slug: e.slug, ok: true, provider, durationMs: Date.now() - t0 });
            send({
              type: "done",
              slug: e.slug,
              title: e.cartridge.design.title.fr,
              mechanics: e.cartridge.levels.map((l) => l.mechanic.type),
              scores: e.scores,
              warnings: e.issues.filter((i) => i.severity === "warning").map((i) => i.message),
              attempts: e.attempts,
            });
          } else {
            if (e.type === "fail") await logGeneration({ accountId: session.accountId, ok: false, provider, durationMs: Date.now() - t0, error: e.message });
            send(e);
          }
        }
      } catch (e) {
        send({ type: "fail", message: (e as Error).message });
        await logGeneration({ accountId: session.accountId, ok: false, provider, durationMs: Date.now() - t0, error: (e as Error).message }).catch(() => {});
      } finally {
        ctrl.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
