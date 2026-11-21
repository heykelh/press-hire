import Link from "next/link";
import { isStudio } from "@/lib/studio-auth";
import { logout } from "@/app/studio/actions";

const LINKS = [
  { href: "/", label: "ACCUEIL" },
  { href: "/demos", label: "DÉMOS" },
  { href: "/gallery", label: "DÉCORS" },
  { href: "/#comment", label: "COMMENT ÇA MARCHE" },
];

/** Barre de navigation commune à toutes les pages du site (pas aux jeux eux-mêmes). */
export default async function SiteNav({ current }: { current?: string }) {
  const logged = await isStudio();
  return (
    <header className="site-nav">
      <Link href="/" className="site-logo">PRESS <b>HIRE</b></Link>
      <nav>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={current === l.href ? "on" : ""}>{l.label}</Link>
        ))}
        {logged ? (
          <>
            <Link href="/studio" className={`cta${current === "/studio" ? " on" : ""}`}>STUDIO</Link>
            <Link href="/studio#jeux" className={current === "/studio#jeux" ? "on" : ""}>MES JEUX</Link>
            <form action={logout}><button>QUITTER</button></form>
          </>
        ) : (
          <Link href="/studio" className="cta">CRÉER UN JEU ▶</Link>
        )}
      </nav>
    </header>
  );
}
