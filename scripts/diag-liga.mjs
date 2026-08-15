import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, columns, schema) {
  const client = schema ? sb.schema(schema) : sb;
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

const users = await fetchAll('users', 'id, display_name, created_at, is_active');
const matches = await fetchAll('matches', 'id, kickoff_at, status, home_team_id, away_team_id, winner_team_id');
const markets = await fetchAll('match_markets', 'id, match_id, market_type, status, lock_at, settled_at, winning_outcome_code');
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id, submitted_at, updated_at');
const allocations = await fetchAll('ticket_allocations', 'ticket_id, market_outcome_id, amount');
const settlements = await fetchAll('settlements', 'id, ticket_id, net_result_amount, settled_at');
const champion = await fetchAll('champion_picks', 'user_id, team_id, submitted_at');
let events = [];
try { events = await fetchAll('pick_events', 'kind, user_display_name, match_id, created_at'); } catch (e) { events = [{ error: e.message }]; }

const now = new Date();
console.log(`\nUSERS (${users.length})`);
const allocByTicket = new Map();
for (const a of allocations) allocByTicket.set(a.ticket_id, (allocByTicket.get(a.ticket_id) ?? 0) + Number(a.amount ?? 0));
const ticketsByUser = new Map();
for (const t of tickets) {
  if (!ticketsByUser.has(t.user_id)) ticketsByUser.set(t.user_id, []);
  ticketsByUser.get(t.user_id).push(t);
}
for (const u of users.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))) {
  const ts = ticketsByUser.get(u.id) ?? [];
  const empty = ts.filter((t) => !(allocByTicket.get(t.id) > 0)).length;
  const last = ts.map((t) => t.updated_at ?? t.submitted_at).sort().at(-1);
  console.log(
    `  ${(u.display_name ?? '').padEnd(22)} alta=${(u.created_at ?? '').slice(0, 10)} tickets=${String(ts.length).padStart(4)} vacios=${empty} campeon=${champion.some((c) => c.user_id === u.id) ? 'si' : 'NO'} ultimo=${(last ?? '-').slice(0, 16)}`,
  );
}

console.log(`\nMATCHES: ${matches.length}`);
const byStatus = {};
for (const m of matches) byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
console.log('  by status:', byStatus);
const past = matches.filter((m) => new Date(m.kickoff_at) < now);
const future = matches.filter((m) => new Date(m.kickoff_at) >= now);
console.log(`  jugados/pasados: ${past.length} | futuros: ${future.length}`);
const nextFive = future.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at)).slice(0, 5);
for (const m of nextFive) console.log(`    proximo ${m.kickoff_at} ${m.status}`);
const lastFive = past.sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at)).slice(-5);
for (const m of lastFive) console.log(`    ultimo  ${m.kickoff_at} ${m.status} winner=${m.winner_team_id ? 'si' : 'no'}`);

console.log(`\nMARKETS: ${markets.length}`);
const mStatus = {};
for (const m of markets) mStatus[m.status] = (mStatus[m.status] ?? 0) + 1;
console.log('  by status:', mStatus);

console.log(`\nTICKETS: ${tickets.length} | allocations: ${allocations.length} | settlements: ${settlements.length}`);
const emptyTickets = tickets.filter((t) => !(allocByTicket.get(t.id) > 0));
console.log(`  tickets sin allocation (vacios): ${emptyTickets.length}`);
const netByUser = new Map();
const ticketUser = new Map(tickets.map((t) => [t.id, t.user_id]));
for (const s of settlements) {
  const uid = ticketUser.get(s.ticket_id);
  if (!uid) continue;
  netByUser.set(uid, (netByUser.get(uid) ?? 0) + Number(s.net_result_amount ?? 0));
}
console.log('\nTABLA ACTUAL (neto por settlements)');
for (const [uid, net] of [...netByUser.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${(users.find((u) => u.id === uid)?.display_name ?? uid).padEnd(22)} ${net}`);
}

console.log(`\nPICK EVENTS: ${Array.isArray(events) && events[0]?.error ? events[0].error : events.length}`);
if (Array.isArray(events) && !events[0]?.error) {
  const evByUser = new Map();
  for (const e of events) evByUser.set(e.user_display_name, (evByUser.get(e.user_display_name) ?? 0) + 1);
  for (const [name, n] of [...evByUser.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(name).padEnd(22)} ${n}`);
}

const snapshots = await fetchAll('leaderboard_snapshots', 'id, as_of').catch(() => []);
console.log(`\nSNAPSHOTS: ${snapshots.length}`);
