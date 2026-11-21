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
