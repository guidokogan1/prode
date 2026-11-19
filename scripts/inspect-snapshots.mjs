import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

const { data, error } = await sb
  .from('leaderboard_snapshots')
  .select('rank_position, previous_rank_position, as_of, total_net_amount, user:users(display_name)')
  .order('rank_position', { ascending: true });

if (error) { console.error(error); process.exit(1); }

console.log('rank | prev | move | net | as_of | name');
for (const r of data) {
  const move = r.previous_rank_position == null ? 'null' : (r.previous_rank_position - r.rank_position);
  console.log(`${String(r.rank_position).padStart(2)}  | ${String(r.previous_rank_position).padStart(4)} | ${String(move).padStart(4)} | ${String(r.total_net_amount).padStart(8)} | ${r.as_of} | ${r.user?.display_name}`);
}
