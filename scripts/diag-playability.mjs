import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const now = Date.now();

function isPickWindowOpen({ marketStatus, matchStatus, lockAt }) {
  if (marketStatus !== 'open') return false;
  if (matchStatus !== 'scheduled') return false;
  return lockAt == null || new Date(lockAt).getTime() > now;
}

const { data, error } = await sb
  .from('match_markets')
  .select('match_id, status, lock_at, match:matches!inner(kickoff_at, status)')
  .order('lock_at', { ascending: true })
  .limit(1000);
if (error) throw new Error(error.message);

const open = data.filter((r) => r.status === 'open');
const future = open.filter((r) => new Date(r.match.kickoff_at).getTime() > now);

const playable = future.filter((r) =>
  isPickWindowOpen({ marketStatus: r.status, matchStatus: r.match.status, lockAt: r.lock_at }),
);
const blocked = future.filter(
  (r) => !isPickWindowOpen({ marketStatus: r.status, matchStatus: r.match.status, lockAt: r.lock_at }),
);

console.log(`markets totales: ${data.length}`);
console.log(`markets open: ${open.length}`);
console.log(`  de esos, con kickoff futuro: ${future.length}`);
console.log(`  JUGABLES ahora:              ${playable.length}`);
console.log(`  BLOQUEADOS por error:        ${blocked.length}`);
for (const r of blocked.slice(0, 10)) {
  console.log(`    ${r.match_id} kickoff=${r.match.kickoff_at} lock_at=${r.lock_at} match=${r.match.status}`);
}

const nullLock = data.filter((r) => r.lock_at == null);
console.log(`\nmarkets con lock_at NULL: ${nullLock.length}`);

const mismatch = data.filter(
  (r) => r.lock_at != null && new Date(r.lock_at).getTime() !== new Date(r.match.kickoff_at).getTime(),
);
console.log(`markets donde lock_at != kickoff: ${mismatch.length}`);
for (const r of mismatch.slice(0, 10)) {
  console.log(`    ${r.match_id} lock_at=${r.lock_at} kickoff=${r.match.kickoff_at} market=${r.status}`);
}

const pastOpen = open.filter((r) => new Date(r.match.kickoff_at).getTime() <= now);
console.log(`\nmarkets open con kickoff ya pasado (el agujero viejo): ${pastOpen.length}`);
for (const r of pastOpen.slice(0, 10)) console.log(`    ${r.match_id} kickoff=${r.match.kickoff_at}`);
