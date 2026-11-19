import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: users } = await sb.from('users').select('id, display_name');
const userName = new Map(users.map((u) => [u.id, u.display_name]));

const { data: markets } = await sb.from('match_markets').select('id, match_id, status, winning_outcome_code').eq('match_id', 'final-esp-arg');
const market = markets[0];
console.log('FINAL market:', market);

const { data: outcomes } = await sb.from('market_outcomes').select('id, code, label').eq('match_market_id', market.id);
const outLabel = new Map(outcomes.map((o) => [o.id, `${o.code}/${o.label}`]));
console.log('outcomes:', outcomes.map((o) => `${o.code}=${o.label}`).join(', '));

const { data: tickets } = await sb.from('tickets').select('id, user_id').eq('match_market_id', market.id);
const { data: allocs } = await sb.from('ticket_allocations').select('ticket_id, market_outcome_id, amount');

console.log('\n=== FINAL tickets (España 1-0 Argentina → España/home gana) ===');
for (const t of tickets) {
  const ta = allocs.filter((a) => a.ticket_id === t.id && a.amount > 0).sort((a, b) => b.amount - a.amount);
  const picks = ta.map((a) => `${outLabel.get(a.market_outcome_id)}:${a.amount}`).join('  ');
  const dominant = ta[0] ? outLabel.get(ta[0].market_outcome_id) : 'none';
  console.log(`  ${(userName.get(t.user_id) || '?').padEnd(10)} dominante=${String(dominant).padEnd(22)} | ${picks}`);
}
