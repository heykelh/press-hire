import { countFixtures, countLive, dbConfigured } from "@/lib/cartridges";
import { ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Critère de passage de la phase 0 : l'app déployée lit Neon. */
export async function GET() {
  const fixtures = await countFixtures();
  if (!dbConfigured()) {
    return Response.json({ ok: true, db: "not_configured", fixtures });
  }
  try {
    await ensureSchema();
    const live = await countLive();
    return Response.json({ ok: true, db: "connected", live, fixtures });
  } catch (e) {
    console.error("[press-hire] health", e);
    return Response.json({ ok: false, db: "error", fixtures }, { status: 503 });
  }
}
