import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

const FOCUS = process.argv[2] || null;

const { data: users } = await sb.from('users').select('id, display_name');
const userName = new Map(users.map((u) => [u.id, u.display_name]));

const { data: teams } = await sb.from('teams').select('id, name');
const teamName = new Map(teams.map((t) => [t.id, t.name]));

const { data: matches } = await sb
  .from('matches')
  .select('id, status, kickoff_at, home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_90, away_score_90, winner_team_id, winner_mode');
const matchById = new Map(matches.map((m) => [m.id, m]));

const { data: markets } = await sb
  .from('match_markets')
  .select('id, match_id, market_type, status, settled_at, winning_outcome_code');
const marketById = new Map(markets.map((m) => [m.id, m]));

const { data: outcomes } = await sb
  .from('market_outcomes')
  .select('id, match_market_id, code, label');
const outcomeById = new Map(outcomes.map((o) => [o.id, o]));

const { data: tickets } = await sb
  .from('tickets')
  .select('id, user_id, match_market_id');
const ticketById = new Map(tickets.map((t) => [t.id, t]));

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

const allocs = await fetchAll('ticket_allocations', 'ticket_id, market_outcome_id, amount');
const allocsByTicket = new Map();
for (const a of allocs) {
  if (!allocsByTicket.has(a.ticket_id)) allocsByTicket.set(a.ticket_id, []);
  allocsByTicket.get(a.ticket_id).push(a);
}

const { data: settlements } = await sb
  .from('settlements')
  .select('ticket_id, winning_outcome_code, net_result_amount, settled_at');

function expectedOutcomeCode(match, market) {
  const hs = match.home_score_ft ?? match.home_score_90;
  const as = match.away_score_ft ?? match.away_score_90;
  if (hs == null || as == null) return null;
  const codes = outcomes.filter((o) => o.match_market_id === market.id).map((o) => o.code);
  const has = (c) => codes.includes(c);
  if (hs > as) return ['HOME', 'H', '1', 'home'].find(has) ?? 'HOME';
  if (hs < as) return ['AWAY', 'A', '2', 'away'].find(has) ?? 'AWAY';
  return ['DRAW', 'D', 'X', 'draw'].find(has) ?? 'DRAW';
}

const recompHits = new Map();
const bumpHit = (uid) => recompHits.set(uid, (recompHits.get(uid) || 0) + 1);

const perUserDetail = new Map();

const mismatchOutcome = [];

for (const s of settlements) {
  const ticket = ticketById.get(s.ticket_id);
  if (!ticket) continue;
  const uid = ticket.user_id;
  const market = marketById.get(ticket.match_market_id);
  const match = market ? matchById.get(market.match_id) : null;

  const tAllocs = (allocsByTicket.get(ticket.id) ?? []).filter((a) => a.amount > 0).sort((a, b) => b.amount - a.amount);
  const dominant = tAllocs[0];
  const dominantCode = dominant ? outcomeById.get(dominant.market_outcome_id)?.code : null;

  const settlementWin = s.winning_outcome_code;
  const marketWin = market?.winning_outcome_code;
  const trueWin = match && market ? expectedOutcomeCode(match, market) : null;

  const isHit = dominantCode != null && dominantCode === settlementWin;
  if (isHit) bumpHit(uid);

  if (trueWin && settlementWin && trueWin !== settlementWin) {
    mismatchOutcome.push({ match: market.match_id, settlementWin, trueWin, marketWin });
  }

  if (!perUserDetail.has(uid)) perUserDetail.set(uid, []);
  perUserDetail.get(uid).push({
    matchId: market?.match_id,
    kickoff: match?.kickoff_at,
    teams: match ? `${teamName.get(match.home_team_id)} vs ${teamName.get(match.away_team_id)}` : '?',
    score: match ? `${match.home_score_ft ?? match.home_score_90}-${match.away_score_ft ?? match.away_score_90}` : '?',
    dominantCode,
    settlementWin,
    marketWin,
    trueWin,
    isHit,
    settledAt: s.settled_at,
  });
}

console.log('=== ACIERTOS recomputados (dominante == settlement.winning_outcome_code) ===');
const ranked = [...recompHits.entries()].map(([uid, h]) => ({ name: userName.get(uid), hits: h })).sort((a, b) => b.hits - a.hits);
for (const r of ranked) console.log(`${String(r.hits).padStart(3)}  ${r.name}`);

console.log('\n=== DISCREPANCIAS: settlement.winning_outcome_code vs resultado real del partido ===');
if (mismatchOutcome.length === 0) console.log('ninguna');
else {
  const seen = new Set();
  for (const m of mismatchOutcome) {
    if (seen.has(m.match)) continue;
    seen.add(m.match);
    const match = matchById.get(m.match);
    console.log(`${m.match} ${teamName.get(match.home_team_id)} vs ${teamName.get(match.away_team_id)} score ${match.home_score_ft ?? match.home_score_90}-${match.away_score_ft ?? match.away_score_90} | settlement=${m.settlementWin} market=${m.marketWin} real=${m.trueWin}`);
  }
}

console.log('\n=== sanity: tickets/settlements/markets ===');
console.log(`settled markets: ${markets.filter((m) => m.settled_at).length} | settlements: ${settlements.length} | tickets: ${tickets.length}`);
const dupSettle = {};
for (const s of settlements) dupSettle[s.ticket_id] = (dupSettle[s.ticket_id] || 0) + 1;
console.log(`tickets con >1 settlement: ${Object.values(dupSettle).filter((c) => c > 1).length}`);

if (FOCUS) {
  const uid = [...userName.entries()].find(([, n]) => n.toLowerCase() === FOCUS.toLowerCase())?.[0];
  if (uid) {
    console.log(`\n=== DETALLE ${FOCUS} ===`);
    const rows = (perUserDetail.get(uid) ?? []).sort((a, b) => (a.kickoff || '').localeCompare(b.kickoff || ''));
    for (const r of rows) {
      const flag = r.settlementWin !== r.trueWin ? ' ⚠️SETTLE≠REAL' : '';
      console.log(`${r.kickoff?.slice(0, 16)} ${r.teams} (${r.score}) pick=${r.dominantCode} win=${r.settlementWin} real=${r.trueWin} ${r.isHit ? 'HIT' : '   '}${flag}`);
    }
    console.log(`Total hits ${FOCUS}: ${rows.filter((r) => r.isHit).length}`);
  }
}
