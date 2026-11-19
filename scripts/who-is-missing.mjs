import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

const { data: users } = await sb.from('users').select('id, display_name, is_active').eq('is_active', true);
const { data: matches } = await sb.from('matches').select('id, status, kickoff_at');
const { data: markets } = await sb.from('match_markets').select('id, match_id');
const { data: tickets } = await sb.from('tickets').select('user_id, match_market_id');

const marketsByMatch = {};
markets.forEach(m => { (marketsByMatch[m.match_id] ||= []).push(m.id); });

const now = new Date();
const openMatches = matches.filter(m => new Date(m.kickoff_at) > now);
const totalOpenMarkets = openMatches.flatMap(m => marketsByMatch[m.id] || []);

const ticketsByUser = {};
tickets.forEach(t => { (ticketsByUser[t.user_id] ||= new Set()).add(t.match_market_id); });

console.log(`Users activos: ${users.length}`);
console.log(`Matches total: ${matches.length} | abiertos (kickoff futuro): ${openMatches.length}`);
console.log(`Markets en partidos abiertos: ${totalOpenMarkets.length}\n`);

const rows = users.map(u => {
  const userMarkets = ticketsByUser[u.id] || new Set();
  const done = totalOpenMarkets.filter(mid => userMarkets.has(mid)).length;
  return { name: u.display_name, done, missing: totalOpenMarkets.length - done };
}).sort((a, b) => b.missing - a.missing);

console.log('Usuario'.padEnd(28) + 'Hechos'.padStart(8) + '   Faltan');
console.log('-'.repeat(50));
rows.forEach(r => console.log(`${r.name.padEnd(28)}${String(r.done).padStart(4)} / ${totalOpenMarkets.length}   ${r.missing}`));
