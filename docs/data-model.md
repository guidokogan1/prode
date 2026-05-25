# Esquema Inicial de Datos

## Objetivo

Modelo minimo para soportar:

- usuarios por `nombre + PIN`
- fixture del Mundial
- mercados por partido
- jugadas por usuario
- allocations por outcome
- settlement
- ranking
- mercado campeon

## Entidades

### users

Representa a cada participante del grupo.

Campos:

- `id` uuid pk
- `display_name` text not null
- `pin_hash` text not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null
- `is_active` boolean not null default true

Restricciones:

- indice unico sugerido sobre `lower(display_name)`

### teams

Selecciones nacionales.

Campos:

- `id` uuid pk
- `name` text not null
- `fifa_code` text not null
- `flag_url` text
- `created_at` timestamptz not null

Restricciones:

- indice unico sobre `fifa_code`

### tournament_stages

Fases del torneo.

Campos:

- `id` uuid pk
- `code` text not null
- `name` text not null
- `sort_order` int not null

Ejemplos:

- `group`
- `round_of_32`
- `round_of_16`
- `quarter_final`
- `semi_final`
- `third_place`
- `final`

### matches

Partidos del Mundial.

Campos:

- `id` uuid pk
- `external_id` text
- `stage_id` uuid fk -> tournament_stages.id
- `home_team_id` uuid fk -> teams.id
- `away_team_id` uuid fk -> teams.id
- `kickoff_at` timestamptz not null
- `status` text not null
- `venue_name` text
- `venue_city` text
- `home_score_90` int
- `away_score_90` int
- `home_score_ft` int
- `away_score_ft` int
- `winner_team_id` uuid fk -> teams.id
- `winner_mode` text
- `tv_channel_ar` text
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

`winner_mode` puede ser:

- `regular_time`
- `extra_time`
- `penalties`

`status` puede ser:

- `scheduled`
- `live`
- `finished`
- `postponed`
- `cancelled`

### match_markets

Mercado jugable asociado a un partido.

Campos:

- `id` uuid pk
- `match_id` uuid fk -> matches.id
- `market_type` text not null
- `lock_at` timestamptz not null
- `reveal_at` timestamptz
- `settled_at` timestamptz
- `winning_outcome_code` text
- `status` text not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

`market_type`:

- `1x2`
- `qualifies`

`status`:

- `open`
- `locked`
- `revealed`
- `settled`

### market_outcomes

Outcomes disponibles para cada mercado.

Campos:

- `id` uuid pk
- `match_market_id` uuid fk -> match_markets.id
- `code` text not null
- `label` text not null
- `sort_order` int not null

Ejemplos para `1x2`:

- `home`
- `draw`
- `away`

Ejemplos para `qualifies`:

- `home_qualifies`
- `away_qualifies`

### tickets

Jugada de un usuario para un mercado de partido.

Campos:

- `id` uuid pk
- `user_id` uuid fk -> users.id
- `match_market_id` uuid fk -> match_markets.id
- `credit_total` int not null default 10000
- `submitted_at` timestamptz not null
- `updated_at` timestamptz not null
- `is_locked` boolean not null default false

Restricciones:

- unico por `user_id + match_market_id`

### ticket_allocations

Distribucion del credito del ticket entre outcomes.

Campos:

- `id` uuid pk
- `ticket_id` uuid fk -> tickets.id
- `market_outcome_id` uuid fk -> market_outcomes.id
- `amount` int not null

Restricciones:

- `amount >= 0`
- la suma de allocations por ticket debe ser `10000`
- ninguna allocation puede superar el tope definido

### settlements

Resultado de un ticket una vez liquidado el partido.

Campos:

- `id` uuid pk
- `ticket_id` uuid fk -> tickets.id
- `winning_outcome_code` text not null
- `winning_pool_amount` int not null
- `total_pool_amount` int not null
- `winning_bet_amount` int not null
- `gross_return_amount` numeric not null
- `net_result_amount` numeric not null
- `settled_at` timestamptz not null

### champion_market

Mercado especial del campeon del torneo.

Campos:

- `id` uuid pk
- `lock_at` timestamptz not null
- `settled_at` timestamptz
- `winning_team_id` uuid fk -> teams.id
- `status` text not null

### champion_picks

Jugada de campeon por usuario.

Campos:

- `id` uuid pk
- `champion_market_id` uuid fk -> champion_market.id
- `user_id` uuid fk -> users.id
- `team_id` uuid fk -> teams.id
- `submitted_at` timestamptz not null
- `gross_return_amount` numeric
- `net_result_amount` numeric
- `settled_at` timestamptz

Restricciones:

- unico por `champion_market_id + user_id`

### leaderboard_snapshots

Snapshot de ranking para lectura rapida y auditoria simple.

Campos:

- `id` uuid pk
- `user_id` uuid fk -> users.id
- `as_of` timestamptz not null
- `rank_position` int not null
- `total_net_amount` numeric not null
- `positive_tickets_count` int not null
- `best_single_net_amount` numeric

## Relaciones clave

- `matches` pertenece a `tournament_stages`
- `match_markets` pertenece a `matches`
- `market_outcomes` pertenece a `match_markets`
- `tickets` pertenece a `users` y `match_markets`
- `ticket_allocations` pertenece a `tickets` y `market_outcomes`
- `settlements` pertenece a `tickets`
- `champion_picks` pertenece a `users` y `champion_market`

## Validaciones de negocio

- un ticket no puede editarse despues de `lock_at`
- un mercado no puede liquidarse sin `winning_outcome_code`
- en grupos, el market type debe ser `1x2`
- en eliminatorias, el market type debe ser `qualifies`
- la suma de allocations por ticket debe ser exactamente `10000`
- cada allocation debe respetar el tope por outcome

## Consultas importantes

- proximos partidos con estado de jugada del usuario
- detalle de partido con jugadas reveladas
- ranking general
- historial de jugadas del usuario
- settlement detallado por partido

## Notas de implementacion

- guardar todos los horarios en UTC
- calcular y persistir settlement en backend
- no calcular ranking pesado en cliente
- mantener el modelo lo mas auditable posible
