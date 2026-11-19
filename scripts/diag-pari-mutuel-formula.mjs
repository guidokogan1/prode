import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let all = [];
let from = 0;
const PAGE = 1000;
for (;;) {
  const { data, error } = await sb
    .from('settlements')
    .select('id, ticket_id, winning_outcome_code, winning_pool_amount, total_pool_amount, winning_bet_amount, gross_return_amount, net_result_amount, tickets(credit_total, users(display_name))')
    .range(from, from + PAGE - 1);
  if (error) { console.error(error); process.exit(1); }
  all = all.concat(data);
  if (data.length < PAGE) break;
  from += PAGE;
}

let bad = 0;
for (const s of all) {
  const credit = s.tickets?.credit_total ?? 10000;
  const expectedGross =
    s.winning_pool_amount <= 0
      ? 0
      : Math.round((s.total_pool_amount * s.winning_bet_amount) / s.winning_pool_amount * 100) / 100;
  const expectedNet = expectedGross - credit;
  const grossDiff = Math.abs(expectedGross - Number(s.gross_return_amount));
  const netDiff = Math.abs(expectedNet - Number(s.net_result_amount));
  if (grossDiff > 0.02 || netDiff > 0.02) {
    bad++;
    console.log(`MISMATCH id=${s.id} user=${s.tickets?.users?.display_name} pool=${s.total_pool_amount} winPool=${s.winning_pool_amount} bet=${s.winning_bet_amount} expectedGross=${expectedGross} actualGross=${s.gross_return_amount} expectedNet=${expectedNet} actualNet=${s.net_result_amount}`);
  }
}

console.log(`\nTotal settlements checked: ${all.length}`);
console.log(`Mismatches: ${bad}`);
