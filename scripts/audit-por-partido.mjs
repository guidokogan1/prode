import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CUTOFF = new Date('2026-08-21T00:00:00Z');
async function all(t, c) { const r = []; let f = 0; for (;;) { const { data, error } = await sb.from(t).select(c).range(f, f + 999); if (error) throw new Error(`${t}: ${error.message}`); r.push(...data); if (data.length < 1000) break; f += 1000; } return r; }
const [users, teams, matches, markets, outcomes, tickets, allocs, settl] = await Promise.all([
  all('users', 'id, display_name'), all('teams', 'id, name'),
  all('matches', 'id, kickoff_at, status, home_team_id, away_team_id, home_score_90, away_score_90'),
  all('match_markets', 'id, match_id, market_type, status, winning_outcome_code, settled_at'),
  all('market_outcomes', 'id, match_market_id, code'),
  all('tickets', 'id, user_id, match_market_id, credit_total, updated_at'),
  all('ticket_allocations', 'ticket_id, market_outcome_id, amount'),
  all('settlements', 'ticket_id, winning_outcome_code, winning_pool_amount, total_pool_amount, winning_bet_amount, gross_return_amount, net_result_amount'),
]);
const tn = new Map(teams.map((t) => [t.id, t.name])), un = new Map(users.map((u) => [u.id, u.display_name]));
const oc = new Map(outcomes.map((o) => [o.id, o]));
const pick = new Map();
for (const a of allocs) { if (Number(a.amount) <= 0) continue; const o = oc.get(a.market_outcome_id); if (!o) continue; const p = pick.get(a.ticket_id); if (!p || Number(a.amount) > p.amount) pick.set(a.ticket_id, { code: o.code, amount: Number(a.amount) }); }
const sByT = new Map(settl.map((s) => [s.ticket_id, s]));
const mById = new Map(matches.map((m) => [m.id, m]));
for (const mk of markets.filter((k) => k.settled_at).sort((a, b) => a.settled_at.localeCompare(b.settled_at))) {
  const m = mById.get(mk.match_id);
  if (!m || new Date(m.kickoff_at) < CUTOFF) continue;
  const tix = tickets.filter((t) => t.match_market_id === mk.id);
  const pool = tix.reduce((s, t) => s + (pick.get(t.id)?.amount ?? 0), 0);
  const winPool = tix.filter((t) => pick.get(t.id)?.code === mk.winning_outcome_code).reduce((s, t) => s + (pick.get(t.id)?.amount ?? 0), 0);
  console.log(`\n${m.kickoff_at.slice(0, 16)}  ${tn.get(m.home_team_id)} ${m.home_score_90}-${m.away_score_90} ${tn.get(m.away_team_id)}  ganador=${mk.winning_outcome_code}`);
  console.log(`  pool=${pool} poolGanador=${winPool}${winPool === 0 ? '  <-- NADIE ACERTO (reembolso a todos)' : ''}`);
  for (const t of tix.sort((a, b) => (un.get(a.user_id) ?? '').localeCompare(un.get(b.user_id) ?? ''))) {
    const p = pick.get(t.id), s = sByT.get(t.id);
    const hit = p && p.code === mk.winning_outcome_code;
    console.log(`    ${(un.get(t.user_id) ?? '?').padEnd(14)} eligio=${(p?.code ?? 'VACIO').padEnd(6)} ${hit ? 'ACERTO' : 'erro  '} gross=${s ? Number(s.gross_return_amount) : 'SIN SETTLEMENT'} net=${s ? Number(s.net_result_amount) : '-'}`);
  }
}
