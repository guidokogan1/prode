insert into tournament_stages (code, name, sort_order)
values
  ('group', 'Fase de grupos', 10),
  ('round_of_16', 'Octavos de final', 20),
  ('quarter_final', 'Cuartos de final', 30)
on conflict (code) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into teams (fifa_code, name, flag_url)
values
  ('ARG', 'Argentina', 'https://flagcdn.com/ar.svg'),
  ('JPN', 'Japon', 'https://flagcdn.com/jp.svg'),
  ('BRA', 'Brasil', 'https://flagcdn.com/br.svg'),
  ('MEX', 'Mexico', 'https://flagcdn.com/mx.svg'),
  ('JOR', 'Jordania', 'https://flagcdn.com/jo.svg'),
  ('GER', 'Alemania', 'https://flagcdn.com/de.svg'),
  ('ESP', 'Espana', 'https://flagcdn.com/es.svg'),
  ('URU', 'Uruguay', 'https://flagcdn.com/uy.svg')
on conflict (fifa_code) do update
set
  name = excluded.name,
  flag_url = excluded.flag_url;

insert into matches (
  external_id,
  stage_id,
  home_team_id,
  away_team_id,
  kickoff_at,
  status,
  venue_name,
  venue_city,
  home_score_90,
  away_score_90,
  home_score_ft,
  away_score_ft,
  winner_team_id,
  winner_mode
)
select
  seed.external_id,
  stage.id,
  home.id,
  away.id,
  seed.kickoff_at::timestamptz,
  seed.status,
  seed.venue_name,
  seed.venue_city,
  seed.home_score_90,
  seed.away_score_90,
  seed.home_score_ft,
  seed.away_score_ft,
  winner.id,
  seed.winner_mode
from (
  values
    ('arg-jpn', 'group', 'ARG', 'JPN', '2026-06-11T22:00:00Z', 'scheduled', 'Estadio BBVA', 'Monterrey', null, null, null, null, null, null),
    ('bra-mex', 'group', 'BRA', 'MEX', '2026-06-12T19:30:00Z', 'live', 'SoFi Stadium', 'Los Angeles', 1, 1, 1, 1, null, null),
    ('jor-ger', 'round_of_16', 'JOR', 'GER', '2026-06-30T21:00:00Z', 'finished', 'Hard Rock Stadium', 'Miami', 1, 0, 1, 0, 'JOR', 'regular_time'),
    ('esp-uru', 'quarter_final', 'ESP', 'URU', '2026-07-04T18:00:00Z', 'scheduled', 'AT&T Stadium', 'Dallas', null, null, null, null, null, null)
) as seed(
  external_id,
  stage_code,
  home_code,
  away_code,
  kickoff_at,
  status,
  venue_name,
  venue_city,
  home_score_90,
  away_score_90,
  home_score_ft,
  away_score_ft,
  winner_code,
  winner_mode
)
join tournament_stages stage on stage.code = seed.stage_code
join teams home on home.fifa_code = seed.home_code
join teams away on away.fifa_code = seed.away_code
left join teams winner on winner.fifa_code = seed.winner_code
where not exists (
  select 1 from matches existing where existing.external_id = seed.external_id
);

insert into match_markets (match_id, market_type, lock_at, status)
select
  matches.id,
  case
    when stage.code = 'group' then '1x2'
    else 'qualifies'
  end,
  matches.kickoff_at,
  case
    when matches.status = 'scheduled' then 'open'
    when matches.status = 'live' then 'revealed'
    when matches.status = 'finished' then 'settled'
    else 'open'
  end
from matches
join tournament_stages stage on stage.id = matches.stage_id
where not exists (
  select 1 from match_markets mm where mm.match_id = matches.id
);

insert into market_outcomes (match_market_id, code, label, sort_order)
select mm.id, outcome.code, outcome.label, outcome.sort_order
from match_markets mm
join lateral (
  select *
  from (
    values
      ('1x2', 'home', 'Gana local', 10),
      ('1x2', 'draw', 'Empate', 20),
      ('1x2', 'away', 'Gana visitante', 30),
      ('qualifies', 'home_qualifies', 'Clasifica local', 10),
      ('qualifies', 'away_qualifies', 'Clasifica visitante', 20)
  ) as outcomes(market_type, code, label, sort_order)
  where outcomes.market_type = mm.market_type
) outcome on true
where not exists (
  select 1 from market_outcomes existing
  where existing.match_market_id = mm.id and existing.code = outcome.code
);
