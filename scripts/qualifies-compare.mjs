import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function allocsFor(marketMatchId) {
  const { data: markets } = await sb.from('match_markets').select('id, status, winning_outcome_code, market_type').eq('match_id', marketMatchId);
  const m = markets[0];
  const { data: tickets } = await sb.from('tickets').select('id, user_id').eq('match_market_id', m.id);
  const tIds = tickets.map((t) => t.id);
  const { data: allocs } = await sb.from('ticket_allocations').select('ticket_id, market_outcome_id, amount').in('ticket_id', tIds);
  const { data: outcomes } = await sb.from('market_outcomes').select('id, code').eq('match_market_id', m.id);
  const oc = new Map(outcomes.map((o) => [o.id, o.code]));
  const { data: setts } = await sb.from('settlements').select('ticket_id, net_result_amount, gross_return_amount, winning_outcome_code').in('ticket_id', tIds);
  return { m, tickets, allocs, oc, setts };
}

console.log('=== FINAL (final-esp-arg) — raw ===');
const f = await allocsFor('final-esp-arg');
console.log('market:', f.m);
console.log('tickets:', f.tickets.length, '| allocations rows:', f.allocs.length, '| settlements:', f.setts.length);
console.log('alloc detail:', f.allocs.map((a) => `${f.oc.get(a.market_outcome_id)}=${a.amount}`).slice(0, 20).join(', ') || 'NONE');

console.log('\n=== A settled qualifies for comparison (semi-final) ===');
const { data: semis } = await sb.from('matches').select('id, stage_id').ilike('id', 'semi%');
console.log('semi matches:', semis?.map((s) => s.id));
if (semis && semis.length) {
  const s = await allocsFor(semis[0].id);
  console.log('market:', s.m);
  console.log('tickets:', s.tickets.length, '| allocations rows:', s.allocs.length, '| settlements:', s.setts.length);
  console.log('alloc sample:', s.allocs.map((a) => `${s.oc.get(a.market_outcome_id)}=${a.amount}`).slice(0, 14).join(', '));
  console.log('settlement sample:', s.setts.slice(0, 5).map((x) => `net=${x.net_result_amount} win=${x.winning_outcome_code}`).join(' | '));
}
