import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GameShell from "@/components/GameShell";
import { getCartridge } from "@/lib/cartridges";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCartridge((await params).slug);
  if (!c) return { title: "PRESS HIRE" };
  const lang = c.meta.defaultLang;
  return {
    title: c.design.title[lang],
    description: c.design.tagline[lang],
    robots: { index: false, follow: false },
    openGraph: { title: `${c.design.title[lang]} · un jeu de candidature`, description: c.design.tagline[lang], type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function GamePage({ params }: Props) {
  const c = await getCartridge((await params).slug);
  if (!c) notFound();
  return <GameShell c={c} />;
}
