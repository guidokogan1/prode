import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CHAMPION_CREDIT = 10000;
const KNOCKOUT_CREDIT = 15000;

async function fetchAll(table, columns, filter) {
  const rows = [];
  let from = 0;
  const size = 1000;
  for (;;) {
    let q = sb.from(table).select(columns).range(from, from + size - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return rows;
}

const users = await fetchAll('users', 'id, display_name, is_active');
const nameOf = new Map(users.map((u) => [u.id, u.display_name]));
const teams = await fetchAll('teams', 'id, name');
const teamName = new Map(teams.map((t) => [t.id, t.name]));

const agg = new Map();
const get = (uid) => {
  if (!agg.has(uid)) agg.set(uid, { name: nameOf.get(uid), net: 0, gross: 0, hitsDom: 0, hitsNet: 0 });
  return agg.get(uid);
};

const matches = await fetchAll('matches', 'id, home_score_90, away_score_90, home_score_ft, away_score_ft, winner_team_id');
const matchById = new Map(matches.map((m) => [m.id, m]));
const markets = await fetchAll('match_markets', 'id, match_id, market_type, winning_outcome_code');
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
const settlements = await fetchAll('settlements', 'ticket_id, net_result_amount, gross_return_amount, winning_outcome_code');

function dominantCode(ticketId) {
  const ta = (allocsByTicket.get(ticketId) ?? []).filter((a) => a.amount > 0).sort((a, b) => b.amount - a.amount);
  if (!ta.length) return null;
  if (ta.length > 1 && ta[0].amount === ta[1].amount) return null;
  return outcomeById.get(ta[0].market_outcome_id)?.code ?? null;
}

for (const s of settlements) {
  const t = ticketById.get(s.ticket_id);
  if (!t) continue;
  const u = get(t.user_id);
  u.net += Number(s.net_result_amount);
  u.gross += Number(s.gross_return_amount);
  if (Number(s.net_result_amount) > 0) u.hitsNet += 1;
  const dom = dominantCode(s.ticket_id);
  if (dom && dom === s.winning_outcome_code) u.hitsDom += 1;
}

const FINAL_ID = 'final-esp-arg';
const finalMarket = markets.find((m) => m.match_id === FINAL_ID);
const finalTickets = tickets.filter((t) => t.match_market_id === finalMarket.id);
const finalOutcomes = outcomes.filter((o) => o.match_market_id === finalMarket.id);
const codeById = new Map(finalOutcomes.map((o) => [o.id, o.code]));
const WIN_FINAL = 'home_qualifies';
let totalPool = 0;
let winningPool = 0;
const finalStake = new Map();
const finalWinBet = new Map();
for (const t of finalTickets) {
  const ta = allocsByTicket.get(t.id) ?? [];
  let stake = 0;
  let winBet = 0;
  for (const a of ta) {
    stake += Number(a.amount);
    if (codeById.get(a.market_outcome_id) === WIN_FINAL) winBet += Number(a.amount);
  }
  finalStake.set(t.id, stake);
  finalWinBet.set(t.id, winBet);
  totalPool += stake;
  winningPool += winBet;
}
console.log(`FINAL pari-mutuel: totalPool=${totalPool}  winningPool=${winningPool}  (winning outcome=${WIN_FINAL})`);
for (const t of finalTickets) {
  const u = get(t.user_id);
  const winBet = finalWinBet.get(t.id);
  const stake = finalStake.get(t.id);
  const gross = winningPool > 0 ? (winBet / winningPool) * totalPool : 0;
  const net = gross - stake;
  u.net += net;
  u.gross += gross;
  if (net > 0) u.hitsNet += 1;
  const dom = dominantCode(t.id);
  if (dom && dom === WIN_FINAL) u.hitsDom += 1;
}

const ESPANA = teams.find((t) => t.name === 'Espana')?.id;
const champPicks = await fetchAll('champion_picks', 'user_id, team_id');
const totalPoolC = champPicks.length * CHAMPION_CREDIT;
const winnersC = champPicks.filter((p) => p.team_id === ESPANA);
const winningPoolC = winnersC.length * CHAMPION_CREDIT;
console.log(`CHAMPION pari-mutuel: totalPool=${totalPoolC}  winningPool=${winningPoolC}  winners=${winnersC.map((w) => nameOf.get(w.user_id)).join(', ')} (Espana)`);
for (const p of champPicks) {
  const u = get(p.user_id);
  const isW = p.team_id === ESPANA;
  const gross = isW && winningPoolC > 0 ? (totalPoolC * CHAMPION_CREDIT) / winningPoolC : 0;
  const net = gross - CHAMPION_CREDIT;
  u.net += net;
  u.gross += gross;
  if (net > 0) u.hitsNet += 1;
}

const BONUS = { Mariano: 75000, Eli: 75000 };

const list = [...agg.values()];
list.sort((a, b) => b.gross - a.gross);
const f = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

console.log('\n================ RANKING FINAL PROYECTADO (ordenado por GROSS, como la tabla del app) ================');
console.log('  #  jugador     gross          net           aciertos(dom)  aciertos(net>0)   +bonus');
list.forEach((u, i) => {
  const bonus = BONUS[u.name] || 0;
  console.log(
    `  ${String(i + 1).padStart(2)} ${u.name.padEnd(10)} ${f(u.gross).padStart(13)}  ${f(u.net).padStart(12)}   ${String(u.hitsDom).padStart(3)}            ${String(u.hitsNet).padStart(3)}         ${bonus ? '+' + f(bonus) : ''}`
  );
});

console.log('\n================ ACIERTOS (regla documentada: dominante == resultado) — para el bonus ================');
[...list].sort((a, b) => b.hitsDom - a.hitsDom).forEach((u) => console.log(`  ${String(u.hitsDom).padStart(3)}  ${u.name}`));

console.log('\nBONUS 150k → Mariano +75,000 · Eli +75,000 (empatados 69 aciertos dominante)');
console.log('\nSanity: Σ net (todos los settlements+champion, sin bonus) =', f(list.reduce((s, u) => s + u.net, 0)), '(debe ≈ 0, pari-mutuel)');
