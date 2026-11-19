import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CUTOFF = new Date('2026-08-21T00:00:00Z');

async function fetchAll(table, columns) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

const [users, teams, matches, markets, outcomes, tickets, allocations, settlements, snapshots] = await Promise.all([
  fetchAll('users', 'id, display_name, is_active, created_at'),
  fetchAll('teams', 'id, name, fifa_code'),
  fetchAll('matches', 'id, kickoff_at, status, home_team_id, away_team_id, home_score_90, away_score_90, home_score_ft, away_score_ft, winner_team_id, winner_mode'),
  fetchAll('match_markets', 'id, match_id, market_type, status, lock_at, settled_at, winning_outcome_code'),
  fetchAll('market_outcomes', 'id, match_market_id, code, label'),
  fetchAll('tickets', 'id, user_id, match_market_id, credit_total, submitted_at, updated_at'),
  fetchAll('ticket_allocations', 'id, ticket_id, market_outcome_id, amount'),
  fetchAll('settlements', 'id, ticket_id, winning_outcome_code, winning_pool_amount, total_pool_amount, winning_bet_amount, gross_return_amount, net_result_amount, settled_at'),
  fetchAll('leaderboard_snapshots', 'user_id, rank_position, total_net_amount, positive_tickets_count, best_single_net_amount, as_of'),
]);

const teamName = new Map(teams.map((t) => [t.id, t.name]));
const userName = new Map(users.map((u) => [u.id, u.display_name]));
const matchById = new Map(matches.map((m) => [m.id, m]));
const marketById = new Map(markets.map((m) => [m.id, m]));
const marketByMatch = new Map(markets.map((m) => [m.match_id, m]));
const outcomeById = new Map(outcomes.map((o) => [o.id, o]));
const ticketById = new Map(tickets.map((t) => [t.id, t]));

function derive(m, marketType) {
  if (m.status !== 'finished') return null;
  if (marketType === '1x2') {
    if (m.home_score_90 == null || m.away_score_90 == null) return null;
    if (m.home_score_90 > m.away_score_90) return 'home';
    if (m.away_score_90 > m.home_score_90) return 'away';
    return 'draw';
  }
  if (m.winner_team_id === m.home_team_id) return 'home_qualifies';
  if (m.winner_team_id === m.away_team_id) return 'away_qualifies';
  return null;
}

const pickByTicket = new Map();
for (const a of allocations) {
  if (Number(a.amount) <= 0) continue;
  const o = outcomeById.get(a.market_outcome_id);
  if (!o) continue;
  const prev = pickByTicket.get(a.ticket_id);
  if (!prev || Number(a.amount) > prev.amount) pickByTicket.set(a.ticket_id, { code: o.code, amount: Number(a.amount) });
}
const settlementByTicket = new Map(settlements.map((s) => [s.ticket_id, s]));

console.log('=== UNIVERSO ===');
console.log(`users=${users.length} (activos=${users.filter((u) => u.is_active !== false).length}) matches=${matches.length} markets=${markets.length} tickets=${tickets.length} allocations=${allocations.length} settlements=${settlements.length} snapshots=${snapshots.length}`);

const counted = matches.filter((m) => new Date(m.kickoff_at) >= CUTOFF).sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
const played = counted.filter((m) => m.status === 'finished' || m.status === 'live' || new Date(m.kickoff_at) < new Date());
console.log(`\n=== PARTIDOS QUE CUENTAN (kickoff >= ${CUTOFF.toISOString()}) ===`);
console.log(`total=${counted.length} ya arrancados=${played.length}`);

console.log('\n=== PARTIDOS JUGADOS: resultado vs codigo guardado ===');
const mismatches = [];
for (const m of played) {
  const mk = marketByMatch.get(m.id);
  const d = derive(m, mk?.market_type ?? '1x2');
  const stored = mk?.winning_outcome_code ?? null;
  const bad = stored != null && d != null && stored !== d;
  if (bad) mismatches.push({ m, mk, stored, derived: d });
  const tix = tickets.filter((t) => t.match_market_id === mk?.id);
  console.log(
    `${m.kickoff_at.slice(0, 16)} ${(teamName.get(m.home_team_id) ?? '?').padEnd(14)} ${String(m.home_score_90 ?? '-')}-${String(m.away_score_90 ?? '-')} ${(teamName.get(m.away_team_id) ?? '?').padEnd(14)} ft=${String(m.home_score_ft ?? '-')}-${String(m.away_score_ft ?? '-')} match=${m.status.padEnd(9)} mkt=${(mk?.status ?? 'SIN MERCADO').padEnd(8)} guardado=${String(stored).padEnd(6)} derivado=${String(d).padEnd(6)} tickets=${String(tix.length).padStart(3)}${bad ? '   <<< MISMATCH' : ''}`,
  );
}

console.log(`\n=== MISMATCHES (codigo guardado != resultado real) : ${mismatches.length} ===`);
for (const x of mismatches) {
  const tix = tickets.filter((t) => t.match_market_id === x.mk.id);
  const winnersWrong = tix.filter((t) => pickByTicket.get(t.id)?.code === x.stored);
  const winnersRight = tix.filter((t) => pickByTicket.get(t.id)?.code === x.derived);
  console.log(`  ${x.m.id} ${teamName.get(x.m.home_team_id)} ${x.m.home_score_90}-${x.m.away_score_90} ${teamName.get(x.m.away_team_id)} :: guardado=${x.stored} real=${x.derived}`);
  console.log(`     cobraron mal (${winnersWrong.length}): ${winnersWrong.map((t) => `${userName.get(t.user_id)}=${Number(settlementByTicket.get(t.id)?.net_result_amount ?? 0)}`).join(', ') || '-'}`);
  console.log(`     deberian cobrar (${winnersRight.length}): ${winnersRight.map((t) => userName.get(t.user_id)).join(', ') || '-'}`);
}

console.log('\n=== SETTLEMENTS INCOHERENTES ===');
const badSettlements = [];
for (const s of settlements) {
  const t = ticketById.get(s.ticket_id);
  if (!t) { badSettlements.push(['settlement sin ticket', s.id]); continue; }
  const mk = marketById.get(t.match_market_id);
  const m = mk ? matchById.get(mk.match_id) : null;
  const pick = pickByTicket.get(t.id);
  const real = m ? derive(m, mk.market_type) : null;
  const net = Number(s.net_result_amount);
  const beforeCutoff = m && new Date(m.kickoff_at) < CUTOFF;
  if (beforeCutoff) badSettlements.push([`settlement de partido PRE-CUTOFF ${m.kickoff_at.slice(0,10)}`, `${userName.get(t.user_id)} ${m.id} net=${net}`]);
  if (pick && real && pick.code !== real && net > 0) badSettlements.push(['COBRO SIN ACERTAR', `${userName.get(t.user_id)} ${m.id} eligio=${pick.code} real=${real} net=${net}`]);
  if (pick && real && pick.code === real && net < 0) badSettlements.push(['ACERTO Y PERDIO', `${userName.get(t.user_id)} ${m.id} eligio=${pick.code} real=${real} net=${net}`]);
  if (s.winning_outcome_code !== (mk?.winning_outcome_code ?? null)) badSettlements.push(['settlement con codigo distinto al mercado', `${userName.get(t.user_id)} ${m?.id} s=${s.winning_outcome_code} mkt=${mk?.winning_outcome_code}`]);
  if (!pick) badSettlements.push(['settlement de ticket VACIO', `${userName.get(t.user_id)} ${m?.id} net=${net}`]);
}
if (!badSettlements.length) console.log('  (ninguno)');
for (const [k, v] of badSettlements) console.log(`  ${k}: ${v}`);

console.log('\n=== EMPATES: como quedaron ===');
let drawPicksOnDecided = 0, drawPicksPaid = 0;
for (const s of settlements) {
  const t = ticketById.get(s.ticket_id);
  const mk = t ? marketById.get(t.match_market_id) : null;
  const m = mk ? matchById.get(mk.match_id) : null;
  const pick = pickByTicket.get(t?.id);
  if (!m || !pick || pick.code !== 'draw') continue;
  const real = derive(m, mk.market_type);
  if (real && real !== 'draw') {
    drawPicksOnDecided += 1;
    if (Number(s.net_result_amount) >= 0) {
      drawPicksPaid += 1;
      console.log(`  ${userName.get(t.user_id)} puso EMPATE en ${teamName.get(m.home_team_id)} ${m.home_score_90}-${m.away_score_90} ${teamName.get(m.away_team_id)} (real=${real}) y quedo net=${Number(s.net_result_amount)} gross=${Number(s.gross_return_amount)}`);
    }
  }
}
console.log(`  picks de empate en partidos decididos: ${drawPicksOnDecided} | de esos con net >= 0: ${drawPicksPaid}`);

console.log('\n=== REEMBOLSOS (nadie acerto -> todos net 0) ===');
const refunds = new Map();
for (const s of settlements) {
  if (Number(s.winning_pool_amount) > 0) continue;
  const t = ticketById.get(s.ticket_id);
  const mk = t ? marketById.get(t.match_market_id) : null;
  if (!mk) continue;
  refunds.set(mk.match_id, (refunds.get(mk.match_id) ?? 0) + 1);
}
for (const [mid, n] of refunds) {
  const m = matchById.get(mid);
  console.log(`  ${m?.kickoff_at.slice(0,10)} ${teamName.get(m?.home_team_id)} ${m?.home_score_90}-${m?.away_score_90} ${teamName.get(m?.away_team_id)} -> ${n} tickets reembolsados`);
}
if (!refunds.size) console.log('  (ninguno)');

console.log('\n=== VOTACION POR USUARIO (partidos que cuentan) ===');
const countedMarketIds = new Set(counted.map((m) => marketByMatch.get(m.id)?.id).filter(Boolean));
for (const u of users.sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''))) {
  const tix = tickets.filter((t) => t.user_id === u.id && countedMarketIds.has(t.match_market_id));
  const withPick = tix.filter((t) => pickByTicket.get(t.id));
  const dist = { home: 0, draw: 0, away: 0, otro: 0 };
  for (const t of withPick) {
    const c = pickByTicket.get(t.id).code;
    if (c in dist) dist[c] += 1; else dist.otro += 1;
  }
  const settled = withPick.filter((t) => settlementByTicket.get(t.id));
  const net = settled.reduce((s, t) => s + Number(settlementByTicket.get(t.id).net_result_amount), 0);
  const hits = settled.filter((t) => Number(settlementByTicket.get(t.id).net_result_amount) > 0).length;
  console.log(`  ${(u.display_name ?? '?').padEnd(20)} tickets=${String(tix.length).padStart(3)} vacios=${tix.length - withPick.length} local=${dist.home} empate=${dist.draw} visita=${dist.away} otro=${dist.otro} settled=${settled.length} aciertos=${hits} neto=${net}`);
}

console.log('\n=== TABLA (settlements vs snapshot guardado) ===');
const netByUser = new Map();
const hitsByUser = new Map();
for (const s of settlements) {
  const t = ticketById.get(s.ticket_id);
  if (!t) continue;
  netByUser.set(t.user_id, (netByUser.get(t.user_id) ?? 0) + Number(s.net_result_amount));
  if (Number(s.net_result_amount) > 0) hitsByUser.set(t.user_id, (hitsByUser.get(t.user_id) ?? 0) + 1);
}
const snapByUser = new Map(snapshots.map((s) => [s.user_id, s]));
const rows = users.map((u) => ({
  name: u.display_name,
  net: netByUser.get(u.id) ?? 0,
  hits: hitsByUser.get(u.id) ?? 0,
  snapNet: snapByUser.get(u.id) ? Number(snapByUser.get(u.id).total_net_amount) : null,
  snapPos: snapByUser.get(u.id)?.rank_position ?? null,
  snapHits: snapByUser.get(u.id)?.positive_tickets_count ?? null,
})).sort((a, b) => b.net - a.net);
rows.forEach((r, i) => {
  const drift = r.snapNet != null && Math.abs(r.snapNet - r.net) > 0.01;
  console.log(`  ${String(i + 1).padStart(2)}. ${(r.name ?? '?').padEnd(20)} neto=${String(r.net).padStart(12)} aciertos=${r.hits}  | snapshot: pos=${r.snapPos ?? '-'} neto=${r.snapNet ?? '-'} aciertos=${r.snapHits ?? '-'}${drift ? '  <<< SNAPSHOT DESFASADO' : ''}`);
});

console.log('\n=== OTRAS ANOMALIAS ===');
const anomalies = [];
for (const m of counted) {
  const mk = marketByMatch.get(m.id);
  if (!mk) { anomalies.push(`partido sin mercado: ${m.id}`); continue; }
  if (m.status === 'finished' && (m.home_score_90 == null || m.away_score_90 == null)) anomalies.push(`terminado sin score: ${m.id} ${m.kickoff_at.slice(0,10)}`);
  if (m.status === 'finished' && mk.status !== 'settled') anomalies.push(`terminado y mercado ${mk.status} (no settled): ${m.id} ${m.kickoff_at.slice(0,10)} tickets=${tickets.filter((t) => t.match_market_id === mk.id).length}`);
  if (mk.status === 'settled' && !mk.winning_outcome_code) anomalies.push(`settled sin winning_outcome_code: ${m.id}`);
  if (mk.status === 'settled') {
    const tix = tickets.filter((t) => t.match_market_id === mk.id);
    const unsettled = tix.filter((t) => pickByTicket.get(t.id) && !settlementByTicket.get(t.id));
    if (unsettled.length) anomalies.push(`mercado settled con ${unsettled.length} tickets sin settlement: ${m.id} (${unsettled.map((t) => userName.get(t.user_id)).join(',')})`);
  }
  if (m.status !== 'finished' && mk.status === 'settled') anomalies.push(`mercado settled con partido ${m.status}: ${m.id}`);
}
for (const t of tickets) {
  const mk = marketById.get(t.match_market_id);
  const m = mk ? matchById.get(mk.match_id) : null;
  if (!m) continue;
  const submitted = new Date(t.updated_at ?? t.submitted_at);
  if (submitted > new Date(m.kickoff_at)) anomalies.push(`pick guardado DESPUES del kickoff: ${userName.get(t.user_id)} ${m.id} kickoff=${m.kickoff_at.slice(0,16)} pick=${submitted.toISOString().slice(0,16)}`);
}
const inactiveWithTickets = users.filter((u) => u.is_active === false && tickets.some((t) => t.user_id === u.id));
for (const u of inactiveWithTickets) anomalies.push(`usuario inactivo con tickets: ${u.display_name}`);
if (!anomalies.length) console.log('  (ninguna)');
for (const a of anomalies.slice(0, 60)) console.log(`  ${a}`);
if (anomalies.length > 60) console.log(`  ... +${anomalies.length - 60} mas`);
