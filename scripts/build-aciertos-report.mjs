import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, columns) {
  const rows = []; let from = 0; const size = 1000;
  for (;;) { const { data, error } = await sb.from(table).select(columns).range(from, from + size - 1); if (error) throw error; rows.push(...data); if (data.length < size) break; from += size; }
  return rows;
}

const users = (await fetchAll('users', 'id, display_name, is_active')).filter(u => u.is_active);
const teams = await fetchAll('teams', 'id, name, fifa_code');
const team = new Map(teams.map(t => [t.id, t]));
const matches = await fetchAll('matches', 'id, home_team_id, away_team_id, kickoff_at, home_score_90, away_score_90, status');
const markets = await fetchAll('match_markets', 'id, match_id, winning_outcome_code, settled_at');
const marketByMatch = new Map(markets.map(m => [m.match_id, m]));
const outcomes = await fetchAll('market_outcomes', 'id, code');
const ocCode = new Map(outcomes.map(o => [o.id, o.code]));
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');
const allocs = await fetchAll('ticket_allocations', 'ticket_id, market_outcome_id, amount');
const allocsByTicket = new Map();
for (const a of allocs) { if (!allocsByTicket.has(a.ticket_id)) allocsByTicket.set(a.ticket_id, []); allocsByTicket.get(a.ticket_id).push(a); }
const settlements = await fetchAll('settlements', 'ticket_id, winning_outcome_code');
const settledTicketIds = new Set(settlements.map(s => s.ticket_id));
const ticketByUserMarket = new Map();
for (const t of tickets) ticketByUserMarket.set(t.user_id + '|' + t.match_market_id, t);

const settledMatches = matches
  .filter(m => { const mk = marketByMatch.get(m.id); return mk && mk.winning_outcome_code && m.home_score_90 != null; })
  .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));

const codeShort = (m, code) => code === 'home' ? team.get(m.home_team_id).fifa_code : code === 'away' ? team.get(m.away_team_id).fifa_code : 'X';

const totals = new Map(users.map(u => [u.id, 0]));
const rows = [];
for (const m of settledMatches) {
  const mk = marketByMatch.get(m.id);
  const win = mk.winning_outcome_code;
  const cells = [];
  for (const u of users) {
    const t = ticketByUserMarket.get(u.id + '|' + mk.id);
    if (!t || !settledTicketIds.has(t.id)) { cells.push({ pick: '–', amt: 0, hit: false, none: true }); continue; }
    const a = (allocsByTicket.get(t.id) ?? []).filter(x => x.amount > 0).sort((x, y) => y.amount - x.amount);
    if (!a.length) { cells.push({ pick: '–', amt: 0, hit: false, none: true }); continue; }
    const domCode = ocCode.get(a[0].market_outcome_id);
    const hit = domCode === win;
    if (hit) totals.set(u.id, totals.get(u.id) + 1);
    const onWinner = a.find(x => ocCode.get(x.market_outcome_id) === win);
    cells.push({ pick: codeShort(m, domCode), amt: a[0].amount, hit, onWinnerAmt: onWinner && !hit ? onWinner.amount : 0, none: false });
  }
  rows.push({
    date: m.kickoff_at.slice(5, 16).replace('T', ' '),
    home: team.get(m.home_team_id).fifa_code, away: team.get(m.away_team_id).fifa_code,
    score: `${m.home_score_90}-${m.away_score_90}`,
    winShort: win === 'home' ? team.get(m.home_team_id).fifa_code : win === 'away' ? team.get(m.away_team_id).fifa_code : 'EMPATE',
    win, cells,
  });
}

const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const head = users.map(u => `<th class="ply">${esc(u.display_name)}</th>`).join('');
const totalRow = users.map(u => `<td class="tot">${totals.get(u.id)}</td>`).join('');

const body = rows.map(r => {
  const tds = r.cells.map(c => {
    if (c.none) return `<td class="miss">·</td>`;
    const cls = c.hit ? 'hit' : 'miss';
    const sub = c.hit ? `$${(c.amt/1000)}k` : (c.onWinnerAmt ? `<span class="spr">+$${c.onWinnerAmt/1000}k→✓</span>` : `$${c.amt/1000}k`);
    return `<td class="${cls}"><b>${c.pick}</b><span class="amt">${sub}</span></td>`;
  }).join('');
  const winCls = r.win === 'draw' ? 'wdraw' : 'wteam';
  return `<tr><td class="mtch"><span class="dt">${esc(r.date)}</span><span class="mt">${esc(r.home)} ${esc(r.score)} ${esc(r.away)}</span><span class="${winCls}">→ ${esc(r.winShort)}</span></td>${tds}</tr>`;
}).join('\n');

const html = `<title>Prode · Auditoría de aciertos</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0c0c0d; color: #e9e6da; font-family: -apple-system, system-ui, sans-serif; }
  .wrap { padding: 16px; }
  h1 { font-size: 1.05rem; margin: 0 0 2px; letter-spacing: -0.02em; }
  p.sub { margin: 0 0 14px; color: #8a877d; font-size: 0.82rem; }
  .legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 0 0 14px; font-size: 0.74rem; color: #b6b3a7; }
  .legend b { color: #d8ff56; }
  .scroll { overflow-x: auto; border: 1px solid #232323; border-radius: 10px; }
  table { border-collapse: collapse; width: 100%; font-size: 0.74rem; }
  th, td { padding: 7px 9px; text-align: center; white-space: nowrap; border-bottom: 1px solid #1b1b1c; }
  thead th { position: sticky; top: 0; background: #141415; z-index: 2; font-weight: 700; color: #cfccc0; }
  th.mtch, td.mtch { position: sticky; left: 0; background: #141415; z-index: 1; text-align: left; }
  td.mtch { background: #101011; }
  .mtch .dt { display: block; color: #6f6c63; font-size: 0.66rem; }
  .mtch .mt { display: block; font-weight: 700; letter-spacing: -0.01em; }
  .mtch .wteam { display: block; color: #d8ff56; font-size: 0.66rem; }
  .mtch .wdraw { display: block; color: #f5c542; font-size: 0.66rem; }
  td b { display: block; font-size: 0.82rem; }
  td .amt { display: block; font-size: 0.6rem; color: #6f6c63; margin-top: 1px; }
  td.hit { background: rgba(216,255,86,0.12); }
  td.hit b { color: #d8ff56; }
  td.miss b { color: #74716a; }
  td.spr, .spr { color: #c98a3a; }
  tr.totrow td { position: sticky; bottom: 0; background: #16160f; font-weight: 800; border-top: 2px solid #d8ff56; }
  tr.totrow td.tot { color: #d8ff56; font-size: 1rem; }
  tr.totrow td.mtch { background: #16160f; }
</style>
<div class="wrap">
  <h1>Auditoría de aciertos — recálculo desde cero</h1>
  <p class="sub">${settledMatches.length} partidos jugados · ${users.length} jugadores · cada celda = pick principal (mayor monto) de esa persona en ese partido.</p>
  <div class="legend">
    <span><b>VERDE</b> = acertó (su pick principal fue el resultado)</span>
    <span>gris = no acertó</span>
    <span><span class="spr">naranja</span> = tiró plata al ganador pero su pick principal era otro → NO cuenta</span>
    <span>→ resultado del partido</span>
  </div>
  <div class="scroll">
    <table>
      <thead><tr><th class="mtch">Partido</th>${head}</tr></thead>
      <tbody>
${body}
        <tr class="totrow"><td class="mtch">TOTAL ACIERTOS</td>${totalRow}</tr>
      </tbody>
    </table>
  </div>
</div>`;

const out = process.argv[2] || 'aciertos-report.html';
writeFileSync(out, html);
console.log('Escrito:', out);
console.log('Totales:', [...totals.entries()].map(([uid, n]) => `${users.find(u=>u.id===uid).display_name}:${n}`).join(' '));
