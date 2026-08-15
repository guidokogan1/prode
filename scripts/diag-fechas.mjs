import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: matches, error } = await sb
  .from('matches')
  .select('id, kickoff_at, status, stage:tournament_stages(code, name, sort_order)')
  .order('kickoff_at', { ascending: true })
  .range(0, 999);
if (error) throw error;

const ART = -3 * 60 * 60 * 1000;
const byDay = new Map();
for (const m of matches) {
  const day = new Date(new Date(m.kickoff_at).getTime() + ART).toISOString().slice(0, 10);
  if (!byDay.has(day)) byDay.set(day, []);
  byDay.get(day).push(m);
}

let running = 0;
for (const [day, list] of [...byDay.entries()].sort()) {
  running += list.length;
  const stages = [...new Set(list.map((m) => m.stage?.name ?? '?'))].join(',');
  const statuses = [...new Set(list.map((m) => m.status))].join(',');
  console.log(`${day}  n=${String(list.length).padStart(2)}  acum=${String(running).padStart(3)}  ${statuses.padEnd(18)} ${stages}`);
}

console.log('\nSTAGES');
const stageCount = new Map();
for (const m of matches) {
  const k = `${m.stage?.sort_order} ${m.stage?.code} ${m.stage?.name}`;
  stageCount.set(k, (stageCount.get(k) ?? 0) + 1);
}
for (const [k, n] of [...stageCount.entries()].sort()) console.log(`  ${k}  ->  ${n}`);
