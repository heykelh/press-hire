import { cookies } from "next/headers";
import { z } from "zod";
import { chain, EXAMPLE_BRIEF, generate, hasPlaceholders, llmsFromEnv, type GenerateEvent, type Llm } from "@press-hire/agent";
import { saveCartridge } from "@/lib/cartridges";
import { dbConfigured } from "@/lib/db";
import { getProfile } from "@/lib/settings";
import { isStudioCookie, STUDIO_COOKIE } from "@/lib/studio-auth";

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
});

/** Modèle simulé pour les tests de bout en bout (PRESS_HIRE_MOCK_LLM=1), jamais en production. */
function mockLlm(company?: string, job?: string): Llm {
  return {
    name: "modèle simulé",
    async complete() {
      await new Promise((r) => setTimeout(r, 400));
      const b = JSON.parse(JSON.stringify(EXAMPLE_BRIEF));
      if (company) b.target.company.name = company;
      if (job) b.target.job.title = job;
      return JSON.stringify(b);
    },
  };
}

export async function POST(req: Request) {
  if (!isStudioCookie((await cookies()).get(STUDIO_COOKIE)?.value)) return Response.json({ error: "non connecté" }, { status: 401 });
  if (!dbConfigured()) return Response.json({ error: "la base Neon n'est pas configurée" }, { status: 500 });
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "formulaire invalide", issues: parsed.error.issues }, { status: 400 });
  const input = parsed.data;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (e: GenerateEvent | Record<string, unknown>) => ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        const profile = await getProfile();
        const llm =
          process.env.PRESS_HIRE_MOCK_LLM === "1" && process.env.VERCEL !== "1"
            ? mockLlm(input.company, input.jobTitle)
            : chain(llmsFromEnv(), (from, err) => send({ type: "warn", message: `${from} indisponible (${err.slice(0, 160)}), essai suivant…` }));
        const contact = input.contactName ? { name: input.contactName, ...(input.contactRole ? { role: input.contactRole } : {}) } : undefined;
        for await (const e of generate({ ...input, contact }, { llm, profile })) {
          if (e.type === "done") {
            await saveCartridge(e.cartridge, "draft", input.offerUrl);
            send({
              type: "done",
              slug: e.slug,
              title: e.cartridge.design.title.fr,
              warnings: e.issues.filter((i) => i.severity === "warning").map((i) => i.message),
              profileIncomplete: hasPlaceholders(profile),
              attempts: e.attempts,
            });
          } else send(e);
        }
      } catch (e) {
        send({ type: "fail", message: (e as Error).message });
      } finally {
        ctrl.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
