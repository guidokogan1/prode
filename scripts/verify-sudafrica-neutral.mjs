import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MATCH_CREDIT = 10000;

async function fetchAll(table, columns) {
  const rows = []; let from = 0; const size = 1000;
  for (;;) { const { data, error } = await sb.from(table).select(columns).range(from, from + size - 1); if (error) throw error; rows.push(...data); if (data.length < size) break; from += size; }
  return rows;
}

const users = (await fetchAll('users', 'id, display_name, is_active')).filter(u => u.is_active);
const tickets = await fetchAll('tickets', 'id, user_id, match_market_id');
const ticketUser = new Map(tickets.map(t => [t.id, t.user_id]));
const outcomes = await fetchAll('market_outcomes', 'id, code');
const ocCode = new Map(outcomes.map(o => [o.id, o.code]));
const allocs = await fetchAll('ticket_allocations', 'ticket_id, market_outcome_id, amount');
const allocsByTicket = new Map();
for (const a of allocs) { if (!allocsByTicket.has(a.ticket_id)) allocsByTicket.set(a.ticket_id, []); allocsByTicket.get(a.ticket_id).push(a); }
const settlements = await fetchAll('settlements', 'ticket_id, winning_outcome_code, net_result_amount');

function computeStandings({ includeSudafricaRefund }) {
  const agg = new Map();
  const get = (uid) => { if (!agg.has(uid)) agg.set(uid, { gross: 0, hits: 0, bestHitGross: 0, net: 0 }); return agg.get(uid); };
  for (const s of settlements) {
    const uid = ticketUser.get(s.ticket_id); if (!uid) continue;
    const g = get(uid);
    const gross = s.net_result_amount + MATCH_CREDIT;
    g.gross += gross; g.net += s.net_result_amount; g.bestHitGross = Math.max(g.bestHitGross, gross);
    const a = (allocsByTicket.get(s.ticket_id) ?? []).filter(x => x.amount > 0).sort((x, y) => y.amount - x.amount);
    const dom = a[0] ? ocCode.get(a[0].market_outcome_id) : null;
    if (dom && dom === s.winning_outcome_code) g.hits += 1;
  }
  if (includeSudafricaRefund) {
    for (const u of users) { const g = get(u.id); g.gross += MATCH_CREDIT; g.net += 0; g.bestHitGross = Math.max(g.bestHitGross, MATCH_CREDIT); }
  }
  return users.map(u => ({ name: u.display_name, ...get(u.id) }))
    .sort((a, b) => {
      if (b.gross !== a.gross) return b.gross - a.gross;
      if (b.hits !== a.hits) return b.hits - a.hits;
      if (b.bestHitGross !== a.bestHitGross) return b.bestHitGross - a.bestHitGross;
      return a.name.localeCompare(b.name);
    });
}

const before = computeStandings({ includeSudafricaRefund: false });
const after = computeStandings({ includeSudafricaRefund: true });

console.log('pos | ACTUAL (sin Sudáfrica)        | CON reembolso Sudáfrica       | ¿igual?');
let identical = true;
for (let i = 0; i < before.length; i++) {
  const b = before[i], a = after[i];
  const same = b.name === a.name;
  if (!same) identical = false;
  console.log(`${String(i + 1).padStart(2)}  | ${b.name.padEnd(10)} g:${String(b.gross).padStart(8)} h:${b.hits} | ${a.name.padEnd(10)} g:${String(a.gross).padStart(8)} h:${a.hits} | ${same ? 'sí' : '⚠️ NO'}`);
}
console.log(`\nbestHitGross < 10000 (riesgo de tiebreak): ${before.filter(b => b.bestHitGross < MATCH_CREDIT).map(b => b.name).join(', ') || 'ninguno'}`);
console.log(`\n${identical ? '✅ EL ORDEN NO CAMBIA. Reembolso de Sudáfrica es position-neutral.' : '⚠️ EL ORDEN CAMBIA — NO aplicar.'}`);
