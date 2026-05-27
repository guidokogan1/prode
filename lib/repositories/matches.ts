import type { MatchViewModel } from "@/lib/domain";
import { getFallbackMatchById, getFallbackMatches, getFallbackMatchesByStage } from "@/lib/mock-data";
import { getActiveDemoPersonaSlug } from "@/lib/demo-state";
import { formatNetAmount } from "@/lib/game";
import { getCurrentSession } from "@/lib/server-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function listMatches() {
  const supabase = getSupabaseServerClient();
  const demoPersona = await getActiveDemoPersonaSlug();

  if (!supabase) {
    return getFallbackMatches(demoPersona);
  }

  return getFallbackMatches(demoPersona);
}

export async function listMatchesByStage() {
  const supabase = getSupabaseServerClient();
  const demoPersona = await getActiveDemoPersonaSlug();

  if (!supabase) {
    return getFallbackMatchesByStage(demoPersona);
  }

  return getFallbackMatchesByStage(demoPersona);
}

export async function getMatchById(id: string): Promise<MatchViewModel | null> {
  const supabase = getSupabaseServerClient();
  const demoPersona = await getActiveDemoPersonaSlug();

  if (!supabase) {
    return getFallbackMatchById(id, demoPersona) ?? null;
  }

  const fallback = getFallbackMatchById(id, demoPersona) ?? null;
  if (!fallback) {
    return null;
  }

  const session = await getCurrentSession();
  if (!session?.userId) {
    return fallback;
  }

  const marketQuery = await supabase
    .from("match_markets")
    .select("id, status")
    .eq("match_id", id)
    .maybeSingle<{ id: string; status: string }>();

  if (marketQuery.error || !marketQuery.data) {
    return fallback;
  }

  const ticketQuery = await supabase
    .from("tickets")
    .select("id")
    .eq("user_id", session.userId)
    .eq("match_market_id", marketQuery.data.id)
    .maybeSingle<{ id: string }>();

  if (ticketQuery.error || !ticketQuery.data) {
    return {
      ...fallback,
      isEditable: marketQuery.data.status === "open",
      userStateLabel: fallback.status === "scheduled" ? "Te falta jugar" : fallback.userStateLabel,
    };
  }

  const [allocationsQuery, settlementQuery] = await Promise.all([
    supabase
      .from("ticket_allocations")
      .select("amount, outcome:market_outcomes(label)")
      .eq("ticket_id", ticketQuery.data.id)
      .returns<{ amount: number; outcome: { label: string } | null }[]>(),
    supabase
      .from("settlements")
      .select("net_result_amount")
      .eq("ticket_id", ticketQuery.data.id)
      .maybeSingle<{ net_result_amount: number }>(),
  ]);

  if (allocationsQuery.error) {
    return fallback;
  }

  const allocationMap = new Map(
    (allocationsQuery.data ?? []).map((item) => [normalizeLabel(item.outcome?.label ?? ""), item.amount]),
  );

  const updatedAllocation = fallback.allocation.map((item) => {
    const amount = allocationMap.get(normalizeLabel(item.label)) ?? Number(item.amount.replace(".", ""));
    return {
      ...item,
      amount: amount.toLocaleString("es-AR"),
      percentage: Math.round((amount / 10000) * 100),
    };
  });

  let userStateLabel = "Tu jugada guardada";
  if (settlementQuery.data) {
    userStateLabel = `Resultado ${formatNetAmount(settlementQuery.data.net_result_amount)}`;
  } else if (marketQuery.data.status === "revealed") {
    userStateLabel = "Reveal activo";
  }

  let revealedTickets = fallback.revealedTickets;
  const outcomeMeta = new Map(
    fallback.allocation.map((item) => [
      normalizeLabel(item.label),
      { code: item.code, shortLabel: item.shortLabel },
    ]),
  );

  if (marketQuery.data.status === "revealed" || marketQuery.data.status === "settled") {
    const revealQuery = await supabase
      .from("tickets")
      .select(
        "id, user:users(display_name), allocations:ticket_allocations(amount, outcome:market_outcomes(label)), settlement:settlements(net_result_amount)",
      )
      .eq("match_market_id", marketQuery.data.id);

    if (!revealQuery.error && revealQuery.data?.length) {
      revealedTickets = revealQuery.data.map((ticket) => {
        const user = Array.isArray(ticket.user) ? ticket.user[0] : ticket.user;
        const settlement = Array.isArray(ticket.settlement) ? ticket.settlement[0] : ticket.settlement;

        return {
          userName: user?.display_name ?? "Jugador",
          allocations: (ticket.allocations ?? []).map(
            (allocation: {
              amount: number;
              outcome: { label: string }[] | { label: string } | null;
            }) => {
              const outcome = Array.isArray(allocation.outcome)
                ? allocation.outcome[0]
                : allocation.outcome;

              return {
                code: outcomeMeta.get(normalizeLabel(outcome?.label ?? ""))?.code ?? fallback.allocation[0]?.code ?? "home",
                label: outcome?.label ?? "Outcome",
                shortLabel:
                  outcomeMeta.get(normalizeLabel(outcome?.label ?? ""))?.shortLabel ??
                  (outcome?.label ?? "Outcome"),
                amount: allocation.amount.toLocaleString("es-AR"),
              };
            },
          ),
          netLabel: settlement?.net_result_amount != null
            ? formatNetAmount(settlement.net_result_amount)
            : undefined,
        };
      });
    }
  }

  return {
    ...fallback,
    allocation: updatedAllocation,
    userStateLabel,
    isEditable: marketQuery.data.status === "open",
    revealedTickets,
  };
}

function normalizeLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
