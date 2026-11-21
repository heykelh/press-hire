import { notFound } from "next/navigation";
import GameShell from "@/components/GameShell";
import Login from "@/components/studio/Login";
import PreviewBar from "@/components/studio/PreviewBar";
import { getCartridge } from "@/lib/cartridges";
import { isStudio, studioConfigured } from "@/lib/studio-auth";
import { validateCartridge } from "@press-hire/cartridge";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isStudio())) return <Login configured={studioConfigured()} />;
  const { slug } = await params;
  const c = await getCartridge(slug, { drafts: true });
  if (!c) notFound();
  const strict = validateCartridge(c, { strict: true });
  const blocking = strict.issues.filter((i) => i.severity === "error").map((i) => i.message);
  return (
    <>
      <GameShell c={c} track={false} />
      <PreviewBar slug={slug} blocking={blocking} />
    </>
  );
}
