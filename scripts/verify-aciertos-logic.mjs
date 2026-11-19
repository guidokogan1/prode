import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, columns) {
  const rows = []; let from = 0; const size = 1000;
  for (;;) { const { data, error } = await sb.from(table).select(columns).range(from, from + size - 1); if (error) throw error; rows.push(...data); if (data.length < size) break; from += size; }
  return rows;
}
const ES = { home: 'gana local', away: 'gana visitante', draw: 'empate' };

const users = (await fetchAll('users', 'id, display_name, is_active')).filter(u => u.is_active);
const userName = new Map(users.map(u => [u.id, u.display_name]));
const teams = await fetchAll('teams', 'id, name');
const tn = (id) => teams.find(t => t.id === id)?.name;
const matches = await fetchAll('matches', 'id, home_team_id, away_team_id, kickoff_at');
const matchById = new Map(matches.map(m => [m.id, m]));
const markets = await fetchAll('match_markets', 'id, match_id, winning_outcome_code');
const marketById = new Map(markets.map(m => [m.id, m]));
const outcomes = await fetchAll('market_outcomes', 'id, code');
const ocCode = new Map(outcomes.map(o => [o.id, o.code]));
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');
const ticketById = new Map(tickets.map(t => [t.id, t]));
const allocs = await fetchAll('ticket_allocations', 'ticket_id, market_outcome_id, amount');
const allocsByTicket = new Map();
for (const a of allocs) { if (!allocsByTicket.has(a.ticket_id)) allocsByTicket.set(a.ticket_id, []); allocsByTicket.get(a.ticket_id).push(a); }
const settlements = await fetchAll('settlements', 'ticket_id, winning_outcome_code');

let totalHits = 0;
let betOnWinnerButNotMainPick = 0;
let countedWrong = 0;
const examplesByUser = new Map();

for (const s of settlements) {
  const t = ticketById.get(s.ticket_id); if (!t) continue;
  const win = s.winning_outcome_code;
  const a = (allocsByTicket.get(t.id) ?? []).filter(x => x.amount > 0).sort((x, y) => y.amount - x.amount);
  if (!a.length) continue;
  const dom = ocCode.get(a[0].market_outcome_id);
  const mainPickAmount = a[0].amount;
  const onWinner = a.find(x => ocCode.get(x.market_outcome_id) === win);
  const amountOnWinner = onWinner?.amount ?? 0;

  const counted = dom === win;
  if (counted) totalHits++;

  if (amountOnWinner > 0 && dom !== win) {
    betOnWinnerButNotMainPick++;
    if (counted) countedWrong++;
    const mk = marketById.get(t.match_market_id);
    const m = matchById.get(mk.match_id);
    const uid = t.user_id;
    if (!examplesByUser.has(uid)) examplesByUser.set(uid, []);
    examplesByUser.get(uid).push(`${tn(m.home_team_id)} vs ${tn(m.away_team_id)}: picó ${ES[dom]} ($${mainPickAmount}) y tiró $${amountOnWinner} al ganador (${ES[win]}) → NO le cuenta ✓`);
  }
}

console.log('=== PRINCIPIO: el acierto es del PICK PRINCIPAL (mayor monto), no de quien tiró unos pesos al ganador ===\n');
console.log(`Casos reales donde alguien puso plata en el ganador PERO su pick principal era otro: ${betOnWinnerButNotMainPick}`);
console.log(`De esos, ¿cuántos se contaron mal (acierto regalado)?: ${countedWrong} ${countedWrong === 0 ? '✅' : '⚠️'}\n`);

console.log('=== EJEMPLOS CONCRETOS (2 por jugador) ===');
for (const u of users) {
  const ex = examplesByUser.get(u.id) ?? [];
  if (!ex.length) continue;
  console.log(`\n${u.display_name}:`);
  ex.slice(0, 2).forEach(e => console.log('  · ' + e));
}
