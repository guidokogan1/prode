import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ESPN_TO_DB = { RSA: 'ZAF', HAI: 'HTI', URY: 'URU' };
const { data: teams } = await sb.from('teams').select('name, fifa_code');
const nameByCode = new Map(teams.map(t => [t.fifa_code, t.name]));
const esp = (abbr) => nameByCode.get(ESPN_TO_DB[abbr] ?? abbr) ?? null;

async function getJson(url) { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }

// ---- STANDINGS ----
const st = await getJson('https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026');
const stat = (e, n) => e.stats.find(s => s.name === n)?.value ?? 0;
const groups = st.children.map(g => ({
  label: g.name.replace('Group', 'Grupo'),
  rows: g.standings.entries.map(e => ({
    name: esp(e.team.abbreviation) ?? e.team.displayName,
    pj: stat(e, 'gamesPlayed'), pts: stat(e, 'points'), dg: stat(e, 'pointDifferential'),
    gf: stat(e, 'pointsFor'), w: stat(e, 'wins'), d: stat(e, 'ties'), l: stat(e, 'losses'),
    advanced: stat(e, 'advanced') === 1, rank: stat(e, 'rank'),
  })).sort((a, b) => a.rank - b.rank),
  complete: g.standings.entries.every(e => stat(e, 'gamesPlayed') >= 3),
}));

console.log('=== STANDINGS (es) ===');
for (const g of groups.slice(0, 2)) {
  console.log(`\n${g.label} ${g.complete ? '(cerrado)' : '(en curso)'}`);
  g.rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.name.padEnd(16)} PJ${r.pj} Pts${r.pts} DG${r.dg >= 0 ? '+' : ''}${r.dg} ${r.advanced ? '✅clasif' : ''}`));
}
console.log(`\n... (${groups.length} grupos en total, ${groups.filter(g => g.complete).length} cerrados)`);

// ---- BRACKET R32 ----
const slotLabel = (c) => {
  const ab = c.team?.abbreviation ?? '';
  const real = esp(ab);
  if (real) return { text: real, resolved: true };
  let m = ab.match(/^1([A-L])$/); if (m) return { text: `Ganador Grupo ${m[1]}`, resolved: false };
  m = ab.match(/^2([A-L])$/); if (m) return { text: `2º Grupo ${m[1]}`, resolved: false };
  if (ab === '3RD' || /3rd/i.test(c.team?.displayName ?? '')) {
    const gm = (c.team?.displayName ?? '').match(/Group ([A-L/]+)/);
    return { text: `3º (${gm ? gm[1] : '?'})`, resolved: false };
  }
  return { text: c.team?.displayName ?? '?', resolved: false };
};

const sb32 = await getJson('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260715&limit=60');
const r32 = sb32.events.filter(e => (e.season?.slug || '') === 'round-of-32')
  .sort((a, b) => a.date.localeCompare(b.date))
  .map(e => {
    const cc = e.competitions[0].competitors;
    const h = slotLabel(cc.find(x => x.homeAway === 'home'));
    const a = slotLabel(cc.find(x => x.homeAway === 'away'));
    return { date: e.date.slice(0, 10), home: h, away: a, fullyResolved: h.resolved && a.resolved };
  });

console.log(`\n=== RONDA DE 32 (${r32.length} cruces) ===`);
for (const c of r32) {
  const tag = c.fullyResolved ? '🔒 definido' : '… pendiente';
  console.log(`  ${c.date} | ${c.home.text.padEnd(22)} vs ${c.away.text.padEnd(22)} ${tag}`);
}
