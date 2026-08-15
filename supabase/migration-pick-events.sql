create table if not exists pick_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  user_display_name text not null,
  match_id text references matches(id) on delete set null,
  team_name text,
  allocations jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pick_events_created_at_idx on pick_events (created_at);
create index if not exists pick_events_user_match_idx on pick_events (user_display_name, match_id);

alter table pick_events enable row level security;
