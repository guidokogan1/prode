import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const AFTER = 5 * 60 * 60 * 1000;
const BEFORE = 10 * 60 * 1000;

async function windowAt(label, atMs) {
  const start = new Date(atMs - AFTER).toISOString();
  const end = new Date(atMs + BEFORE).toISOString();
  const { data, error } = await sb
    .from('match_markets')
    .select('match_id, status, match:matches!inner(kickoff_at, status)')
    .neq('status', 'settled')
    .gte('match.kickoff_at', start)
    .lte('match.kickoff_at', end);
  if (error) throw new Error(error.message);
  console.log(`\n${label}  (${new Date(atMs).toISOString()})`);
  console.log(`  partidos en ventana: ${data.length}`);
  for (const r of data.slice(0, 8)) {
    console.log(`    ${r.match.kickoff_at}  match=${r.match.status}  market=${r.status}`);
  }
}

await windowAt('AHORA', Date.now());
await windowAt('VIERNES 21/08 al arrancar el 1er partido', new Date('2026-08-21T17:35:00Z').getTime());
await windowAt('VIERNES 21/08 tres horas despues', new Date('2026-08-21T20:30:00Z').getTime());
await windowAt('SABADO 22/08 noche', new Date('2026-08-22T22:00:00Z').getTime());

const { data: stale, error: staleError } = await sb
  .from('match_markets')
  .select('match_id, status, match:matches!inner(kickoff_at)')
  .neq('status', 'settled')
  .lt('match.kickoff_at', new Date().toISOString());
if (staleError) throw new Error(staleError.message);
console.log(`\ncontrol: markets NO settled con kickoff ya pasado (deberia ser 0): ${stale.length}`);
for (const r of stale.slice(0, 5)) console.log(`    ${r.match.kickoff_at}  market=${r.status}`);
