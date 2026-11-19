import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function all(t, c) { const r = []; let f = 0; for (;;) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(`${t}: ${error.message}`); r.push(...data); if (data.length < 1000) break; f += 1000; } return r; }
const [users, matches, markets, outcomes, tickets, allocs, settl, champ, cm, teams] = await Promise.all([
  all('users', 'id, display_name, is_active, created_at'),
  all('matches', 'id, kickoff_at, status, home_score_90, away_score_90'),
  all('match_markets', 'id, match_id, status, winning_outcome_code, lock_at'),
  all('market_outcomes', 'id, match_market_id, code'),
  all('tickets', 'id, user_id, match_market_id, credit_total'),
  all('ticket_allocations', 'ticket_id, market_outcome_id, amount'),
  all('settlements', 'ticket_id, gross_return_amount, net_result_amount, winning_pool_amount'),
  all('champion_picks', 'user_id, team_id, settled_at'),
  all('champion_market', 'id, lock_at, status, winning_team_id'),
  all('teams', 'id, name'),
]);
const un = new Map(users.map((u) => [u.id, u.display_name]));
const tn = new Map(teams.map((t) => [t.id, t.name]));
const oc = new Map(outcomes.map((o) => [o.id, o]));
const sByT = new Map(settl.map((s) => [s.ticket_id, s]));
const mById = new Map(matches.map((m) => [m.id, m]));
const mkById = new Map(markets.map((m) => [m.id, m]));

console.log('=== SCORES 0-0 EN PARTIDOS NO JUGADOS (bomba de tiempo del empate) ===');
const notPlayed = matches.filter((m) => m.status !== 'finished');
const zeroed = notPlayed.filter((m) => m.home_score_90 === 0 && m.away_score_90 === 0);
const nulled = notPlayed.filter((m) => m.home_score_90 == null && m.away_score_90 == null);
console.log(`  no jugados=${notPlayed.length} con 0-0 guardado=${zeroed.length} con null=${nulled.length}`);
console.log(`  (si uno de esos ${zeroed.length} pasa a finished sin score real -> derive() devuelve "draw")`);

console.log('\n=== PARTIDOS TRABADOS (live/scheduled con kickoff pasado) ===');
const now = new Date();
const stuck = matches.filter((m) => m.status !== 'finished' && new Date(m.kickoff_at) < new Date(now.getTime() - 4 * 3600e3));
if (!stuck.length) console.log('  (ninguno)');
for (const m of stuck) console.log(`  ${m.id} ${m.kickoff_at} status=${m.status} score=${m.home_score_90}-${m.away_score_90}`);

console.log('\n=== TICKETS CON MONTO RARO ===');
const sum = new Map();
for (const a of allocs) sum.set(a.ticket_id, (sum.get(a.ticket_id) ?? 0) + Number(a.amount));
const weird = tickets.filter((t) => (sum.get(t.id) ?? 0) !== t.credit_total);
console.log(`  tickets cuyo total != credit_total: ${weird.length}`);
for (const t of weird.slice(0, 10)) console.log(`    ${un.get(t.user_id)} ${t.id} suma=${sum.get(t.id) ?? 0} credit=${t.credit_total}`);
const multi = [...new Set(allocs.filter((a) => Number(a.amount) > 0).map((a) => a.ticket_id))].filter((id) => allocs.filter((a) => a.ticket_id === id && Number(a.amount) > 0).length > 1);
console.log(`  tickets con mas de un outcome cargado (deberia ser all-in): ${multi.length}`);
for (const id of multi.slice(0, 10)) { const t = tickets.find((x) => x.id === id); console.log(`    ${un.get(t?.user_id)} ${id}: ${allocs.filter((a) => a.ticket_id === id && Number(a.amount) > 0).map((a) => `${oc.get(a.market_outcome_id)?.code}=${a.amount}`).join(' ')}`); }

console.log('\n=== CAMPEON ===');
console.log(`  mercado: ${cm.map((c) => `lock_at=${c.lock_at} status=${c.status} ganador=${c.winning_team_id ?? '-'}`).join(' | ')}`);
for (const u of users) {
  const c = champ.find((x) => x.user_id === u.id);
  console.log(`  ${(u.display_name ?? '?').padEnd(14)} ${c ? tn.get(c.team_id) : 'SIN PICK'}${c?.settled_at ? ' (liquidado)' : ''}`);
}

console.log('\n=== ACIERTOS: dos definiciones ===');
for (const u of users) {
  const tix = tickets.filter((t) => t.user_id === u.id);
  let hitsByCode = 0, hitsByNet = 0, settledN = 0;
  for (const t of tix) {
    const s = sByT.get(t.id); if (!s) continue;
    settledN += 1;
    const mk = mkById.get(t.match_market_id);
    const dom = allocs.filter((a) => a.ticket_id === t.id && Number(a.amount) > 0).sort((a, b) => b.amount - a.amount)[0];
    const code = dom ? oc.get(dom.market_outcome_id)?.code : null;
    if (code && code === mk?.winning_outcome_code) hitsByCode += 1;
    if (Number(s.net_result_amount) > 0) hitsByNet += 1;
  }
  const gross = tix.reduce((acc, t) => acc + Number(sByT.get(t.id)?.gross_return_amount ?? 0), 0);
  const net = tix.reduce((acc, t) => acc + Number(sByT.get(t.id)?.net_result_amount ?? 0), 0);
  console.log(`  ${(u.display_name ?? '?').padEnd(14)} settled=${settledN} aciertosPorCodigo=${hitsByCode} aciertosPorNeto=${hitsByNet}${hitsByCode !== hitsByNet ? '  <<< DIFIEREN' : ''} gross=${gross} net=${net}`);
}

console.log('\n=== TABLA COMO LA VE EL USUARIO (orden por gross, como getRanking) ===');
const rows = users.map((u) => {
  const tix = tickets.filter((t) => t.user_id === u.id);
  let gross = 0, best = 0, hits = 0;
  for (const t of tix) {
    const s = sByT.get(t.id); if (!s) continue;
    const g = Number(s.gross_return_amount);
    gross += g; best = Math.max(best, g);
    const mk = mkById.get(t.match_market_id);
    const dom = allocs.filter((a) => a.ticket_id === t.id && Number(a.amount) > 0).sort((a, b) => b.amount - a.amount)[0];
    if (dom && oc.get(dom.market_outcome_id)?.code === mk?.winning_outcome_code) hits += 1;
  }
  return { name: u.display_name, gross, best, hits };
}).filter((r) => r.gross > 0 || r.hits > 0 || true);
rows.sort((a, b) => (b.gross !== a.gross ? b.gross - a.gross : b.hits !== a.hits ? b.hits - a.hits : b.best !== a.best ? b.best - a.best : (a.name ?? '').localeCompare(b.name ?? '')));
rows.forEach((r, i) => console.log(`  ${i + 1}. ${(r.name ?? '?').padEnd(14)} total=${String(r.gross).padStart(7)} aciertos=${r.hits} mejor=${r.best}`));

console.log('\n=== SIN EL REEMBOLSO (como quedaria con la regla nueva) ===');
const refundTickets = new Set(settl.filter((s) => Number(s.winning_pool_amount) === 0).map((s) => s.ticket_id));
const rows2 = users.map((u) => {
  const tix = tickets.filter((t) => t.user_id === u.id);
  let gross = 0, best = 0, hits = 0;
  for (const t of tix) {
    const s = sByT.get(t.id); if (!s) continue;
    const g = refundTickets.has(t.id) ? 0 : Number(s.gross_return_amount);
    gross += g; best = Math.max(best, g);
    const mk = mkById.get(t.match_market_id);
    const dom = allocs.filter((a) => a.ticket_id === t.id && Number(a.amount) > 0).sort((a, b) => b.amount - a.amount)[0];
    if (dom && oc.get(dom.market_outcome_id)?.code === mk?.winning_outcome_code) hits += 1;
  }
  return { name: u.display_name, gross, best, hits };
});
rows2.sort((a, b) => (b.gross !== a.gross ? b.gross - a.gross : b.hits !== a.hits ? b.hits - a.hits : b.best !== a.best ? b.best - a.best : (a.name ?? '').localeCompare(b.name ?? '')));
rows2.forEach((r, i) => console.log(`  ${i + 1}. ${(r.name ?? '?').padEnd(14)} total=${String(r.gross).padStart(7)} aciertos=${r.hits} mejor=${r.best}`));
console.log(`  tickets afectados por quitar el reembolso: ${refundTickets.size}`);
