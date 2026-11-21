"use client";

import { useActionState } from "react";
import { login } from "@/app/studio/actions";

export default function Login({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <main className="st" style={{ maxWidth: 460 }}>
      <h1>PRESS <b>HIRE</b> · STUDIO</h1>
      <form className="st-card" action={action}>
        <label>
          <span>MOT DE PASSE</span>
          <input type="password" name="password" autoComplete="current-password" autoFocus required />
        </label>
        <div className="st-row" style={{ marginTop: 14 }}>
          <button className="st-btn go" disabled={pending}>{pending ? "…" : "ENTRER ▶"}</button>
        </div>
        {state?.error && <p className="st-err">{state.error}</p>}
        {!configured && <p className="st-hint">Règle d'abord STUDIO_PASSWORD dans les variables d'environnement Vercel, puis redéploie.</p>}
      </form>
    </main>
  );
}
