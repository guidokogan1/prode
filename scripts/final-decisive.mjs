import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: users } = await sb.from('users').select('id, display_name');
const userName = new Map(users.map((u) => [u.id, u.display_name]));

const { data: markets } = await sb.from('match_markets').select('id').eq('match_id', 'final-esp-arg');
const marketId = markets[0].id;
const { data: outcomes } = await sb.from('market_outcomes').select('id, code').eq('match_market_id', marketId);
const codeOf = new Map(outcomes.map((o) => [o.id, o.code]));
const { data: tickets } = await sb.from('tickets').select('id, user_id').eq('match_market_id', marketId);
const tIds = tickets.map((t) => t.id);
const { data: allocs } = await sb.from('ticket_allocations').select('ticket_id, market_outcome_id, amount').in('ticket_id', tIds);

const WIN = 'home_qualifies';
console.log('=== FINAL: España 1-0 Argentina → gana', WIN, '(España) ===\n');
const rows = [];
for (const t of tickets) {
  const a = allocs.filter((x) => x.ticket_id === t.id);
  const home = a.find((x) => codeOf.get(x.market_outcome_id) === 'home_qualifies')?.amount || 0;
  const away = a.find((x) => codeOf.get(x.market_outcome_id) === 'away_qualifies')?.amount || 0;
  const dominant = home > away ? 'home_qualifies (España)' : away > home ? 'away_qualifies (Argentina)' : 'TIE';
  const domCode = home > away ? 'home_qualifies' : away > home ? 'away_qualifies' : 'tie';
  const hit = domCode === WIN;
  rows.push({ name: userName.get(t.user_id), home, away, dominant, hit });
}
rows.sort((a, b) => Number(b.hit) - Number(a.hit));
for (const r of rows) {
  console.log(`  ${(r.name || '?').padEnd(10)} España=${String(r.home).padStart(6)}  Argentina=${String(r.away).padStart(6)}  → dominante=${r.dominant.padEnd(26)} ${r.hit ? '✅ ACIERTO (+1)' : '❌'}`);
}
console.log('\n  Aciertan la final (dominante=España):', rows.filter((r) => r.hit).map((r) => r.name).join(', '));
