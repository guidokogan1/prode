import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const FECHA_6_STARTS_AT = '2026-08-21T00:00:00Z';

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
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id, submitted_at');
const markets = await fetchAll('match_markets', 'id, match_id, status');
const matches = await fetchAll('matches', 'id, kickoff_at, status');
const sessions = await fetchAll('user_sessions', 'user_id, created_at', 'app_private');

const marketById = new Map(markets.map((m) => [m.id, m]));
const matchById = new Map(matches.map((m) => [m.id, m]));

const openFromFecha6 = matches.filter((m) => m.kickoff_at >= FECHA_6_STARTS_AT).length;
console.log(`partidos de fecha 6 en adelante (lo unico que va a contar): ${openFromFecha6}\n`);

for (const u of users.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
  const mine = tickets.filter((t) => t.user_id === u.id);
  const fromFecha6 = mine.filter((t) => {
    const market = marketById.get(t.match_market_id);
    const match = market ? matchById.get(market.match_id) : null;
    return match && match.kickoff_at >= FECHA_6_STARTS_AT;
  });
  const logins = sessions.filter((s) => s.user_id === u.id).length;
  const last = mine.map((t) => t.submitted_at).sort().at(-1);
  console.log(
    `${u.display_name.padEnd(14)} alta=${u.created_at.slice(0, 16)}  sesiones=${logins}  tickets=${String(mine.length).padStart(3)}  ` +
      `de-fecha-6=${String(fromFecha6.length).padStart(3)}/${openFromFecha6}  ultimo=${(last ?? '-').slice(0, 16)}`,
  );
}
