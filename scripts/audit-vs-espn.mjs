import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function all(t, c) { const r = []; let f = 0; for (;;) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(`${t}: ${error.message}`); r.push(...data); if (data.length < 1000) break; f += 1000; } return r; }
const [teams, matches, markets] = await Promise.all([
  all('teams', 'id, name'),
  all('matches', 'id, external_id, kickoff_at, status, home_team_id, away_team_id, home_score_90, away_score_90, home_score_ft, away_score_ft, winner_team_id, updated_at'),
  all('match_markets', 'match_id, status, winning_outcome_code, settled_at'),
]);
const tn = new Map(teams.map((t) => [t.id, t.name]));
const mk = new Map(markets.map((m) => [m.match_id, m]));
const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard?dates=20260819-20260824&limit=400';
const res = await fetch(url);
const json = await res.json();
const espn = new Map();
for (const ev of json.events ?? []) {
  const comp = ev.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === 'home');
  const away = comp?.competitors?.find((c) => c.homeAway === 'away');
  espn.set(String(ev.id), {
    name: ev.name,
    state: comp?.status?.type?.state,
    detail: comp?.status?.type?.detail,
    completed: comp?.status?.type?.completed,
    clock: comp?.status?.displayClock,
    period: comp?.status?.period,
    home: home?.score, away: away?.score,
    homeName: home?.team?.displayName, awayName: away?.team?.displayName,
  });
}
console.log(`ESPN eventos en la ventana 19-24/08: ${espn.size}\n`);
const window = matches.filter((m) => m.kickoff_at >= '2026-08-19' && m.kickoff_at <= '2026-08-25').sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
for (const m of window) {
  const eid = String(m.id).replace(/^cl-/, '');
  const e = espn.get(eid);
  const dbScore = `${m.home_score_90 ?? '-'}-${m.away_score_90 ?? '-'}`;
  const espnScore = e ? `${e.home}-${e.away}` : 'NO EN ESPN';
  const mismatch = e && e.completed && (String(e.home) !== String(m.home_score_90) || String(e.away) !== String(m.away_score_90));
  const statusMismatch = e && (e.completed ? m.status !== 'finished' : m.status === 'finished');
  console.log(
    `${m.kickoff_at.slice(0, 16)} ${(tn.get(m.home_team_id) ?? '?').slice(0, 18).padEnd(18)} vs ${(tn.get(m.away_team_id) ?? '?').slice(0, 18).padEnd(18)} db=${dbScore.padEnd(6)} espn=${String(espnScore).padEnd(8)} dbStatus=${m.status.padEnd(9)} espn=${(e?.state ?? '?').padEnd(6)} ${(e?.detail ?? '').padEnd(12)} mkt=${(mk.get(m.id)?.status ?? '-').padEnd(8)} cod=${String(mk.get(m.id)?.winning_outcome_code)}${mismatch ? '  <<< SCORE MISMATCH' : ''}${statusMismatch ? '  <<< STATUS MISMATCH' : ''}`,
  );
}
