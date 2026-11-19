import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CHAMPION_CREDIT = 10000;

async function fetchAll(table, columns) {
  const rows = []; let from = 0; const size = 1000;
  for (;;) { const { data, error } = await sb.from(table).select(columns).range(from, from + size - 1); if (error) throw error; rows.push(...data); if (data.length < size) break; from += size; }
  return rows;
}

const users = await fetchAll('users', 'id, display_name');
const N = new Map(users.map((u) => [u.id, u.display_name]));
const teams = await fetchAll('teams', 'id, name'); const T = new Map(teams.map((t) => [t.id, t.name]));
const ESP = teams.find((t) => t.name === 'Espana').id;

const markets = await fetchAll('match_markets', 'id, winning_outcome_code');
const winByMarket = new Map(markets.map((m) => [m.id, m.winning_outcome_code]));
const outcomes = await fetchAll('market_outcomes', 'id, match_market_id, code');
const outCode = new Map(outcomes.map((o) => [o.id, o.code]));
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');
const tById = new Map(tickets.map((t) => [t.id, t]));
const allocs = await fetchAll('ticket_allocations', 'ticket_id, market_outcome_id, amount');
const allocByTicket = new Map();
for (const a of allocs) { if (!allocByTicket.has(a.ticket_id)) allocByTicket.set(a.ticket_id, []); allocByTicket.get(a.ticket_id).push(a); }
const settlements = await fetchAll('settlements', 'ticket_id, gross_return_amount, winning_outcome_code');
const champ = await fetchAll('champion_picks', 'user_id, team_id, gross_return_amount, net_result_amount, settled_at');
const snaps = await fetchAll('leaderboard_snapshots', 'user_id, total_net_amount');
const netByUser = new Map(snaps.map((s) => [s.user_id, Number(s.total_net_amount)]));

const gross = new Map(); const hits = new Map();
const bumpG = (u, g) => gross.set(u, (gross.get(u) || 0) + g);
const bumpH = (u) => hits.set(u, (hits.get(u) || 0) + 1);

for (const s of settlements) {
  const t = tById.get(s.ticket_id); if (!t) continue;
  bumpG(t.user_id, Number(s.gross_return_amount));
  const ta = (allocByTicket.get(s.ticket_id) ?? []).filter((a) => a.amount > 0).sort((a, b) => b.amount - a.amount);
  if (!ta.length) continue;
  if (ta.length > 1 && ta[0].amount === ta[1].amount) continue;
  const dom = outCode.get(ta[0].market_outcome_id);
  if (dom && dom === s.winning_outcome_code) bumpH(t.user_id);
}
for (const c of champ) {
  if (!c.settled_at) continue;
  const g = c.gross_return_amount != null ? Number(c.gross_return_amount) : (c.net_result_amount != null ? Number(c.net_result_amount) + CHAMPION_CREDIT : 0);
  bumpG(c.user_id, g);
  if (c.team_id === ESP) bumpH(c.user_id);
}

const rows = users.map((u) => ({ name: N.get(u.id), net: netByUser.get(u.id) ?? 0, gross: gross.get(u.id) ?? 0, hits: hits.get(u.id) ?? 0 }));
rows.sort((a, b) => b.gross - a.gross);
const f = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
console.log('=== TABLA FINAL DEL APP (ordenada por gross, como la ve la gente) ===');
console.log('  #  jugador     gross          net           aciertos');
rows.forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)} ${r.name.padEnd(10)} ${f(r.gross).padStart(13)}  ${f(r.net).padStart(12)}   ${String(r.hits).padStart(3)}`));
console.log('\nΣ net =', f(rows.reduce((s, r) => s + r.net, 0)), ' (150.000 = bonus; sin bonus daría 0)');
console.log('Aciertos Mari/Eli:', rows.find((r)=>r.name==='Mariano').hits, '/', rows.find((r)=>r.name==='Eli').hits, '(deben ser 69/69, sin falso acierto por el pick-bonus)');
