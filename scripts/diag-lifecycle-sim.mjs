import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const now = Date.now();

function deriveMarketStatus({ currentStatus, matchStatus, lockAt, hasWinningOutcome }) {
  const lockTime = lockAt ? new Date(lockAt).getTime() : null;
  const kickoffPassed = lockTime != null ? lockTime <= now : false;
  if (hasWinningOutcome && matchStatus === 'finished') return 'settled';
  if (matchStatus === 'live') return 'revealed';
  if (matchStatus === 'finished') return currentStatus === 'settled' ? 'settled' : 'revealed';
  if (kickoffPassed) return 'locked';
  return 'open';
}

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

const markets = await fetchAll('match_markets', 'id, match_id, status, lock_at, winning_outcome_code, match:matches!inner(status, kickoff_at)');
const tickets = await fetchAll('tickets', 'id, match_market_id');
const ticketsByMarket = new Map();
for (const t of tickets) ticketsByMarket.set(t.match_market_id, (ticketsByMarket.get(t.match_market_id) ?? 0) + 1);

const tally = { skipWrite: 0, write: 0, wouldSettle: 0, wouldRecompute: 0, downgraded: 0 };
const settleTargets = [];

for (const m of markets) {
  const derived = deriveMarketStatus({
    currentStatus: m.status,
    matchStatus: m.match.status,
    lockAt: m.lock_at,
    hasWinningOutcome: Boolean(m.winning_outcome_code),
  });
  const persisted = derived === 'settled' && m.status !== 'settled' ? 'revealed' : derived;
  const unchanged = persisted === m.status;

  if (unchanged) tally.skipWrite += 1;
  else tally.write += 1;

  if (m.status === 'settled' && persisted !== 'settled') {
    tally.downgraded += 1;
    console.log(`  !! DEGRADADO ${m.match_id}: settled -> ${persisted}`);
  }

  if (derived === 'settled' && m.status !== 'settled') {
    tally.wouldSettle += 1;
    settleTargets.push({ id: m.match_id, kickoff: m.match.kickoff_at, tickets: ticketsByMarket.get(m.id) ?? 0 });
  } else if (derived === 'revealed' && m.status !== 'revealed') {
    tally.wouldRecompute += 1;
  }
}

console.log(`markets: ${markets.length}`);
console.log(`  sin escritura (no-op): ${tally.skipWrite}`);
console.log(`  con escritura:         ${tally.write}`);
console.log(`  liquidarian ahora:     ${tally.wouldSettle}`);
console.log(`  recomputarian tabla:   ${tally.wouldRecompute}`);
console.log(`  DEGRADADOS desde settled (debe ser 0): ${tally.downgraded}`);
if (settleTargets.length) {
  console.log('\n  se liquidarian:');
  for (const t of settleTargets.slice(0, 10)) console.log(`    ${t.id} kickoff=${t.kickoff} tickets=${t.tickets}`);
}
