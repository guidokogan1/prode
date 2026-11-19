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

const matches = await fetchAll('matches', 'id, status, kickoff_at, home_team_id, away_team_id, home_score_90, away_score_90, home_score_ft, away_score_ft, winner_team_id, stage_id');
const markets = await fetchAll('match_markets', 'id, match_id, market_type, status, settled_at, winning_outcome_code');
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');
const settlements = await fetchAll('settlements', 'id, ticket_id, net_result_amount, gross_return_amount, winning_outcome_code, settled_at');
const users = await fetchAll('users', 'id, display_name, is_active');

console.log('=== MATCHES by status ===');
const byStatus = {};
for (const m of matches) byStatus[m.status] = (byStatus[m.status] || 0) + 1;
console.log(byStatus, ' total:', matches.length);

const notFinished = matches.filter((m) => m.status !== 'finished');
console.log('\n=== MATCHES not finished ===');
if (notFinished.length === 0) console.log('none — all finished');
for (const m of notFinished) console.log(`  ${m.id}  status=${m.status}  winner=${m.winner_team_id}  score90=${m.home_score_90}-${m.away_score_90}`);

console.log('\n=== MARKETS by status ===');
const mByStatus = {};
for (const mk of markets) mByStatus[mk.status] = (mByStatus[mk.status] || 0) + 1;
console.log(mByStatus, ' total:', markets.length);

const unsettledMarkets = markets.filter((mk) => !mk.settled_at || mk.status !== 'settled');
console.log('\n=== MARKETS not settled ===');
if (unsettledMarkets.length === 0) console.log('none — all markets settled');
for (const mk of unsettledMarkets) {
  const nTickets = tickets.filter((t) => t.match_market_id === mk.id).length;
  console.log(`  match=${mk.match_id}  type=${mk.market_type}  status=${mk.status}  settled_at=${mk.settled_at}  tickets=${nTickets}`);
}

console.log('\n=== TICKETS vs SETTLEMENTS ===');
const settledTicketIds = new Set(settlements.map((s) => s.ticket_id));
const unsettledTickets = tickets.filter((t) => !settledTicketIds.has(t.id));
console.log(`tickets total: ${tickets.length}  |  settlements: ${settlements.length}  |  tickets sin settlement: ${unsettledTickets.length}`);
if (unsettledTickets.length > 0) {
  const byMarket = {};
  for (const t of unsettledTickets) {
    const mk = markets.find((m) => m.id === t.match_market_id);
    const label = mk ? `${mk.match_id}/${mk.market_type}` : t.match_market_id;
    byMarket[label] = (byMarket[label] || 0) + 1;
  }
  console.log('  unsettled tickets by market:', byMarket);
}

console.log('\n=== CHAMPION market ===');
const { data: champMarket } = await sb.from('champion_market').select('id, status, settled_at, winning_team_id, lock_at');
const teams = await fetchAll('teams', 'id, name');
const teamName = new Map(teams.map((t) => [t.id, t.name]));
const userName = new Map(users.map((u) => [u.id, u.display_name]));
for (const cm of (champMarket || [])) {
  console.log(`  status=${cm.status}  settled_at=${cm.settled_at}  winner=${teamName.get(cm.winning_team_id) || cm.winning_team_id}  lock_at=${cm.lock_at}`);
}
console.log('\n=== CHAMPION picks ===');
const { data: champPicks } = await sb.from('champion_picks').select('user_id, team_id, net_result_amount, gross_return_amount, settled_at');
if (!champPicks) {
  console.log('champion_picks empty');
} else {
  const settledC = champPicks.filter((c) => c.settled_at || c.net_result_amount != null);
  console.log(`champion_picks: ${champPicks.length}  |  settled: ${settledC.length}  |  unsettled: ${champPicks.length - settledC.length}`);
  for (const c of champPicks) {
    console.log(`  ${(userName.get(c.user_id) || '?').padEnd(10)} → ${(teamName.get(c.team_id) || '?').padEnd(12)} net=${c.net_result_amount}  gross=${c.gross_return_amount}  settled_at=${c.settled_at}`);
  }
}

console.log('\n=== LEADERBOARD snapshots (current) ===');
const snaps = await fetchAll('leaderboard_snapshots', 'user_id, rank_position, total_net_amount, positive_tickets_count, best_single_net_amount, as_of');
snaps.sort((a, b) => (a.rank_position ?? 99) - (b.rank_position ?? 99));
for (const s of snaps) {
  console.log(`  #${String(s.rank_position).padStart(2)}  ${(userName.get(s.user_id) || '?').padEnd(10)}  net=${s.total_net_amount}  aciertos=${s.positive_tickets_count}  best=${s.best_single_net_amount}  as_of=${s.as_of}`);
}
