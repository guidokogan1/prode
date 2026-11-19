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

const [users, teams, matches, markets, outcomes, tickets, allocations] = await Promise.all([
  fetchAll('users', 'id, display_name'),
  fetchAll('teams', 'id, name'),
  fetchAll('matches', 'id, home_team_id, away_team_id'),
  fetchAll('match_markets', 'id, match_id, market_type, status'),
  fetchAll('market_outcomes', 'id, match_market_id, code, label'),
  fetchAll('tickets', 'id, user_id, match_market_id, credit_total'),
  fetchAll('ticket_allocations', 'id, ticket_id, market_outcome_id, amount'),
]);

const userName = new Map(users.map((u) => [u.id, u.display_name]));
const teamName = new Map(teams.map((t) => [t.id, t.name]));
const matchById = new Map(matches.map((m) => [m.id, m]));
const marketById = new Map(markets.map((m) => [m.id, m]));
const outcomeById = new Map(outcomes.map((o) => [o.id, o]));

const allocByTicket = new Map();
for (const alloc of allocations) {
  if (!allocByTicket.has(alloc.ticket_id)) allocByTicket.set(alloc.ticket_id, []);
  allocByTicket.get(alloc.ticket_id).push(alloc);
}

function matchLabel(market) {
  const match = matchById.get(market?.match_id);
  if (!match) return market?.match_id ?? '?';
  return `${teamName.get(match.home_team_id) ?? '?'} vs ${teamName.get(match.away_team_id) ?? '?'}`;
}

const byStatus = new Map();
function bump(status, category) {
  if (!byStatus.has(status)) byStatus.set(status, { allIn: 0, migratable: 0, tie: 0, empty: 0 });
  byStatus.get(status)[category] += 1;
}

const samples = [];
const ties = [];

for (const ticket of tickets) {
  const market = marketById.get(ticket.match_market_id);
  const status = market?.status ?? 'unknown';
  const rows = (allocByTicket.get(ticket.id) ?? []).map((alloc) => ({
    code: outcomeById.get(alloc.market_outcome_id)?.code ?? '?',
    label: outcomeById.get(alloc.market_outcome_id)?.label ?? '?',
    amount: alloc.amount,
  }));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  if (total <= 0) { bump(status, 'empty'); continue; }

  const sorted = [...rows].sort((a, b) => b.amount - a.amount);
  const top = sorted[0];
  const nonZero = rows.filter((row) => row.amount > 0);
  const isAllIn = nonZero.length === 1 && top.amount === ticket.credit_total;

  if (isAllIn) { bump(status, 'allIn'); continue; }

  const tie = sorted.length > 1 && sorted[1].amount === top.amount;
  if (tie) {
    bump(status, 'tie');
    ties.push(`[${status}] ${userName.get(ticket.user_id) ?? '?'} · ${matchLabel(market)} · ${sorted.map((r) => `${r.label} ${r.amount}`).join(' / ')}`);
    continue;
  }

  bump(status, 'migratable');
  if (samples.length < 30) {
    samples.push(`[${status}] ${userName.get(ticket.user_id) ?? '?'} · ${matchLabel(market)} · ${sorted.map((r) => `${r.label} ${r.amount}`).join(' / ')}  ->  ${top.label} ${ticket.credit_total}`);
  }
}

console.log('=== TICKETS BY MARKET STATUS ===');
console.log('status'.padEnd(12), 'allIn'.padStart(7), 'migrate'.padStart(9), 'tie'.padStart(5), 'empty'.padStart(7));
for (const [status, counts] of byStatus) {
  console.log(status.padEnd(12), String(counts.allIn).padStart(7), String(counts.migratable).padStart(9), String(counts.tie).padStart(5), String(counts.empty).padStart(7));
}
console.log('\ntotal tickets:', tickets.length, '| total allocations:', allocations.length);

console.log('\n=== SAMPLE MIGRATIONS (up to 30) ===');
for (const line of samples) console.log(line);

console.log('\n=== AMBIGUOUS TIES (would be SKIPPED, need manual decision) ===');
if (!ties.length) console.log('(none)');
for (const line of ties) console.log(line);
