import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes('--apply');
const ESPN_TO_DB = { RSA: 'ZAF', HAI: 'HTI', URY: 'URU' };

const STAGE_BY_SLUG = {
  'round-of-32': 'round_of_32',
  'round-of-16': 'round_of_16',
  quarterfinals: 'quarter_final',
  semifinals: 'semi_final',
  'final': 'final',
  '3rd-place-match': 'third_place',
};

const { data: teams } = await sb.from('teams').select('id, name, fifa_code');
const teamByCode = new Map(teams.map((t) => [t.fifa_code, t]));
const resolveTeam = (abbr) => teamByCode.get(ESPN_TO_DB[abbr] ?? abbr) ?? null;

const { data: stages } = await sb.from('tournament_stages').select('id, code');
const stageIdByCode = new Map(stages.map((s) => [s.code, s.id]));

const sbd = await (await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260720&limit=80', { cache: 'no-store' })).json();
const now = Date.now();

const candidates = [];
for (const e of sbd.events ?? []) {
  const slug = e.season?.slug ?? '';
  const stageCode = STAGE_BY_SLUG[slug];
  if (!stageCode) continue;
  const cc = e.competitions[0].competitors;
  const homeC = cc.find((c) => c.homeAway === 'home');
  const awayC = cc.find((c) => c.homeAway === 'away');
  const home = resolveTeam(homeC?.team?.abbreviation ?? '');
  const away = resolveTeam(awayC?.team?.abbreviation ?? '');
  if (!home || !away) continue;
  if (new Date(e.date).getTime() <= now) continue;
  candidates.push({
    id: `${stageCode}-${home.fifa_code}-${away.fifa_code}`.toLowerCase(),
    externalId: e.id,
    stageCode,
    stageId: stageIdByCode.get(stageCode),
    home,
    away,
    kickoff: e.date,
  });
}

console.log(`Cruces definidos con kickoff futuro: ${candidates.length}\n`);
for (const c of candidates) {
  console.log(`  ${c.stageCode.padEnd(13)} ${c.home.name} vs ${c.away.name}  | ${c.kickoff.slice(0, 16)} | id=${c.id}`);
}

if (!candidates.length) process.exit(0);

const existingMatches = new Set((await sb.from('matches').select('id').in('id', candidates.map((c) => c.id))).data?.map((m) => m.id) ?? []);
const toCreate = candidates.filter((c) => !existingMatches.has(c.id));
console.log(`\nYa existen en DB: ${candidates.length - toCreate.length} | a crear: ${toCreate.length}`);

if (!APPLY) {
  console.log('\n(DRY-RUN — no escribí nada. Correr con --apply para crear los matches votables.)');
  process.exit(0);
}
if (!toCreate.length) {
  console.log('\nNada nuevo para crear.');
  process.exit(0);
}

const matchRows = toCreate.map((c) => ({
  id: c.id,
  external_id: c.externalId,
  stage_id: c.stageId,
  home_team_id: c.home.id,
  away_team_id: c.away.id,
  kickoff_at: c.kickoff,
  status: 'scheduled',
  home_score_90: null,
  away_score_90: null,
  home_score_ft: null,
  away_score_ft: null,
}));
const mErr = (await sb.from('matches').upsert(matchRows, { onConflict: 'id' })).error;
if (mErr) { console.error('matches:', mErr.message); process.exit(1); }

const marketRows = toCreate.map((c) => ({ match_id: c.id, market_type: 'qualifies', lock_at: c.kickoff, status: 'open' }));
const mkErr = (await sb.from('match_markets').insert(marketRows)).error;
if (mkErr) { console.error('markets:', mkErr.message); process.exit(1); }

const markets = (await sb.from('match_markets').select('id, match_id').in('match_id', toCreate.map((c) => c.id))).data ?? [];
const byMatch = new Map(toCreate.map((c) => [c.id, c]));
const outcomeRows = markets.flatMap((m) => {
  const c = byMatch.get(m.match_id);
  return [
    { match_market_id: m.id, code: 'home_qualifies', label: `Clasifica ${c.home.name}`, sort_order: 10 },
    { match_market_id: m.id, code: 'away_qualifies', label: `Clasifica ${c.away.name}`, sort_order: 20 },
  ];
});
const oErr = (await sb.from('market_outcomes').upsert(outcomeRows, { onConflict: 'match_market_id, code' })).error;
if (oErr) { console.error('outcomes:', oErr.message); process.exit(1); }

console.log(`\n✅ Creados ${toCreate.length} cruces votables (market 'qualifies', 2 opciones, abiertos).`);
