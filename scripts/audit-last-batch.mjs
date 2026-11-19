import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

async function fetchAll(table, columns) {
  const rows = [];
  let from = 0;
  const size = 1000;
  for (;;) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + size - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return rows;
}

const users = await fetchAll('users', 'id, display_name');
const userName = new Map(users.map((u) => [u.id, u.display_name]));
const teams = await fetchAll('teams', 'id, name');
const teamName = new Map(teams.map((t) => [t.id, t.name]));
const matches = await fetchAll('matches', 'id, kickoff_at, home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_90, away_score_90');
const matchById = new Map(matches.map((m) => [m.id, m]));
const markets = await fetchAll('match_markets', 'id, match_id, settled_at, winning_outcome_code');
const marketById = new Map(markets.map((m) => [m.id, m]));
const outcomes = await fetchAll('market_outcomes', 'id, match_market_id, code');
const outcomeById = new Map(outcomes.map((o) => [o.id, o]));
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');
const ticketById = new Map(tickets.map((t) => [t.id, t]));
const allocs = await fetchAll('ticket_allocations', 'ticket_id, market_outcome_id, amount');
const allocsByTicket = new Map();
for (const a of allocs) {
  if (!allocsByTicket.has(a.ticket_id)) allocsByTicket.set(a.ticket_id, []);
  allocsByTicket.get(a.ticket_id).push(a);
}
const settlements = await fetchAll('settlements', 'ticket_id, winning_outcome_code, settled_at');

const settledMarkets = markets.filter((m) => m.settled_at).sort((a, b) => b.settled_at.localeCompare(a.settled_at));
const lastSettledAt = settledMarkets[0]?.settled_at?.slice(0, 13);
const recentMarketIds = new Set(settledMarkets.filter((m) => m.settled_at.slice(0, 13) === lastSettledAt).map((m) => m.id));

console.log(`Últimos markets liquidados (settled_at ~ ${lastSettledAt}):`);
for (const mid of recentMarketIds) {
  const mk = marketById.get(mid);
  const mt = matchById.get(mk.match_id);
  console.log(`  ${teamName.get(mt.home_team_id)} vs ${teamName.get(mt.away_team_id)} (${mt.home_score_ft ?? mt.home_score_90}-${mt.away_score_ft ?? mt.away_score_90}) win=${mk.winning_outcome_code}`);
}

const settleByTicket = new Map(settlements.map((s) => [s.ticket_id, s]));

console.log('\nPor jugador en este último batch:');
for (const u of users) {
  const lines = [];
  let hits = 0;
  for (const mid of recentMarketIds) {
    const ticket = tickets.find((t) => t.user_id === u.id && t.match_market_id === mid);
    if (!ticket) { lines.push('sin ticket'); continue; }
    const s = settleByTicket.get(ticket.id);
    const tAllocs = (allocsByTicket.get(ticket.id) ?? []).filter((a) => a.amount > 0).sort((a, b) => b.amount - a.amount);
    const dom = tAllocs[0] ? outcomeById.get(tAllocs[0].market_outcome_id)?.code : null;
    const hit = dom && s && dom === s.winning_outcome_code;
    if (hit) hits++;
    const mk = marketById.get(mid);
    const mt = matchById.get(mk.match_id);
    lines.push(`${teamName.get(mt.home_team_id)}-${teamName.get(mt.away_team_id)}: pick=${dom} win=${s?.winning_outcome_code} ${hit ? 'HIT' : '-'}`);
  }
  console.log(`  ${u.display_name.padEnd(10)} +${hits}  | ${lines.join(' || ')}`);
}
