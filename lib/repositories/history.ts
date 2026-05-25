import { getFallbackHistory } from "@/lib/mock-data";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { formatNetAmount } from "@/lib/game";
import { getCurrentSession } from "@/lib/server-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getHistory() {
  const supabase = getSupabaseServerClient();
  const demoPersona = await getActiveDemoPersonaSlug();

  if (!supabase) {
    return getFallbackHistory(demoPersona);
  }

  const session = await getCurrentSession();

  if (!session?.userId) {
    return getFallbackHistory(demoPersona);
  }

  const query = await supabase
    .from("settlements")
    .select(
      "ticket_id, net_result_amount, ticket:tickets(match_market_id), market:match_markets!inner(match_id), match:matches!inner(id, stage:tournament_stages(name), home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)), allocations:ticket_allocations(amount, outcome:market_outcomes(label))",
    )
    .eq("ticket.user_id", session.userId)
    .order("settled_at", { ascending: false })
    .limit(10);

  if (query.error || !query.data?.length) {
    return getFallbackHistory(demoPersona);
  }

  return query.data.map((row, index) => {
    const match = Array.isArray(row.match) ? row.match[0] : row.match;
    const home = Array.isArray(match?.home) ? match.home[0] : match?.home;
    const away = Array.isArray(match?.away) ? match.away[0] : match?.away;
    const stage = Array.isArray(match?.stage) ? match.stage[0] : match?.stage;

    return {
      id: `${row.ticket_id}-${index}`,
      title: `${home?.name ?? "Equipo A"} vs ${away?.name ?? "Equipo B"}`,
      stage: stage?.name ?? "Partido",
      description:
        row.net_result_amount >= 0
          ? "Jugada liquidada en positivo."
          : "Jugada liquidada por debajo de la base.",
      net: row.net_result_amount,
      netLabel: formatNetAmount(row.net_result_amount),
      allocations: (row.allocations ?? []).map(
        (allocation: { amount: number; outcome: { label: string }[] | { label: string } | null }) => {
          const outcome = Array.isArray(allocation.outcome)
            ? allocation.outcome[0]
            : allocation.outcome;

          return {
            label: outcome?.label ?? "Outcome",
            amount: allocation.amount.toLocaleString("es-AR"),
          };
        },
      ),
    };
  });
}
