import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: m } = await sb.from('matches').select('*').eq('id', (await sb.from('matches').select('id, home_team_id, away_team_id, status, home_score_90, away_score_90, home_score_ft, away_score_ft, kickoff_at').ilike('id', '%').then(r => r.data.find(x => x))).id);

const { data: teams } = await sb.from('teams').select('id, name');
const tn = (id) => teams.find((t) => t.id === id)?.name;

const { data: matches } = await sb.from('matches').select('id, home_team_id, away_team_id, status, home_score_90, away_score_90, home_score_ft, away_score_ft, kickoff_at');
const match = matches.find((x) => tn(x.home_team_id) === 'Sudafrica' && tn(x.away_team_id) === 'Corea del Sur');
console.log('MATCH:', match.id, tn(match.home_team_id), tn(match.away_team_id), `${match.home_score_90}-${match.away_score_90}`, 'status', match.status, 'kickoff', match.kickoff_at);

const { data: market } = await sb.from('match_markets').select('*').eq('match_id', match.id).single();
console.log('MARKET:', market.id, 'type', market.market_type, 'status', market.status, 'win', market.winning_outcome_code, 'settled_at', market.settled_at);

const { data: outs } = await sb.from('market_outcomes').select('id, code').eq('match_market_id', market.id);
const oc = (id) => outs.find((o) => o.id === id)?.code;

const { data: tickets } = await sb.from('tickets').select('id, user_id').eq('match_market_id', market.id);
const { data: users } = await sb.from('users').select('id, display_name');
const un = (id) => users.find((u) => u.id === id)?.display_name;

const { data: settlements } = await sb.from('settlements').select('ticket_id').in('ticket_id', tickets.map((t) => t.id));
console.log('TICKETS:', tickets.length, '| SETTLEMENTS:', settlements.length);

console.log('\nPicks de cada uno en este partido (ganó', market.winning_outcome_code + '):');
for (const t of tickets) {
  const { data: a } = await sb.from('ticket_allocations').select('market_outcome_id, amount').eq('ticket_id', t.id);
  const sorted = a.filter((x) => x.amount > 0).sort((x, y) => y.amount - x.amount);
  const dom = sorted[0] ? oc(sorted[0].market_outcome_id) : null;
  const breakdown = sorted.map((x) => `${oc(x.market_outcome_id)}:${x.amount}`).join(' ');
  const hit = dom === market.winning_outcome_code;
  console.log(`  ${un(t.user_id).padEnd(10)} dom=${dom} ${hit ? 'ACERTÓ (le falta +1)' : ''}  [${breakdown}]`);
}
