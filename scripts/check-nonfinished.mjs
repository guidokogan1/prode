import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: teams } = await sb.from('teams').select('id, name');
const tn = (id) => teams.find((t) => t.id === id)?.name;
const { data: matches } = await sb.from('matches').select('id, status, kickoff_at, home_team_id, away_team_id, home_score_90, away_score_90, home_score_ft, away_score_ft, winner_team_id');

const now = '2026-06-25T23:00';
console.log('=== NO finished ===');
for (const m of matches.filter((x) => x.status !== 'finished').sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))) {
  const hasScore = m.home_score_90 != null || m.away_score_90 != null || m.home_score_ft != null;
  const past = m.kickoff_at < now;
  const flag = hasScore ? ' ⚠️TIENE SCORE' : past ? ' ⚠️KICKOFF PASADO' : '';
  console.log(`${m.kickoff_at.slice(0,16)} ${m.status.padEnd(10)} ${tn(m.home_team_id)} vs ${tn(m.away_team_id)} 90=${m.home_score_90}-${m.away_score_90} ft=${m.home_score_ft}-${m.away_score_ft}${flag}`);
}

console.log('\n=== posibles partidos duplicados (mismo par de equipos) ===');
const seen = new Map();
for (const m of matches) {
  const key = [m.home_team_id, m.away_team_id].join('|');
  if (!seen.has(key)) seen.set(key, []);
  seen.get(key).push(m);
}
for (const [k, arr] of seen) if (arr.length > 1) console.log(`  ${tn(arr[0].home_team_id)} vs ${tn(arr[0].away_team_id)}: ${arr.length} entradas (${arr.map(x=>x.id).join(', ')})`);
