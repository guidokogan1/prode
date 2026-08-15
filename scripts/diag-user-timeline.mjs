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

const users = await fetchAll('users', 'id, display_name, created_at');
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id, submitted_at, updated_at');
const markets = await fetchAll('match_markets', 'id, match_id, status, lock_at');
const matches = await fetchAll('matches', 'id, kickoff_at, status');

const marketById = new Map(markets.map((m) => [m.id, m]));
const matchById = new Map(matches.map((m) => [m.id, m]));

for (const u of users) {
  const ts = tickets
    .filter((t) => t.user_id === u.id)
    .sort((a, b) => (a.submitted_at ?? '').localeCompare(b.submitted_at ?? ''));
  console.log(`\n### ${u.display_name}  (alta ${u.created_at})  tickets=${ts.length}`);
  let prev = null;
  for (const t of ts) {
    const market = marketById.get(t.match_market_id);
    const match = market ? matchById.get(market.match_id) : null;
    const gap = prev ? Math.round((new Date(t.submitted_at) - new Date(prev)) / 1000) : 0;
    prev = t.submitted_at;
    console.log(
      `  ${t.submitted_at}  +${String(gap).padStart(6)}s  kickoff=${(match?.kickoff_at ?? '?').slice(0, 16)}  ${match?.status ?? '?'}`,
    );
  }
}

const sessions = await fetchAll('user_sessions', 'user_id, created_at, expires_at', 'app_private').catch((e) => {
  console.log('sessions err', e.message);
  return [];
});
console.log('\n### SESSIONS');
for (const s of sessions.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))) {
  console.log(`  ${users.find((u) => u.id === s.user_id)?.display_name ?? s.user_id}  ${s.created_at}  exp=${s.expires_at}`);
}
