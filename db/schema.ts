/**
 * Schéma Neon (Postgres). Toutes les instructions sont idempotentes :
 * `pnpm db:init` et le studio peuvent les rejouer sans risque.
 */
export const SCHEMA_SQL = `
-- PRESS HIRE : schéma Neon (Postgres)
-- Une ligne = un jeu publié. Publier un jeu = insérer une ligne, sans redéployer l'app.

create table if not exists cartridges (
  slug        text primary key,
  data        jsonb       not null,
  status      text        not null default 'live' check (status in ('draft', 'live', 'archived')),
  company     text        not null,
  job_title   text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- compteurs alimentés par /api/track (phase 2)
  plays       integer     not null default 0,
  ends        integer     not null default 0,
  cta_clicks  integer     not null default 0,
  last_play_at timestamptz
);

create index if not exists cartridges_status_idx on cartridges (status);
create index if not exists cartridges_company_idx on cartridges (lower(company));

-- Phase 2 : studio, suivi des parties, notifications (idempotent : peut être relancé)
alter table cartridges add column if not exists source_url text;
alter table cartridges add column if not exists notified_at timestamptz;
alter table cartridges add column if not exists recruiter_views integer not null default 0;

-- réglages du studio (profil du candidat…), jamais dans le dépôt public
create table if not exists settings (
  key        text primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- une ligne par événement de partie (début, fin, clic sur un bouton de contact)
create table if not exists play_events (
  id         bigserial primary key,
  slug       text        not null,
  sid        text        not null,
  kind       text        not null,
  detail     text,
  created_at timestamptz not null default now()
);
create index if not exists play_events_slug_idx on play_events (slug, created_at desc);
create index if not exists play_events_sid_idx on play_events (sid, kind);

-- Tableau des meilleurs scores de chaque jeu (3 initiales façon borne d'arcade)
create table if not exists scores (
  id         bigserial primary key,
  slug       text        not null,
  initials   text        not null,
  score      integer     not null,
  sid        text        not null,
  created_at timestamptz not null default now()
);
create index if not exists scores_slug_idx on scores (slug, score desc);

-- Préparation SaaS : comptes, propriétaire de chaque jeu, journal des générations (quotas, facturation)
create table if not exists accounts (
  id         text primary key,
  email      text,
  name       text,
  plan       text        not null default 'free',
  created_at timestamptz not null default now()
);
insert into accounts (id, name, plan) values ('owner', 'Propriétaire', 'owner') on conflict (id) do nothing;

alter table cartridges add column if not exists owner_id text not null default 'owner';
create index if not exists cartridges_owner_idx on cartridges (owner_id, created_at desc);

create table if not exists generations (
  id          bigserial primary key,
  owner_id    text        not null,
  slug        text,
  ok          boolean     not null,
  provider    text,
  duration_ms integer,
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists generations_owner_idx on generations (owner_id, created_at desc);
`;

/** Les instructions une par une (sans commentaires). */
export function schemaStatements(): string[] {
  return SCHEMA_SQL.split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
