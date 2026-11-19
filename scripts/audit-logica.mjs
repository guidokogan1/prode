import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CUTOFF = new Date('2026-08-21T00:00:00Z');
const NOW = new Date();
async function all(t, c) { const r = []; let f = 0; for (;;) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(`${t}: ${error.message}`); r.push(...data); if (data.length < 1000) break; f += 1000; } return r; }
const [users, teams, matches, markets, outcomes, tickets, allocs, settl, snaps, champ, cm] = await Promise.all([
  all('users', 'id, display_name, is_active, created_at'),
  all('teams', 'id, name'),
  all('matches', 'id, kickoff_at, status, home_team_id, away_team_id, home_score_90, away_score_90, winner_team_id'),
  all('match_markets', 'id, match_id, market_type, status, lock_at, winning_outcome_code, settled_at'),
  all('market_outcomes', 'id, match_market_id, code'),
  all('tickets', 'id, user_id, match_market_id, credit_total, submitted_at, updated_at'),
  all('ticket_allocations', 'ticket_id, market_outcome_id, amount'),
  all('settlements', 'ticket_id, winning_outcome_code, winning_pool_amount, gross_return_amount, net_result_amount'),
  all('leaderboard_snapshots', 'user_id, rank_position, total_net_amount, positive_tickets_count'),
  all('champion_picks', 'user_id, team_id, settled_at'),
  all('champion_market', 'id, lock_at, status, winning_team_id'),
]);
const tn = new Map(teams.map((t) => [t.id, t.name]));
const un = new Map(users.map((u) => [u.id, u.display_name]));
const oc = new Map(outcomes.map((o) => [o.id, o]));
const mById = new Map(matches.map((m) => [m.id, m]));
const mkById = new Map(markets.map((m) => [m.id, m]));
const mkByMatch = new Map(markets.map((m) => [m.match_id, m]));
const sByT = new Map(settl.map((s) => [s.ticket_id, s]));
const pick = new Map();
for (const a of allocs) { if (Number(a.amount) <= 0) continue; const o = oc.get(a.market_outcome_id); if (!o) continue; const p = pick.get(a.ticket_id); if (!p || Number(a.amount) > p.amount) pick.set(a.ticket_id, { code: o.code, amount: Number(a.amount) }); }
const label = { home: 'LOCAL ', draw: 'EMPATE', away: 'VISITA', home_qualifies: 'PASA L', away_qualifies: 'PASA V' };
const counted = matches.filter((m) => new Date(m.kickoff_at) >= CUTOFF);
const countedMk = new Set(counted.map((m) => mkByMatch.get(m.id)?.id).filter(Boolean));

console.log('=== COMO VOTO CADA UNO (partidos jugados del torneo que cuenta) ===');
const playedSorted = counted.filter((m) => mkByMatch.get(m.id)?.settled_at).sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
for (const u of users.sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''))) {
  const rows = [];
  let net = 0, hits = 0, gross = 0;
  for (const m of playedSorted) {
    const mk = mkByMatch.get(m.id);
    const t = tickets.find((x) => x.user_id === u.id && x.match_market_id === mk.id);
    if (!t) { rows.push(`     ${m.kickoff_at.slice(5, 10)} ${(tn.get(m.home_team_id) ?? '').slice(0, 16).padEnd(16)} ${m.home_score_90}-${m.away_score_90} ${(tn.get(m.away_team_id) ?? '').slice(0, 16).padEnd(16)}  --- no jugo`); continue; }
    const p = pick.get(t.id), s = sByT.get(t.id);
    const ok = p && p.code === mk.winning_outcome_code;
    if (s) { net += Number(s.net_result_amount); gross += Number(s.gross_return_amount); if (ok) hits += 1; }
    rows.push(`     ${m.kickoff_at.slice(5, 10)} ${(tn.get(m.home_team_id) ?? '').slice(0, 16).padEnd(16)} ${m.home_score_90}-${m.away_score_90} ${(tn.get(m.away_team_id) ?? '').slice(0, 16).padEnd(16)}  voto ${label[p?.code] ?? p?.code ?? 'VACIO'}  ${ok ? 'ACERTO' : 'erro  '}  cobro ${String(s ? Number(s.gross_return_amount) : '-').padStart(6)}`);
  }
  const pend = tickets.filter((t) => t.user_id === u.id && countedMk.has(t.match_market_id) && !mkById.get(t.match_market_id)?.settled_at).length;
  const c = champ.find((x) => x.user_id === u.id);
  console.log(`\n  ${u.display_name} — total cobrado ${gross} · neto ${net} · ${hits} aciertos de ${playedSorted.filter((m) => tickets.some((t) => t.user_id === u.id && t.match_market_id === mkByMatch.get(m.id)?.id)).length} jugados · ${pend} picks cargados para partidos que faltan · campeon: ${c ? tn.get(c.team_id) : 'SIN ELEGIR'}`);
  for (const r of rows) console.log(r);
}

console.log('\n\n=== CHEQUEOS DE LOGICA ===');
const bad = [];
for (const mk of markets) {
  const m = mById.get(mk.match_id);
  if (!m) { bad.push(`mercado sin partido: ${mk.id}`); continue; }
  if (Math.abs(new Date(mk.lock_at).getTime() - new Date(m.kickoff_at).getTime()) > 60000 && mk.status === 'open') bad.push(`lock_at != kickoff en mercado abierto: ${m.id} lock=${mk.lock_at} kickoff=${m.kickoff_at}`);
  if (mk.status === 'open' && new Date(m.kickoff_at) < NOW) bad.push(`mercado ABIERTO con el partido ya empezado: ${m.id} kickoff=${m.kickoff_at}`);
  if (mk.status === 'settled' && m.status !== 'finished') bad.push(`mercado settled con partido ${m.status}: ${m.id}`);
  if (m.status === 'finished' && mk.status !== 'settled') bad.push(`partido terminado con mercado ${mk.status}: ${m.id} (${new Date(m.kickoff_at) >= CUTOFF ? 'CUENTA' : 'pre-corte'})`);
  if (m.status === 'finished' && (m.home_score_90 == null || m.away_score_90 == null)) bad.push(`partido terminado sin score: ${m.id}`);
  if (m.status !== 'finished' && (m.home_score_90 != null || m.away_score_90 != null) && m.status !== 'live') bad.push(`partido ${m.status} con score cargado: ${m.id}`);
  if (mk.status === 'settled' && new Date(m.kickoff_at) >= CUTOFF) {
    const tix = tickets.filter((t) => t.match_market_id === mk.id);
    const real = m.home_score_90 > m.away_score_90 ? 'home' : m.away_score_90 > m.home_score_90 ? 'away' : 'draw';
    if (mk.market_type === '1x2' && mk.winning_outcome_code !== real) bad.push(`resultado guardado != score: ${m.id} guardado=${mk.winning_outcome_code} score=${real}`);
    for (const t of tix) {
      const s = sByT.get(t.id), p = pick.get(t.id);
      if (!s) { bad.push(`ticket sin settlement en mercado settled que cuenta: ${un.get(t.user_id)} ${m.id}`); continue; }
      const ok = p && p.code === mk.winning_outcome_code;
      if (!ok && Number(s.gross_return_amount) !== 0) bad.push(`COBRO SIN ACERTAR: ${un.get(t.user_id)} ${m.id} voto=${p?.code} gano=${mk.winning_outcome_code} cobro=${s.gross_return_amount}`);
      if (ok && Number(s.gross_return_amount) <= 0) bad.push(`ACERTO Y NO COBRO: ${un.get(t.user_id)} ${m.id} cobro=${s.gross_return_amount}`);
      if (ok && Number(s.net_result_amount) !== Number(s.gross_return_amount) - t.credit_total) bad.push(`neto inconsistente: ${un.get(t.user_id)} ${m.id}`);
    }
    const winners = tix.filter((t) => pick.get(t.id)?.code === mk.winning_outcome_code);
    const pool = tix.reduce((acc, t) => acc + (pick.get(t.id)?.amount ?? 0), 0);
    const paid = tix.reduce((acc, t) => acc + Number(sByT.get(t.id)?.gross_return_amount ?? 0), 0);
    if (winners.length && Math.abs(paid - pool) > 1) bad.push(`el pozo no cierra: ${m.id} pozo=${pool} pagado=${paid}`);
    if (!winners.length && paid !== 0) bad.push(`nadie acerto y se pago algo: ${m.id} pagado=${paid}`);
  }
}
for (const t of tickets) {
  const mk = mkById.get(t.match_market_id); const m = mk ? mById.get(mk.match_id) : null;
  if (!m) continue;
  if (new Date(m.kickoff_at) >= CUTOFF && new Date(t.updated_at ?? t.submitted_at) > new Date(m.kickoff_at)) bad.push(`pick guardado despues del kickoff (POST-CORTE): ${un.get(t.user_id)} ${m.id}`);
  if (!pick.get(t.id)) bad.push(`ticket vacio: ${un.get(t.user_id)} ${m.id}`);
}
const snapUsers = new Set(snaps.map((s) => s.user_id));
for (const u of users) {
  const hasSettled = tickets.some((t) => t.user_id === u.id && sByT.get(t.id));
  if (hasSettled && !snapUsers.has(u.id)) bad.push(`usuario con resultados y sin fila en la tabla: ${u.display_name}`);
  if (!hasSettled && snapUsers.has(u.id)) bad.push(`usuario en la tabla sin ningun resultado: ${u.display_name}`);
}
for (const s of snaps) {
  const net = tickets.filter((t) => t.user_id === s.user_id).reduce((acc, t) => acc + Number(sByT.get(t.id)?.net_result_amount ?? 0), 0);
  if (Math.abs(Number(s.total_net_amount) - net) > 0.01) bad.push(`snapshot desfasado: ${un.get(s.user_id)} guardado=${s.total_net_amount} real=${net}`);
  const hits = tickets.filter((t) => { const st = sByT.get(t.id); const mk = mkById.get(t.match_market_id); return st && pick.get(t.id)?.code === mk?.winning_outcome_code; }).filter((t) => t.user_id === s.user_id).length;
  if (s.positive_tickets_count !== hits) bad.push(`aciertos del snapshot != aciertos reales: ${un.get(s.user_id)} guardado=${s.positive_tickets_count} real=${hits}`);
}
console.log(`\ncampeon: cierra ${cm[0]?.lock_at} · estado ${cm[0]?.status} · ganador ${cm[0]?.winning_team_id ?? 'sin definir'}`);
console.log(`picks de campeon cargados: ${champ.length}/${users.length}`);
if (!bad.length) console.log('\nSin inconsistencias.');
else { console.log(`\n${bad.length} cosas a mirar:`); for (const b of bad) console.log(`  - ${b}`); }
