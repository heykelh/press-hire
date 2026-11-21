import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";

const MECHS = [
  ["ATTRAPE-TOUT", "Façon Kaboom! : filtrer un flux de mails, de données, de tickets.", "précision · rappel"],
  ["TAPE-ALERTE", "Tape-taupe : traiter les incidents avant qu'ils repartent.", "SLA · MTTR"],
  ["JAUGE", "Swing de golf 8-bit : doser un seuil, un budget, une fréquence.", "zone optimale"],
  ["MÉMOIRE", "Façon Simon : retenir l'ordre d'une procédure.", "série parfaite"],
  ["ROUE", "Roue de jeu télévisé : hasard ou adresse, les aléas du métier.", "espérance"],
  ["TRI", "Accepter ou rejeter, carte par carte, selon la règle.", "erreurs évitées"],
  ["QUIZ", "Le savoir du poste, avec l'explication à chaque réponse.", "bonnes réponses"],
  ["RÉGLAGE", "Trouver le compromis entre coût et qualité.", "optimum"],
  ["ÉCHANGE", "Convaincre un comité, recueillir un besoin.", "adhésion"],
];

/** Accueil : présentation, accès au studio, aux démos et à la galerie. */
export default function Home() {
  return (
    <>
      <SiteNav current="/" />
      <main className="crt">
        <section className="home-hero">
          <h1 className="logo">PRESS HIRE</h1>
          <p className="lead">Une offre d&apos;emploi en entrée, un jeu rétro 8-bit en sortie. Les vraies missions du poste deviennent des niveaux, à jouer en cinq minutes.</p>
          <div className="home-cta">
            <Link className="btn8 go" href="/studio">CRÉER UN JEU ▶</Link>
            <Link className="btn8" href="/demos">JOUER À UNE DÉMO</Link>
            <Link className="btn8" href="/gallery">VOIR LES DÉCORS</Link>
          </div>
        </section>

        <section className="home-sec" id="comment">
          <h2>COMMENT ÇA MARCHE</h2>
          <div className="home-steps">
            <div><b>1 · COLLE L&apos;OFFRE</b>Le lien, ou le texte si le site demande une connexion. Ajoute des consignes si tu veux.</div>
            <div><b>2 · L&apos;AGENT CRÉE LE JEU</b>Il lit l&apos;offre, choisit décor, ton et mécaniques, vérifie que chaque niveau se gagne, corrige ce qui cloche.</div>
            <div><b>3 · TESTE ET PUBLIE</b>Tu joues l&apos;aperçu, tu publies, tu reçois un lien à joindre à ta candidature. Une notification arrive quand quelqu&apos;un joue.</div>
          </div>
        </section>

        <section className="home-sec">
          <h2>LES MÉCANIQUES</h2>
          <div className="home-mechs">
            {MECHS.map(([n, d, k]) => <div key={n}><b>{n}</b>{d} <i>· {k}</i></div>)}
          </div>
        </section>

        <p className="home-foot">PRESS HIRE · jeux de candidature rétro</p>
      </main>
    </>
  );
}
