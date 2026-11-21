import Link from "next/link";
import Login from "@/components/studio/Login";
import ProfileForm from "@/components/studio/ProfileForm";
import { dbConfigured } from "@/lib/db";
import { getProfile } from "@/lib/settings";
import { isStudio, studioConfigured } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  if (!(await isStudio())) return <Login configured={studioConfigured()} />;
  return (
    <main className="st">
      <div className="st-top">
        <h1>PROFIL <b>CANDIDAT</b></h1>
        <nav><Link className="st-btn small" href="/studio">◀ STUDIO</Link></nav>
      </div>
      <p className="st-hint">
        Ces informations sont ajoutées telles quelles dans chaque jeu (écran de fin, boutons). Elles restent dans ta base Neon,
        jamais dans le dépôt public. Le modèle de langue ne voit que tes projets et leur description, jamais ton e-mail.
      </p>
      {dbConfigured() ? <ProfileForm initial={await getProfile()} /> : <p className="st-err">Base Neon non configurée.</p>}
    </main>
  );
}
