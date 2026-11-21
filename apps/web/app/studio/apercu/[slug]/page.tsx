import { notFound } from "next/navigation";
import GameShell from "@/components/GameShell";
import Login from "@/components/studio/Login";
import PreviewBar from "@/components/studio/PreviewBar";
import { getCartridge } from "@/lib/cartridges";
import { getSession } from "@/lib/session";
import { studioConfigured } from "@/lib/studio-auth";
import { validateCartridge } from "@press-hire/cartridge";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return <Login configured={studioConfigured()} />;
  const { slug } = await params;
  const c = await getCartridge(slug, { owner: session.accountId });
  if (!c) notFound();
  const strict = validateCartridge(c, { strict: true });
  const blocking = strict.issues.filter((i) => i.severity === "error").map((i) => i.message);
  return (
    <>
      <GameShell c={c} track={false} badge={session.plan.badge} />
      <PreviewBar slug={slug} blocking={blocking} />
    </>
  );
}
