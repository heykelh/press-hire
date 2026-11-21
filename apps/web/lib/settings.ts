import "server-only";
import { CandidateProfile, DEFAULT_PROFILE, type CandidateProfile as Profile } from "@press-hire/agent";
import { dbConfigured, ensureSchema, q } from "./db";

/** Profil du candidat, stocké dans Neon (jamais dans le dépôt public). */
export async function getProfile(): Promise<Profile> {
  if (!dbConfigured()) return DEFAULT_PROFILE;
  await ensureSchema();
  const rows = await q<{ value: unknown }>("select value from settings where key = 'candidate'");
  const parsed = CandidateProfile.safeParse(rows[0]?.value);
  return parsed.success ? parsed.data : DEFAULT_PROFILE;
}

export async function saveProfile(p: Profile): Promise<void> {
  await ensureSchema();
  await q(
    `insert into settings (key, value) values ('candidate', $1::jsonb)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(p)],
  );
}
