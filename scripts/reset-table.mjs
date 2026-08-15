import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const confirm = process.argv.includes('--confirm');

const FECHA_6_STARTS_AT = '2026-08-21T00:00:00Z';

async function fetchAll(table, columns) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

const matches = await fetchAll('matches', 'id, kickoff_at, status');
const markets = await fetchAll('match_markets', 'id, match_id, status');
const settlements = await fetchAll('settlements', '*');
const snapshots = await fetchAll('leaderboard_snapshots', '*');
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');

const marketById = new Map(markets.map((m) => [m.id, m]));
const matchById = new Map(matches.map((m) => [m.id, m]));
const ticketById = new Map(tickets.map((t) => [t.id, t]));

const afterCutoff = settlements.filter((s) => {
  const market = marketById.get(ticketById.get(s.ticket_id)?.match_market_id);
  const match = market ? matchById.get(market.match_id) : null;
  return match && match.kickoff_at >= FECHA_6_STARTS_AT;
});

console.log(`settlements totales: ${settlements.length}`);
console.log(`leaderboard_snapshots: ${snapshots.length}`);
console.log(`settlements de fecha 6 en adelante (NO deberia haber ninguno): ${afterCutoff.length}`);

const stillOpen = matches.filter((m) => m.kickoff_at < FECHA_6_STARTS_AT && m.status !== 'finished');
console.log(`partidos previos a fecha 6 sin terminar: ${stillOpen.length}`);
for (const m of stillOpen) console.log(`  ${m.kickoff_at}  ${m.status}`);

if (afterCutoff.length > 0) {
  console.error('\nABORTADO: hay settlements posteriores al corte. Revisar antes de borrar.');
  process.exit(1);
}

if (stillOpen.length > 0) {
  console.error('\nABORTADO: quedan partidos previos a la fecha 6 sin liquidar. Esperar a que cierre la fecha 5.');
  process.exit(1);
}

const backupPath = `scripts/backup-reset-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(backupPath, JSON.stringify({ settlements, snapshots }, null, 2));
console.log(`\nbackup escrito en ${backupPath}`);

if (!confirm) {
  console.log('\nDRY RUN. Para ejecutar de verdad: node --env-file=.env.local scripts/reset-table.mjs --confirm');
  process.exit(0);
}

const deleteSettlements = await sb.from('settlements').delete().not('id', 'is', null);
if (deleteSettlements.error) throw new Error(`borrar settlements: ${deleteSettlements.error.message}`);

const deleteSnapshots = await sb.from('leaderboard_snapshots').delete().not('id', 'is', null);
if (deleteSnapshots.error) throw new Error(`borrar snapshots: ${deleteSnapshots.error.message}`);

const remainingSettlements = await fetchAll('settlements', 'id');
const remainingSnapshots = await fetchAll('leaderboard_snapshots', 'id');
console.log(`\nlisto. settlements restantes: ${remainingSettlements.length} | snapshots restantes: ${remainingSnapshots.length}`);
console.log('los match_markets quedan en "settled", asi que el cron no vuelve a liquidar los partidos viejos.');
