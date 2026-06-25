create extension if not exists "pgcrypto";
create schema if not exists app_private;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_display_name_lower_idx
  on users (lower(display_name));

create table if not exists app_private.user_credentials (
  user_id uuid primary key references users(id) on delete cascade,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_private.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fifa_code text not null unique,
  flag_url text,
  created_at timestamptz not null default now()
);

create table if not exists tournament_stages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order int not null
);

create table if not exists matches (
  id text primary key,
  external_id text,
  stage_id uuid not null references tournament_stages(id),
  home_team_id uuid not null references teams(id),
  away_team_id uuid not null references teams(id),
  kickoff_at timestamptz not null,
  status text not null,
  venue_name text,
  venue_city text,
  home_score_90 int,
  away_score_90 int,
  home_score_ft int,
  away_score_ft int,
  winner_team_id uuid references teams(id),
  winner_mode text,
  tv_channel_ar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists match_markets (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references matches(id) on delete cascade,
  market_type text not null,
  lock_at timestamptz not null,
  reveal_at timestamptz,
  settled_at timestamptz,
  winning_outcome_code text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id)
);

create table if not exists market_outcomes (
  id uuid primary key default gen_random_uuid(),
  match_market_id uuid not null references match_markets(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order int not null,
  unique (match_market_id, code)
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  match_market_id uuid not null references match_markets(id) on delete cascade,
  credit_total int not null default 10000,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_locked boolean not null default false,
  unique (user_id, match_market_id)
);

create table if not exists ticket_allocations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  market_outcome_id uuid not null references market_outcomes(id) on delete cascade,
  amount int not null check (amount >= 0),
  unique (ticket_id, market_outcome_id)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references tickets(id) on delete cascade,
  winning_outcome_code text not null,
  winning_pool_amount int not null,
  total_pool_amount int not null,
  winning_bet_amount int not null,
  gross_return_amount numeric(12,2) not null,
  net_result_amount numeric(12,2) not null,
  settled_at timestamptz not null default now()
);

create table if not exists champion_market (
  id uuid primary key default gen_random_uuid(),
  lock_at timestamptz not null,
  settled_at timestamptz,
  winning_team_id uuid references teams(id),
  status text not null
);

create table if not exists champion_picks (
  id uuid primary key default gen_random_uuid(),
  champion_market_id uuid not null references champion_market(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  team_id uuid not null references teams(id),
  submitted_at timestamptz not null default now(),
  gross_return_amount numeric(12,2),
  net_result_amount numeric(12,2),
  settled_at timestamptz,
  unique (champion_market_id, user_id)
);

create table if not exists leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  as_of timestamptz not null default now(),
  rank_position int not null,
  previous_rank_position int,
  total_net_amount numeric(12,2) not null,
  positive_tickets_count int not null default 0,
  best_single_net_amount numeric(12,2),
  unique (user_id)
);

grant usage on schema app_private to service_role;
grant all privileges on all tables in schema app_private to service_role;
grant all privileges on all sequences in schema app_private to service_role;
alter default privileges in schema app_private grant all privileges on tables to service_role;
alter default privileges in schema app_private grant all privileges on sequences to service_role;

alter table users enable row level security;
alter table teams enable row level security;
alter table tournament_stages enable row level security;
alter table matches enable row level security;
alter table match_markets enable row level security;
alter table market_outcomes enable row level security;
alter table tickets enable row level security;
alter table ticket_allocations enable row level security;
alter table settlements enable row level security;
alter table champion_market enable row level security;
alter table champion_picks enable row level security;
alter table leaderboard_snapshots enable row level security;

drop policy if exists "public read users" on users;
create policy "public read users"
  on users for select
  to anon, authenticated
  using (true);

drop policy if exists "public read teams" on teams;
create policy "public read teams"
  on teams for select
  to anon, authenticated
  using (true);

drop policy if exists "public read stages" on tournament_stages;
create policy "public read stages"
  on tournament_stages for select
  to anon, authenticated
  using (true);

drop policy if exists "public read matches" on matches;
create policy "public read matches"
  on matches for select
  to anon, authenticated
  using (true);

drop policy if exists "public read match markets" on match_markets;
create policy "public read match markets"
  on match_markets for select
  to anon, authenticated
  using (true);

drop policy if exists "public read market outcomes" on market_outcomes;
create policy "public read market outcomes"
  on market_outcomes for select
  to anon, authenticated
  using (true);

drop policy if exists "public read leaderboard" on leaderboard_snapshots;
create policy "public read leaderboard"
  on leaderboard_snapshots for select
  to anon, authenticated
  using (true);
