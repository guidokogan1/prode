import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

const APPLY = process.argv.includes('--apply');

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

const [markets, outcomes, tickets, allocations] = await Promise.all([
  fetchAll('match_markets', 'id, status'),
  fetchAll('market_outcomes', 'id, match_market_id, code, label'),
  fetchAll('tickets', 'id, match_market_id, credit_total'),
  fetchAll('ticket_allocations', 'id, ticket_id, market_outcome_id, amount'),
]);

const marketById = new Map(markets.map((m) => [m.id, m]));
const allocByTicket = new Map();
for (const alloc of allocations) {
  if (!allocByTicket.has(alloc.ticket_id)) allocByTicket.set(alloc.ticket_id, []);
  allocByTicket.get(alloc.ticket_id).push(alloc);
}

const backupPath = `scripts/backup-allocations-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(backupPath, JSON.stringify(allocations, null, 2));
console.log('backup written:', backupPath, `(${allocations.length} rows)`);

const updates = [];
let skippedNotOpen = 0;
let skippedAllIn = 0;
let skippedTie = 0;
let skippedEmpty = 0;

for (const ticket of tickets) {
  const market = marketById.get(ticket.match_market_id);
  if (market?.status !== 'open') { skippedNotOpen += 1; continue; }

  const rows = allocByTicket.get(ticket.id) ?? [];
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  if (total <= 0) { skippedEmpty += 1; continue; }

  const sorted = [...rows].sort((a, b) => b.amount - a.amount);
  const top = sorted[0];
  const nonZero = rows.filter((row) => row.amount > 0);
  if (nonZero.length === 1 && top.amount === ticket.credit_total) { skippedAllIn += 1; continue; }
  if (sorted.length > 1 && sorted[1].amount === top.amount) { skippedTie += 1; continue; }

  for (const row of rows) {
    const target = row.id === top.id ? ticket.credit_total : 0;
    if (row.amount !== target) updates.push({ id: row.id, amount: target });
  }
}

console.log(`tickets: ${tickets.length} | skipped notOpen ${skippedNotOpen}, allIn ${skippedAllIn}, tie ${skippedTie}, empty ${skippedEmpty}`);
console.log(`allocation rows to update: ${updates.length}`);

if (!APPLY) {
  console.log('\nDRY RUN — no writes. Re-run with --apply to write.');
  process.exit(0);
}

let done = 0;
for (const update of updates) {
  const { error } = await sb.from('ticket_allocations').update({ amount: update.amount }).eq('id', update.id);
  if (error) { console.error('FAILED', update.id, error.message); process.exit(1); }
  done += 1;
}
console.log(`\nAPPLIED ${done} updates.`);
