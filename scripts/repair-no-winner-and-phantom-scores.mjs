import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CONFIRM = process.argv.includes('--confirm');
const CUTOFF = new Date('2026-08-21T00:00:00Z');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

async function all(t, c) {
  const rows = []; let from = 0;
  for (;;) {
    const { data, error } = await sb.from(t).select(c).range(from, from + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

const [users, teams, matches, markets, outcomes, tickets, allocs, settl, snaps] = await Promise.all([
  all('users', 'id, display_name'),
  all('teams', 'id, name'),
  all('matches', 'id, kickoff_at, status, home_team_id, away_team_id, home_score_90, away_score_90, home_score_ft, away_score_ft'),
  all('match_markets', 'id, match_id, market_type, status, winning_outcome_code'),
  all('market_outcomes', 'id, match_market_id, code'),
  all('tickets', 'id, user_id, match_market_id, credit_total'),
  all('ticket_allocations', 'ticket_id, market_outcome_id, amount'),
  all('settlements', 'ticket_id, winning_outcome_code, winning_pool_amount, total_pool_amount, winning_bet_amount, gross_return_amount, net_result_amount'),
  all('leaderboard_snapshots', 'user_id, rank_position, previous_rank_position, total_net_amount, positive_tickets_count, best_single_net_amount, as_of'),
]);

const un = new Map(users.map((u) => [u.id, u.display_name]));
const tn = new Map(teams.map((t) => [t.id, t.name]));
const oc = new Map(outcomes.map((o) => [o.id, o]));
const mById = new Map(matches.map((m) => [m.id, m]));
const sByT = new Map(settl.map((s) => [s.ticket_id, s]));

const pickByTicket = new Map();
for (const a of allocs) {
  if (Number(a.amount) <= 0) continue;
  const o = oc.get(a.market_outcome_id);
  if (!o) continue;
  const prev = pickByTicket.get(a.ticket_id);
  if (!prev || Number(a.amount) > prev.amount) pickByTicket.set(a.ticket_id, { code: o.code, amount: Number(a.amount) });
}

function realOutcome(m, marketType) {
  if (m.status !== 'finished') return null;
  if (marketType !== '1x2') return null;
  if (m.home_score_90 == null || m.away_score_90 == null) return null;
  if (m.home_score_90 > m.away_score_90) return 'home';
  if (m.away_score_90 > m.home_score_90) return 'away';
  return 'draw';
}

const abort = [];
const countsForTable = (mk) => {
  const m = mById.get(mk.match_id);
  return m != null && new Date(m.kickoff_at) >= CUTOFF;
};
const settledMarkets = markets.filter((mk) => mk.status === 'settled' && countsForTable(mk));
console.log(`Mercados settled dentro del torneo que cuenta (kickoff >= ${CUTOFF.toISOString().slice(0, 10)}): ${settledMarkets.length}`);
console.log(`Mercados settled de fechas pre-corte, ignorados a proposito: ${markets.filter((mk) => mk.status === 'settled' && !countsForTable(mk)).length}\n`);
for (const mk of settledMarkets) {
  const m = mById.get(mk.match_id);
  if (!m) { abort.push(`mercado settled sin partido: ${mk.id}`); continue; }
  if (mk.market_type !== '1x2') continue;
  const real = realOutcome(m, mk.market_type);
  if (real && mk.winning_outcome_code && real !== mk.winning_outcome_code) {
    abort.push(`resultado guardado != resultado real en ${m.id}: guardado=${mk.winning_outcome_code} real=${real}`);
  }
}

const noWinnerTickets = [];
for (const mk of settledMarkets) {
  const tix = tickets.filter((t) => t.match_market_id === mk.id);
  if (!tix.length) continue;
  const winners = tix.filter((t) => pickByTicket.get(t.id)?.code === mk.winning_outcome_code);
  if (winners.length) continue;
  const m = mById.get(mk.match_id);
  for (const t of tix) {
    const s = sByT.get(t.id);
    if (!s) { abort.push(`ticket sin settlement en mercado settled: ${t.id}`); continue; }
    noWinnerTickets.push({
      ticketId: t.id,
      user: un.get(t.user_id),
      match: `${tn.get(m?.home_team_id)} ${m?.home_score_90}-${m?.away_score_90} ${tn.get(m?.away_team_id)}`,
      pick: pickByTicket.get(t.id)?.code ?? 'VACIO',
      credit: t.credit_total,
      before: { gross: Number(s.gross_return_amount), net: Number(s.net_result_amount) },
      after: { gross: 0, net: -t.credit_total },
    });
  }
}

const phantomScores = matches.filter(
  (m) => m.status === 'scheduled' && (m.home_score_90 != null || m.away_score_90 != null),
);

console.log(`=== REPAIR ${CONFIRM ? '(APLICANDO)' : '(DRY RUN)'} ===\n`);

if (abort.length) {
  console.log('ABORTA: hay inconsistencias que este script no sabe arreglar solo:');
  for (const a of abort) console.log(`  - ${a}`);
  process.exit(1);
}
console.log('Guardas OK: todos los resultados guardados coinciden con el score real.\n');

console.log(`1) Tickets de partidos que nadie acerto (reembolso -> nadie cobra): ${noWinnerTickets.length}`);
for (const r of noWinnerTickets) {
  console.log(`   ${(r.user ?? '?').padEnd(14)} ${r.match.padEnd(46)} eligio=${r.pick.padEnd(6)} cobro ${r.before.gross} -> ${r.after.gross} | neto ${r.before.net} -> ${r.after.net}`);
}

console.log(`\n2) Partidos no jugados con score fantasma a limpiar (0-0 -> null): ${phantomScores.length}`);
console.log(`   (rompen el empate: si uno pasa a finished sin score real, el resultado derivado seria "draw")`);

const backup = { stamp: STAMP, settlements: settl, snapshots: snaps, phantomScoreMatchIds: phantomScores.map((m) => m.id), plannedSettlementChanges: noWinnerTickets };
const backupPath = `scripts/backup-repair-${STAMP}.json`;
writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log(`\nBackup escrito en ${backupPath}`);

if (!CONFIRM) {
  console.log('\nDRY RUN: no se escribio nada en la base. Corre con --confirm para aplicar.');
  process.exit(0);
}

let updated = 0;
for (const r of noWinnerTickets) {
  const { error } = await sb
    .from('settlements')
    .update({ winning_bet_amount: 0, gross_return_amount: 0, net_result_amount: -r.credit })
    .eq('ticket_id', r.ticketId);
  if (error) throw new Error(`settlement ${r.ticketId}: ${error.message}`);
  updated += 1;
}
console.log(`settlements actualizados: ${updated}`);

let cleaned = 0;
for (const m of phantomScores) {
  const { error } = await sb
    .from('matches')
    .update({ home_score_90: null, away_score_90: null, home_score_ft: null, away_score_ft: null })
    .eq('id', m.id)
    .eq('status', 'scheduled');
  if (error) throw new Error(`match ${m.id}: ${error.message}`);
  cleaned += 1;
}
console.log(`partidos con score fantasma limpiados: ${cleaned}`);
console.log('\nFALTA: recomputar el ranking -> POST /api/admin/recompute-ranking (o esperar el proximo settle).');
