"use client";

import { useRouter } from "next/navigation";
import TitleScreen, { type TitleScreenProps } from "@/components/TitleScreen";

type Demo = Pick<TitleScreenProps, "title" | "tagline" | "skin" | "palette" | "scene" | "animation" | "shine"> & { slug: string; caption: string; mechanics: string };

export default function DemoCards({ demos }: { demos: Demo[] }) {
  const router = useRouter();
  return (
    <div className="demo-grid" style={{ marginTop: 24 }}>
      {demos.map((d) => (
        <figure key={d.slug} style={{ margin: 0 }}>
          <TitleScreen {...d} lang="fr" languages={["fr"]} mode="card" onStart={() => router.push(`/${d.slug}`)} />
          <figcaption>
            {d.caption}<br />
            <span className="mut" style={{ fontSize: 13 }}>{d.mechanics}</span><br />
            <a href={`/${d.slug}`}>▶ JOUER</a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
