import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const confirm = process.argv.includes('--confirm');
const fromArg = process.argv.find((arg) => arg.startsWith('--from='))?.slice('--from='.length);

if (!fromArg) {
  console.error('Falta --from=<ISO>. Ej: --from=2026-08-15T17:30:00Z');
  console.error('Todo partido con kickoff ANTERIOR a esa fecha deja de contar para la tabla.');
  process.exit(1);
}

const cutoff = new Date(fromArg);
if (Number.isNaN(cutoff.getTime())) {
  console.error(`--from invalido: ${fromArg}`);
  process.exit(1);
}
const cutoffIso = cutoff.toISOString();

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
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');
const settlements = await fetchAll('settlements', '*');
const snapshots = await fetchAll('leaderboard_snapshots', '*');

const matchById = new Map(matches.map((m) => [m.id, m]));
const marketById = new Map(markets.map((m) => [m.id, m]));
const ticketById = new Map(tickets.map((t) => [t.id, t]));

function matchOfSettlement(settlement) {
  const market = marketById.get(ticketById.get(settlement.ticket_id)?.match_market_id);
  return market ? matchById.get(market.match_id) : null;
}

// Postgres returns "+00:00" and toISOString() returns ".000Z", so the same instant
// compares unequal as strings and "+" sorts before "." Compare instants, never text.
function isBeforeCutoff(kickoffAt) {
  return new Date(kickoffAt).getTime() < cutoff.getTime();
}

const toDelete = [];
const toKeep = [];
const orphans = [];
for (const settlement of settlements) {
  const match = matchOfSettlement(settlement);
  if (!match) orphans.push(settlement);
  else if (isBeforeCutoff(match.kickoff_at)) toDelete.push(settlement);
  else toKeep.push(settlement);
}

console.log(`corte: ${cutoffIso}`);
console.log(`settlements a borrar (kickoff anterior al corte): ${toDelete.length}`);
console.log(`settlements que se conservan (kickoff posterior):  ${toKeep.length}`);
console.log(`settlements huerfanos (sin partido resoluble):     ${orphans.length}`);
console.log(`leaderboard_snapshots a borrar:                    ${snapshots.length}`);

const unfinishedBeforeCutoff = matches.filter((m) => isBeforeCutoff(m.kickoff_at) && m.status !== 'finished');
if (unfinishedBeforeCutoff.length > 0) {
  console.error(`\nABORTADO: ${unfinishedBeforeCutoff.length} partido(s) anteriores al corte todavia no terminaron.`);
  console.error('Si se liquidan despues, van a contar para la tabla nueva sin quererlo.');
  for (const m of unfinishedBeforeCutoff) console.error(`  ${m.kickoff_at}  ${m.status}`);
  process.exit(1);
}

if (orphans.length > 0) {
  console.error('\nABORTADO: hay settlements que no resuelven a un partido. Revisar a mano antes de borrar.');
  process.exit(1);
}

const countingMatches = matches.filter((m) => !isBeforeCutoff(m.kickoff_at));
console.log(`\npartidos que van a contar de ahora en mas: ${countingMatches.length}`);
const nextKickoff = countingMatches.map((m) => new Date(m.kickoff_at).toISOString()).sort()[0];
console.log(`primero de ellos: ${nextKickoff ?? 'ninguno'}`);

const backupPath = `scripts/backup-reset-${cutoffIso.replace(/[:.]/g, '-')}.json`;
writeFileSync(backupPath, JSON.stringify({ cutoff: cutoffIso, settlements, snapshots }, null, 2));
console.log(`\nbackup completo (settlements + snapshots) en ${backupPath}`);

if (!confirm) {
  console.log(`\nDRY RUN. Para ejecutar: node --env-file=.env.local scripts/reset-table.mjs --from=${fromArg} --confirm`);
  process.exit(0);
}

for (const settlement of toDelete) {
  const { error } = await sb.from('settlements').delete().eq('id', settlement.id);
  if (error) throw new Error(`borrar settlement ${settlement.id}: ${error.message}`);
}

const deleteSnapshots = await sb.from('leaderboard_snapshots').delete().not('id', 'is', null);
if (deleteSnapshots.error) throw new Error(`borrar snapshots: ${deleteSnapshots.error.message}`);

const remainingSettlements = await fetchAll('settlements', 'id');
const remainingSnapshots = await fetchAll('leaderboard_snapshots', 'id');
console.log(`\nlisto. settlements restantes: ${remainingSettlements.length} | snapshots restantes: ${remainingSnapshots.length}`);
console.log('los match_markets quedan en "settled", asi que el cron no vuelve a liquidar los partidos viejos.');
console.log('sin snapshots, la tabla lista a todos los usuarios en 0 hasta la primera liquidacion nueva.');
