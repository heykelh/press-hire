import { z } from "zod";
import { AGENT_VERSION, chain, EXAMPLE_BRIEF, EXAMPLE_BRIEF_ARCADE, EXAMPLE_JOB, generate, IdeaOptions, llmsFromEnv, type GenerateEvent, type Llm } from "@press-hire/agent";
import { recentDesign, saveCartridge } from "@/lib/cartridges";
import { ntfy } from "@/lib/notify";
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
      if (opts?.task === "pitch")
        return JSON.stringify({
          choice: 1, why: "simulé", title: "OPÉRATION TEST", hook: "Une accroche simulée pour les tests de bout en bout.",
          runningGag: "La machine à café qui fait des bruits de modem.",
          levels: [{ order: 1, angle: "Un vrai objet du métier.", twist: "La règle change." }],
          boss: { name: "Le Boss Simulé", phases: [{ intro: "Il attaque." }, { intro: "Il change de forme." }] },
        });
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
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? new URL(req.url).origin;
  const what = input.mode === "idea" ? input.idea?.title || "idée" : [input.company, input.jobTitle].filter(Boolean).join(" · ") || input.offerUrl || "offre collée";
  /** fin de génération : réussie ou non, on prévient (l'onglet a pu être fermé entre-temps) */
  const notifyEnd = async (ok: boolean, lines: string[], minutes: number) => {
    if (!session.plan.notifications) return;
    await ntfy({
      title: ok ? "✅ Jeu généré, prêt à relire" : "❌ Génération échouée",
      message: [what, ...lines, `Durée : ${minutes.toFixed(1)} min · moteur v${AGENT_VERSION}`].join("\n"),
      click: `${base}/studio`,
      tags: [ok ? "white_check_mark" : "x"],
      priority: ok ? 3 : 4,
    });
  };

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      let closed = false;
      /** vrai dès qu'un message de fin (réussite ou échec) est parti : rien d'autre ne doit suivre */
      let finished = false;
      const send = (e: GenerateEvent | Record<string, unknown>) => {
        if (closed) return;
        try { ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n")); } catch { closed = true; }
      };
      const close = () => { if (!closed) { closed = true; try { ctrl.close(); } catch { /* déjà fermé */ } } };
      const t0 = Date.now();
      let provider = "";
      const since = () => { const s = Math.round((Date.now() - t0) / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`; };
      // signe de vie pendant les longues étapes (le studio met à jour une seule ligne)
      const beat = setInterval(() => { if (!finished) send({ type: "wait", message: `… toujours en cours (${since()})` }); }, 20_000);
      // filet de sécurité : Vercel coupe à maxDuration sans prévenir ; on termine proprement juste avant
      const watchdog = setTimeout(async () => {
        if (finished) return;
        finished = true;
        const msg = `Temps maximal atteint (${since()}) : les modèles gratuits étaient surchargés ou trop lents. Relance dans quelques minutes.`;
        send({ type: "fail", message: msg });
        await logGeneration({ accountId: session.accountId, ok: false, provider, durationMs: Date.now() - t0, error: msg }).catch(() => {});
        await notifyEnd(false, [`Pourquoi : ${msg}`], (Date.now() - t0) / 60000).catch(() => {});
        close();
      }, (maxDuration - 18) * 1000);
      const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
      send({ type: "step", message: `Moteur PRESS HIRE v${AGENT_VERSION}${commit ? ` (commit ${commit})` : ""}` });
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
        // anti-répétition : ce qui a servi dans les derniers jeux du compte
        const recent = await recentDesign(session.accountId).catch(() => undefined);
        for await (const e of generate(genInput, { llm, recent, budgetMs: (maxDuration - 60) * 1000 })) {
          if (finished) break; // le filet de sécurité a déjà répondu
          if (e.type === "done") {
            finished = true;
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
            const warns = e.issues.filter((i) => i.severity === "warning");
            const salvage = warns.filter((i) => i.rule === "salvage").map((i) => `⚠ ${i.message}`);
            await notifyEnd(true, [
              `« ${e.cartridge.design.title.fr} » (${e.slug}), brouillon dans le studio.`,
              `${e.cartridge.levels.length} niveaux${e.cartridge.boss ? " + boss" : ""} · ${e.attempts > 1 ? `${e.attempts - 1} tour(s) de correction` : "accepté du premier coup"}.`,
              ...(salvage.length ? salvage : warns.length ? [`${warns.length} remarque(s) mineure(s), rien de bloquant.`] : ["Tous les contrôles passent."]),
            ], (Date.now() - t0) / 60000);
          } else {
            if (e.type === "fail") {
              finished = true;
              await logGeneration({ accountId: session.accountId, ok: false, provider, durationMs: Date.now() - t0, error: e.message });
              await notifyEnd(false, [`Pourquoi : ${e.message}`, "Relance la génération : le modèle écrit un jeu différent à chaque fois."], (Date.now() - t0) / 60000);
            }
            send(e);
          }
        }
      } catch (e) {
        if (finished) return;
        finished = true;
        send({ type: "fail", message: (e as Error).message });
        await logGeneration({ accountId: session.accountId, ok: false, provider, durationMs: Date.now() - t0, error: (e as Error).message }).catch(() => {});
        await notifyEnd(false, [`Pourquoi : erreur inattendue (${(e as Error).message.slice(0, 200)})`], (Date.now() - t0) / 60000).catch(() => {});
      } finally {
        clearInterval(beat);
        clearTimeout(watchdog);
        if (!finished) send({ type: "fail", message: "La génération s'est arrêtée sans résultat. Relance-la." });
        close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
