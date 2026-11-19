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

const users = await fetchAll('users', 'id, display_name, is_active');
const userName = new Map(users.map((u) => [u.id, u.display_name]));
const teams = await fetchAll('teams', 'id, name');
const tn = (id) => teams.find((t) => t.id === id)?.name ?? '?';
const matches = await fetchAll('matches', 'id, status, kickoff_at, home_team_id, away_team_id, home_score_90, away_score_90, home_score_ft, away_score_ft, winner_team_id, winner_mode');
const matchById = new Map(matches.map((m) => [m.id, m]));
const markets = await fetchAll('match_markets', 'id, match_id, market_type, status, settled_at, winning_outcome_code');
const marketByMatch = new Map(markets.map((m) => [m.match_id, m]));
const marketById = new Map(markets.map((m) => [m.id, m]));
const outcomes = await fetchAll('market_outcomes', 'id, match_market_id, code');
const outcomeById = new Map(outcomes.map((o) => [o.id, o]));
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');
const ticketsByMarket = new Map();
for (const t of tickets) {
  if (!ticketsByMarket.has(t.match_market_id)) ticketsByMarket.set(t.match_market_id, []);
  ticketsByMarket.get(t.match_market_id).push(t);
}
const allocs = await fetchAll('ticket_allocations', 'ticket_id, market_outcome_id, amount');
const allocsByTicket = new Map();
for (const a of allocs) {
  if (!allocsByTicket.has(a.ticket_id)) allocsByTicket.set(a.ticket_id, []);
  allocsByTicket.get(a.ticket_id).push(a);
}
const settlements = await fetchAll('settlements', 'ticket_id, winning_outcome_code, net_result_amount');
const settleByTicket = new Map(settlements.map((s) => [s.ticket_id, s]));

function expected1x2(m) {
  if (m.home_score_90 == null || m.away_score_90 == null) return null;
  if (m.home_score_90 > m.away_score_90) return 'home';
  if (m.away_score_90 > m.home_score_90) return 'away';
  return 'draw';
}

console.log('=== MARKET TYPES ===');
const typeCounts = {};
for (const mk of markets) typeCounts[mk.market_type] = (typeCounts[mk.market_type] || 0) + 1;
console.log(typeCounts);

console.log('\n=== RECONCILIACIÓN POR PARTIDO ===');
const problems = [];
const activeUsers = users.filter((u) => u.is_active);
for (const m of matches.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))) {
  const mk = marketByMatch.get(m.id);
  const label = `${m.kickoff_at.slice(0, 16)} ${tn(m.home_team_id)} vs ${tn(m.away_team_id)}`;
  if (!mk) { problems.push(`SIN MARKET: ${label} (status=${m.status})`); continue; }

  const exp = mk.market_type === '1x2' ? expected1x2(m) : null;
  const mkTickets = ticketsByMarket.get(mk.id) ?? [];
  const settledCount = mkTickets.filter((t) => settleByTicket.has(t.id)).length;

  if (m.status === 'finished') {
    if (!mk.winning_outcome_code) problems.push(`FINISHED sin winning_outcome_code: ${label}`);
    if (mk.market_type === '1x2' && exp && mk.winning_outcome_code && exp !== mk.winning_outcome_code)
      problems.push(`CÓDIGO STALE/ERRÓNEO: ${label} score90=${m.home_score_90}-${m.away_score_90} ft=${m.home_score_ft}-${m.away_score_ft} stored=${mk.winning_outcome_code} esperado=${exp}`);
    if (mkTickets.length > 0 && settledCount === 0)
      problems.push(`FINISHED con tickets(${mkTickets.length}) pero 0 settlements: ${label} (market.status=${mk.status})`);
    if (settledCount > 0 && settledCount < mkTickets.length)
      problems.push(`SETTLEMENTS PARCIALES: ${label} tickets=${mkTickets.length} settlements=${settledCount}`);
    if (m.home_score_ft != null && m.away_score_ft != null && (m.home_score_ft !== m.home_score_90 || m.away_score_ft !== m.away_score_90))
      problems.push(`FT≠90 (knockout/ET?): ${label} 90=${m.home_score_90}-${m.away_score_90} ft=${m.home_score_ft}-${m.away_score_ft} winner_mode=${m.winner_mode} code=${mk.winning_outcome_code}`);
    const sMismatch = mkTickets.filter((t) => { const s = settleByTicket.get(t.id); return s && s.winning_outcome_code !== mk.winning_outcome_code; });
    if (sMismatch.length) problems.push(`SETTLEMENT.code ≠ MARKET.code en ${sMismatch.length} tickets: ${label}`);
  } else {
    if (mk.settled_at) problems.push(`NO finished pero market settled: ${label} (status=${m.status} market=${mk.status})`);
    if (settledCount > 0) problems.push(`NO finished pero ${settledCount} settlements: ${label}`);
  }
}
if (problems.length === 0) console.log('✅ sin problemas');
else problems.forEach((p) => console.log('⚠️ ' + p));

console.log('\n=== EMPATES DE ALLOCATION (dominante ambiguo) ===');
let tieCount = 0;
const tieDetail = [];
for (const t of tickets) {
  const a = (allocsByTicket.get(t.id) ?? []).filter((x) => x.amount > 0).sort((x, y) => y.amount - x.amount);
  if (a.length >= 2 && a[0].amount === a[1].amount) {
    tieCount++;
    const mk = marketById.get(t.match_market_id);
    const s = settleByTicket.get(t.id);
    if (s) {
      const tiedCodes = a.filter((x) => x.amount === a[0].amount).map((x) => outcomeById.get(x.market_outcome_id)?.code);
      const winnerInTie = tiedCodes.includes(s.winning_outcome_code);
      tieDetail.push({ user: userName.get(t.user_id), match: mk ? `${tn(matchById.get(mk.match_id).home_team_id)}-${tn(matchById.get(mk.match_id).away_team_id)}` : '?', tiedCodes, win: s.winning_outcome_code, winnerInTie });
    }
  }
}
console.log(`tickets con empate en monto máximo: ${tieCount}`);
const ambiguousHits = tieDetail.filter((d) => d.winnerInTie);
console.log(`de esos, con el ganador entre los empatados (acierto ambiguo): ${ambiguousHits.length}`);
ambiguousHits.forEach((d) => console.log(`   ${d.user} | ${d.match} | empató ${d.tiedCodes.join('/')} | ganó ${d.win}`));

console.log('\n=== HITS bajo 2 definiciones ===');
const strictHits = new Map();
const anyAllocHits = new Map();
const bump = (map, uid) => map.set(uid, (map.get(uid) || 0) + 1);
for (const s of settlements) {
  const t = tickets.find((x) => x.id === s.ticket_id);
  if (!t) continue;
  const a = (allocsByTicket.get(t.id) ?? []).filter((x) => x.amount > 0).sort((x, y) => y.amount - x.amount);
  const dom = a[0] ? outcomeById.get(a[0].market_outcome_id)?.code : null;
  if (dom && dom === s.winning_outcome_code) bump(strictHits, t.user_id);
  const anyOnWinner = a.some((x) => outcomeById.get(x.market_outcome_id)?.code === s.winning_outcome_code);
  if (anyOnWinner) bump(anyAllocHits, t.user_id);
}
console.log('jugador      strict(actual)  any-alloc');
for (const u of activeUsers.sort((x, y) => (strictHits.get(y.id) || 0) - (strictHits.get(x.id) || 0))) {
  console.log(`  ${u.display_name.padEnd(10)} ${String(strictHits.get(u.id) || 0).padStart(6)}        ${String(anyAllocHits.get(u.id) || 0).padStart(6)}`);
}

console.log('\n=== COUNTS ===');
console.log(`matches: ${matches.length} | finished: ${matches.filter((m) => m.status === 'finished').length} | markets: ${markets.length} | settled markets: ${markets.filter((m) => m.settled_at).length}`);
console.log(`tickets: ${tickets.length} | settlements: ${settlements.length} | allocations: ${allocs.length}`);
