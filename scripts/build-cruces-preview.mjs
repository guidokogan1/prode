import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ESPN_TO_DB = { RSA: 'ZAF', HAI: 'HTI', URY: 'URU' };
const { data: teams } = await sb.from('teams').select('name, fifa_code');
const nameByCode = new Map(teams.map(t => [t.fifa_code, t.name]));
const esp = (ab) => nameByCode.get(ESPN_TO_DB[ab] ?? ab) ?? null;
const getJson = async (u) => (await fetch(u, { cache: 'no-store' })).json();

const st = await getJson('https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026');
const sv = (e, n) => e.stats.find(s => s.name === n)?.value ?? 0;
const groups = st.children.map(g => ({
  label: g.name.replace('Group', 'Grupo'),
  complete: g.standings.entries.every(e => sv(e, 'gamesPlayed') >= 3),
  rows: g.standings.entries.map(e => ({
    rank: sv(e, 'rank'), name: esp(e.team.abbreviation) ?? e.team.displayName,
    pj: sv(e, 'gamesPlayed'), dg: sv(e, 'pointDifferential'), pts: sv(e, 'points'), adv: sv(e, 'advanced') === 1,
  })).sort((a, b) => a.rank - b.rank),
}));

const slot = (c) => {
  const ab = c.team?.abbreviation ?? '', dn = c.team?.displayName ?? '';
  const r = esp(ab); if (r) return { t: r, res: true };
  let m = ab.match(/^1([A-L])$/); if (m) return { t: `Ganador Grupo ${m[1]}`, res: false };
  m = ab.match(/^2([A-L])$/); if (m) return { t: `2º Grupo ${m[1]}`, res: false };
  if (ab === '3RD' || /3rd place/i.test(dn)) { const gm = dn.match(/Group ([A-L/]+)/); return { t: `3º (${gm ? gm[1] : '?'})`, res: false }; }
  return { t: 'Por definir', res: false };
};
const sbd = await getJson('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260720&limit=80');
const ROUNDS = [['r32', '16vos', ['round-of-32']], ['r16', '8vos', ['round-of-16']], ['qf', '4tos', ['quarterfinals']], ['sf', 'Semis', ['semifinals']], ['final', 'Final', ['final', '3rd-place-match']]];
const rounds = ROUNDS.map(([key, label, slugs]) => ({
  key, label,
  matches: sbd.events.filter(e => slugs.includes(e.season?.slug || '')).sort((a, b) => a.date.localeCompare(b.date)).map(e => {
    const cc = e.competitions[0].competitors;
    const h = slot(cc.find(x => x.homeAway === 'home')), a = slot(cc.find(x => x.homeAway === 'away'));
    return { date: e.date, title: (e.season?.slug || '') === '3rd-place-match' ? '3er puesto' : null, h, a, set: h.res && a.res };
  }),
})).filter(r => r.matches.length);

const DF = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
const fmt = (iso) => DF.format(new Date(iso)).replace(/\./g, '');
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const posCls = (r) => r <= 2 ? 'qualifies' : r === 3 ? 'maybe' : 'out';

const groupsHtml = groups.map(g => `
  <section class="group-card">
    <div class="group-card-head"><h2 class="section-title">${esc(g.label)}</h2><span class="group-state ${g.complete ? 'is-done' : 'is-live'}">${g.complete ? 'cerrado' : 'en curso'}</span></div>
    <table class="standings"><thead><tr><th class="num">#</th><th class="team">Equipo</th><th class="stat">PJ</th><th class="stat">DG</th><th class="stat">Pts</th></tr></thead><tbody>
    ${g.rows.map(r => `<tr class="${posCls(r.rank)}"><td class="num">${r.rank}</td><td class="team"><span class="team-name">${esc(r.name)}</span>${r.adv ? '<span class="adv-dot"></span>' : ''}</td><td class="stat">${r.pj}</td><td class="stat">${r.dg > 0 ? '+' + r.dg : r.dg}</td><td class="stat pts">${r.pts}</td></tr>`).join('')}
    </tbody></table>
  </section>`).join('');

const slotHtml = (s) => `<div class="kslot ${s.res ? 'is-team' : 'is-pending'}"><span class="kslot-mark"></span><span class="kslot-name">${esc(s.t)}</span></div>`;
const roundHtml = (r) => `<div class="pane" data-pane="${r.key}" style="display:none">
  <div class="row-head"><span class="micro-copy">${r.matches.filter(m => m.set).length} de ${r.matches.length} definidos</span><div class="row-line"></div></div>
  <div class="kmatch-list">${r.matches.map(m => `<article class="kmatch ${m.set ? 'is-set' : ''}"><div class="kmatch-head"><span class="kmatch-date">${esc(fmt(m.date))}</span>${m.title ? `<span class="kmatch-title">${esc(m.title)}</span>` : ''}</div>${slotHtml(m.h)}${slotHtml(m.a)}</article>`).join('')}</div>
</div>`;

const chips = [['grupos', 'Grupos'], ...rounds.map(r => [r.key, r.label])].map(([k, l], i) => `<button class="stage-chip ${i === 0 ? 'is-active' : ''}" data-stage="${k}">${l}</button>`).join('');

const html = `<title>Cruces · preview</title>
<style>
:root{--background:#05070b;--surface:#0f151d;--surface-alt:#151d28;--text-primary:#f8fbff;--text-secondary:#b7c0cf;--text-tertiary:#7f8999;--gold:#d8ff56;--gold-dark:#0d1117;--line:rgba(255,255,255,.09);--line-strong:rgba(255,255,255,.16);--radius-md:10px;--radius-pill:999px;--font-accent:"Barlow Condensed","Arial Narrow",sans-serif;color-scheme:dark;}
*{box-sizing:border-box}
body{margin:0;background:var(--background);color:var(--text-primary);font-family:-apple-system,system-ui,sans-serif;}
.shell{max-width:460px;margin:0 auto;padding:18px 16px 40px;display:grid;gap:18px;}
.eyebrow{margin:0;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--text-secondary);}
.display-title{margin:0;font-family:var(--font-accent);font-size:2.2rem;font-weight:800;letter-spacing:-.01em;}
.muted-copy{margin:0;color:var(--text-secondary);font-size:.85rem;}
.section-title{margin:0;font-family:var(--font-accent);font-weight:700;font-size:1.05rem;}
.micro-copy{font-size:.72rem;color:var(--text-tertiary);}
.row-head{display:flex;align-items:center;gap:12px;}.row-line{flex:1;height:1px;background:var(--line);}
.legend-inline{display:flex;flex-wrap:wrap;gap:14px;font-size:.7rem;color:var(--text-tertiary);}
.legend-inline .dot{display:inline-block;width:7px;height:7px;border-radius:999px;vertical-align:middle;margin-right:4px;}
.dot.q{background:var(--gold);}.dot.m{background:#f5c542;}
.adv-dot{display:inline-block;width:7px;height:7px;border-radius:999px;background:var(--gold);margin-left:6px;vertical-align:middle;}
.stage-bar{display:flex;gap:6px;overflow-x:auto;padding:4px 2px;}
.stage-chip{flex:0 0 auto;border:1px solid var(--line);background:var(--surface);color:var(--text-secondary);font-family:var(--font-accent);font-weight:700;font-size:.9rem;text-transform:uppercase;padding:8px 16px;border-radius:var(--radius-pill);cursor:pointer;}
.stage-chip.is-active{background:var(--gold);color:var(--gold-dark);border-color:var(--gold);}
.groups-grid{display:grid;grid-template-columns:1fr;gap:12px;}
@media(min-width:640px){.groups-grid{grid-template-columns:1fr 1fr;}}
.group-card{border:1px solid var(--line);border-radius:var(--radius-md);padding:14px 14px 6px;background:var(--surface);}
.group-card-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;}
.group-state{font-size:.64rem;text-transform:uppercase;letter-spacing:.04em;}.group-state.is-done{color:var(--text-tertiary);}.group-state.is-live{color:var(--gold);}
table.standings{width:100%;border-collapse:collapse;font-size:.82rem;}
table.standings th{font-size:.62rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-tertiary);font-weight:600;padding:4px 6px;text-align:center;}
table.standings th.team{text-align:left;}
table.standings td{padding:7px 6px;text-align:center;border-top:1px solid var(--line);color:var(--text-secondary);}
table.standings td.num{width:26px;color:var(--text-tertiary);font-family:var(--font-accent);font-weight:700;}
table.standings td.team{text-align:left;}.team-name{color:var(--text-primary);font-weight:600;}
table.standings td.pts{color:var(--text-primary);font-weight:700;font-family:var(--font-accent);}
table.standings tr.qualifies td.num,table.standings tr.maybe td.num{position:relative;}
table.standings tr.qualifies td.num::before{content:"";display:inline-block;width:3px;height:14px;background:var(--gold);border-radius:2px;margin-right:5px;vertical-align:-2px;}
table.standings tr.maybe td.num::before{content:"";display:inline-block;width:3px;height:14px;background:#f5c542;border-radius:2px;margin-right:5px;vertical-align:-2px;}
table.standings tr.out td{color:var(--text-tertiary);}table.standings tr.out .team-name{color:var(--text-tertiary);font-weight:500;}
.kmatch-list{display:grid;gap:10px;}@media(min-width:640px){.kmatch-list{grid-template-columns:1fr 1fr;}}
.kmatch{border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);padding:10px 12px 12px;display:grid;gap:8px;}
.kmatch.is-set{border-color:var(--line-strong);}
.kmatch-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}
.kmatch-date{font-size:.66rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.03em;}
.kmatch-title{font-size:.62rem;color:var(--gold);text-transform:uppercase;letter-spacing:.04em;}
.kslot{display:flex;align-items:center;gap:10px;}
.kslot-mark{width:20px;height:20px;border-radius:999px;flex-shrink:0;border:1px solid var(--line-strong);background:var(--surface-alt);}
.kslot.is-team .kslot-mark{background:var(--gold);border-color:var(--gold);}
.kslot-name{font-size:.95rem;font-weight:600;}.kslot.is-team .kslot-name{color:var(--text-primary);}.kslot.is-pending .kslot-name{color:var(--text-tertiary);font-weight:500;}
</style>
<div class="shell">
  <div style="display:grid;gap:6px;"><p class="eyebrow">Camino al título</p><h1 class="display-title">Cruces</h1><p class="muted-copy">Cómo van quedando los enfrentamientos según clasifican. ${groups.filter(g => g.complete).length} de ${groups.length} grupos cerrados.</p></div>
  <div class="stage-bar">${chips}</div>
  <div class="pane" data-pane="grupos">
    <div style="display:grid;gap:12px;">
      <div class="legend-inline" style="padding-left:2px;"><span><i class="dot q"></i>clasifica directo (1º-2º)</span><span><i class="dot m"></i>3º · mejor tercero</span></div>
      <div class="groups-grid">${groupsHtml}</div>
    </div>
  </div>
  ${rounds.map(roundHtml).join('')}
</div>
<script>
const panes=document.querySelectorAll('.pane');const chips=document.querySelectorAll('.stage-chip');
function show(k){panes.forEach(p=>p.style.display=p.dataset.pane===k?'block':'none');chips.forEach(c=>c.classList.toggle('is-active',c.dataset.stage===k));}
chips.forEach(c=>c.addEventListener('click',()=>show(c.dataset.stage)));show('grupos');
</script>`;

const out = process.argv[2] || 'cruces-preview.html';
writeFileSync(out, html);
console.log('Escrito:', out, '| grupos:', groups.length, '| rondas:', rounds.map(r => `${r.label}(${r.matches.length})`).join(' '));
