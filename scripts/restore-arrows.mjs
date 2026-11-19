import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MATCH_CREDIT = 10000;
const APPLY = process.argv.includes('--apply');

async function fetchAll(table, columns) {
  const rows = []; let from = 0; const size = 1000;
  for (;;) { const { data, error } = await sb.from(table).select(columns).range(from, from + size - 1); if (error) throw error; rows.push(...data); if (data.length < size) break; from += size; }
  return rows;
}

const users = (await fetchAll('users', 'id, display_name, is_active')).filter(u => u.is_active);
const userName = new Map(users.map(u => [u.id, u.display_name]));
const matches = await fetchAll('matches', 'id, kickoff_at, status');
const markets = await fetchAll('match_markets', 'id, match_id');
const matchByMarket = new Map(markets.map(m => [m.id, m.match_id]));
const kickoffByMatch = new Map(matches.map(m => [m.id, m.kickoff_at]));
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');
const ticketUser = new Map(tickets.map(t => [t.id, t.user_id]));
const ticketMatch = new Map(tickets.map(t => [t.id, matchByMarket.get(t.match_market_id)]));
const outcomes = await fetchAll('market_outcomes', 'id, code');
const ocCode = new Map(outcomes.map(o => [o.id, o.code]));
const allocs = await fetchAll('ticket_allocations', 'ticket_id, market_outcome_id, amount');
const allocsByTicket = new Map();
for (const a of allocs) { if (!allocsByTicket.has(a.ticket_id)) allocsByTicket.set(a.ticket_id, []); allocsByTicket.get(a.ticket_id).push(a); }
const settlements = await fetchAll('settlements', 'ticket_id, winning_outcome_code, net_result_amount');

const lastKickoff = matches.filter(m => m.status === 'finished').map(m => m.kickoff_at).sort().at(-1);
const lastBatchMatches = matches.filter(m => m.kickoff_at === lastKickoff).map(m => m.id);
console.log('Último partido jugado (kickoff):', lastKickoff);

function standings(excludeMatchIds) {
  const ex = new Set(excludeMatchIds);
  const agg = new Map();
  const get = uid => { if (!agg.has(uid)) agg.set(uid, { gross: 0, hits: 0, best: 0 }); return agg.get(uid); };
  for (const s of settlements) {
    const uid = ticketUser.get(s.ticket_id); if (!uid) continue;
    if (ex.has(ticketMatch.get(s.ticket_id))) continue;
    const g = get(uid);
    const gross = s.net_result_amount + MATCH_CREDIT;
    g.gross += gross; g.best = Math.max(g.best, gross);
    const a = (allocsByTicket.get(s.ticket_id) ?? []).filter(x => x.amount > 0).sort((x, y) => y.amount - x.amount);
    const dom = a[0] ? ocCode.get(a[0].market_outcome_id) : null;
    if (dom && dom === s.winning_outcome_code) g.hits += 1;
  }
  return users.map(u => ({ id: u.id, name: u.display_name, ...get(u.id) }))
    .sort((a, b) => b.gross - a.gross || b.hits - a.hits || b.best - a.best || a.name.localeCompare(b.name))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

const after = standings([]);
const before = standings(lastBatchMatches);
const beforeRank = new Map(before.map(r => [r.id, r.rank]));

console.log('\npos | jugador    | antes | ahora | flecha');
for (const r of after) {
  const prev = beforeRank.get(r.id);
  const move = prev - r.rank;
  const arrow = move > 0 ? `▲${move}` : move < 0 ? `▼${Math.abs(move)}` : '—';
  console.log(`${String(r.rank).padStart(2)}  | ${r.name.padEnd(10)} | ${String(prev).padStart(4)}  | ${String(r.rank).padStart(4)}  | ${arrow}`);
}

const { data: snaps } = await sb.from('leaderboard_snapshots').select('user_id, rank_position');
const storedRank = new Map(snaps.map(s => [s.user_id, s.rank_position]));
const mismatch = after.filter(r => storedRank.get(r.id) !== r.rank);
console.log(`\nchequeo: orden calculado == rank_position guardado? ${mismatch.length === 0 ? 'sí ✅' : '⚠️ NO: ' + mismatch.map(r=>r.name).join(',')}`);

if (!APPLY) { console.log('\n(preview — no escribí nada. Correr con --apply para guardar previous_rank_position)'); process.exit(0); }
if (mismatch.length) { console.log('\n⚠️ Abortado: el orden calculado no coincide con el guardado, no toco nada.'); process.exit(1); }

let ok = 0;
for (const r of after) {
  const prev = beforeRank.get(r.id);
  const { error } = await sb.from('leaderboard_snapshots').update({ previous_rank_position: prev }).eq('user_id', r.id);
  if (error) { console.log('error', r.name, error.message); } else ok++;
}
console.log(`\n✅ Actualizado previous_rank_position en ${ok}/${after.length} jugadores. (rank_position y plata sin tocar)`);
