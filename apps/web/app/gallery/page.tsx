import type { Metadata } from "next";
import SiteNav from "@/components/site/SiteNav";
import Gallery from "./Gallery";

export const metadata: Metadata = { title: "PRESS HIRE · galerie des écrans titre", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <SiteNav current="/gallery" />
      <Gallery />
    </>
  );
}
