import type {
  HistoryEntry,
  HomeSummary,
  MatchStageGroup,
  MatchViewModel,
  ProductProvider,
  ProfileViewModel,
  RankingEntry,
  SaveTicketPayload,
  SaveTicketResult,
  SessionState,
} from "@/lib/domain";
import { formatNetAmount, MATCH_CREDIT, validateAllocations } from "@/lib/game";
import { getFallbackHistory, getFallbackMatchById, getFallbackMatchesByStage, getFallbackRanking } from "@/lib/mock-data";
import { getServerSessionState } from "@/lib/product/session-state";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type MarketRow = { id: string; status: string; lock_at: string | null };
type OutcomeRow = { id: string; label: string };

export class SupabaseProductProvider implements ProductProvider {
  mode = "supabase" as const;

  async getSessionState(): Promise<SessionState> {
    return getServerSessionState(this.mode);
  }

  async getHomeSummary(): Promise<HomeSummary> {
    const supabase = getSupabaseOrThrow();
    const [session, liveMatchesQuery, settledTodayQuery, matches] = await Promise.all([
      this.getSessionState(),
      supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "live"),
      supabase
        .from("settlements")
        .select("id", { count: "exact", head: true })
        .gte("settled_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      this.getMatchesForHome(),
    ]);

    let yourNetAmount = 0;

    if (session.userId) {
      const leaderboardQuery = await supabase
        .from("leaderboard_snapshots")
        .select("total_net_amount")
        .eq("user_id", session.userId)
        .order("as_of", { ascending: false })
        .limit(1)
        .maybeSingle<{ total_net_amount: number }>();

      if (!leaderboardQuery.error && leaderboardQuery.data) {
        yourNetAmount = leaderboardQuery.data.total_net_amount;
      }
    }

    return {
      liveMatches: liveMatchesQuery.count ?? 0,
      pendingPicks: matches.filter((match) => match.userStateLabel === "Te falta jugar").length,
      settledToday: settledTodayQuery.count ?? 0,
      yourNetAmount,
    };
  }

  async getMatchesForHome(): Promise<MatchViewModel[]> {
    const groups = await this.listMatchesByStage();
    return groups.flatMap((group) => group.matches).sort(sortMatchesForHome);
  }

  async listMatches(): Promise<MatchViewModel[]> {
    const groups = await this.listMatchesByStage();
    return groups.flatMap((group) => group.matches);
  }

  async listMatchesByStage(): Promise<MatchStageGroup[]> {
    const session = await this.getSessionState();
    return getFallbackMatchesByStage(session.demoPersonaSlug);
  }

  async getMatchDetail(id: string): Promise<MatchViewModel | null> {
    const supabase = getSupabaseOrThrow();
    const session = await this.getSessionState();
    const fallback = getFallbackMatchById(id, session.demoPersonaSlug) ?? null;

    if (!fallback) {
      return null;
    }

    if (!session.userId) {
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
        marketStatus: normalizeMarketStatus(marketQuery.data.status),
        isEditable: marketQuery.data.status === "open",
        userStateLabel: fallback.status === "scheduled" ? "Te falta jugar" : fallback.userStateLabel,
        draftState: "idle",
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
      const amount = allocationMap.get(normalizeLabel(item.label)) ?? item.amount;
      return {
        ...item,
        amount,
        percentage: Math.round((amount / MATCH_CREDIT) * 100),
      };
    });

    let userStateLabel = "Jugada remota guardada";
    let draftState: MatchViewModel["draftState"] = "saved_remote";

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
              (allocation: { amount: number; outcome: { label: string }[] | { label: string } | null }) => {
                const outcome = Array.isArray(allocation.outcome) ? allocation.outcome[0] : allocation.outcome;
                return {
                  code: outcomeMeta.get(normalizeLabel(outcome?.label ?? ""))?.code ?? fallback.allocation[0]?.code ?? "home",
                  label: outcome?.label ?? "Outcome",
                  shortLabel:
                    outcomeMeta.get(normalizeLabel(outcome?.label ?? ""))?.shortLabel ??
                    (outcome?.label ?? "Outcome"),
                  amount: allocation.amount,
                };
              },
            ),
            netAmount: settlement?.net_result_amount ?? undefined,
          };
        });
      }
    }

    return {
      ...fallback,
      allocation: updatedAllocation,
      userStateLabel,
      marketStatus: normalizeMarketStatus(marketQuery.data.status),
      draftState,
      isEditable: marketQuery.data.status === "open",
      revealedTickets,
    };
  }

  async getRanking(): Promise<RankingEntry[]> {
    const supabase = getSupabaseOrThrow();
    const session = await this.getSessionState();
    const query = await supabase
      .from("leaderboard_snapshots")
      .select("rank_position, total_net_amount, positive_tickets_count, best_single_net_amount, user:users(display_name)")
      .order("rank_position", { ascending: true })
      .returns<
        {
          rank_position: number;
          total_net_amount: number;
          positive_tickets_count: number;
          best_single_net_amount: number | null;
          user: { display_name: string } | null;
        }[]
      >();

    if (query.error || !query.data?.length) {
      return getFallbackRanking();
    }

    return query.data.map((item) => ({
      position: item.rank_position,
      name: item.user?.display_name ?? "Jugador",
      netAmount: item.total_net_amount,
      positiveTickets: item.positive_tickets_count,
      bestHitAmount: item.best_single_net_amount ?? 0,
      isCurrentUser: session.displayName === item.user?.display_name,
    }));
  }

  async getProfile(): Promise<ProfileViewModel> {
    const supabase = getSupabaseOrThrow();
    const session = await this.getSessionState();

    if (!session.userId) {
      return {
        name: "Sin entrar",
        netAmount: 0,
        positiveTickets: 0,
        bestHitAmount: 0,
        championPick: "Sin elegir",
      };
    }

    const [userQuery, leaderboardQuery, championQuery] = await Promise.all([
      supabase.from("users").select("display_name").eq("id", session.userId).maybeSingle<{ display_name: string }>(),
      supabase
        .from("leaderboard_snapshots")
        .select("total_net_amount, positive_tickets_count, best_single_net_amount")
        .eq("user_id", session.userId)
        .order("as_of", { ascending: false })
        .limit(1)
        .maybeSingle<{ total_net_amount: number; positive_tickets_count: number; best_single_net_amount: number | null }>(),
      supabase
        .from("champion_picks")
        .select("team:teams(name)")
        .eq("user_id", session.userId)
        .maybeSingle<{ team: { name: string } | null }>(),
    ]);

    return {
      name: userQuery.data?.display_name ?? session.displayName ?? "Jugador",
      netAmount: leaderboardQuery.data?.total_net_amount ?? 0,
      positiveTickets: leaderboardQuery.data?.positive_tickets_count ?? 0,
      bestHitAmount: leaderboardQuery.data?.best_single_net_amount ?? 0,
      championPick: championQuery.data?.team?.name ?? "Sin elegir",
      isCurrentUser: true,
    };
  }

  async getHistory(): Promise<HistoryEntry[]> {
    const supabase = getSupabaseOrThrow();
    const session = await this.getSessionState();

    if (!session.userId) {
      return [];
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
      return getFallbackHistory(session.demoPersonaSlug);
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
        netAmount: row.net_result_amount,
        allocations: (row.allocations ?? []).map(
          (allocation: { amount: number; outcome: { label: string }[] | { label: string } | null }) => {
            const outcome = Array.isArray(allocation.outcome) ? allocation.outcome[0] : allocation.outcome;
            return {
              label: outcome?.label ?? "Outcome",
              amount: allocation.amount,
            };
          },
        ),
      };
    });
  }

  async submitTicket(payload: SaveTicketPayload): Promise<SaveTicketResult> {
    const supabase = getSupabaseOrThrow();
    const session = await this.getSessionState();
    const validation = validateAllocations(
      payload.allocations.map((allocation) => ({
        outcomeCode: allocation.label,
        amount: allocation.amount,
      })),
    );

    if (!validation.ok) {
      return {
        ok: false,
        state: "sync_error",
        reason: validation.reason ?? "Jugada inválida.",
      };
    }

    if (!session.userId) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se encontró una sesión remota válida.",
      };
    }

    const marketQuery = await supabase
      .from("match_markets")
      .select("id, status, lock_at")
      .eq("match_id", payload.matchId)
      .maybeSingle<MarketRow>();

    if (marketQuery.error || !marketQuery.data) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se encontró el mercado del partido.",
      };
    }

    const marketId = marketQuery.data.id;
    if (marketQuery.data.status !== "open") {
      return {
        ok: false,
        state: "sync_error",
        reason: "Este mercado ya cerró y no admite cambios.",
      };
    }

    const outcomesQuery = await supabase
      .from("market_outcomes")
      .select("id, label")
      .eq("match_market_id", marketId)
      .returns<OutcomeRow[]>();

    if (outcomesQuery.error || !outcomesQuery.data) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se pudieron cargar los outcomes del partido.",
      };
    }

    const ticketUpsert = await supabase
      .from("tickets")
      .upsert(
        {
          user_id: session.userId,
          match_market_id: marketId,
          credit_total: MATCH_CREDIT,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,match_market_id" },
      )
      .select("id")
      .single<{ id: string }>();

    if (ticketUpsert.error) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se pudo guardar el ticket.",
      };
    }

    const allocationRows = payload.allocations
      .map((allocation) => {
        const outcome = outcomesQuery.data.find(
          (candidate) => normalizeLabel(candidate.label) === normalizeLabel(allocation.label),
        );

        if (!outcome) {
          return null;
        }

        return {
          ticket_id: ticketUpsert.data.id,
          market_outcome_id: outcome.id,
          amount: allocation.amount,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (allocationRows.length !== payload.allocations.length) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No coinciden las opciones de la jugada con las del mercado.",
      };
    }

    const deleteExisting = await supabase.from("ticket_allocations").delete().eq("ticket_id", ticketUpsert.data.id);
    if (deleteExisting.error) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se pudo actualizar la jugada existente.",
      };
    }

    const insertAllocations = await supabase.from("ticket_allocations").insert(allocationRows);
    if (insertAllocations.error) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se pudieron guardar los montos de la jugada.",
      };
    }

    return {
      ok: true,
      mode: "remote",
      state: "saved_remote",
      message: "Jugada guardada en backend.",
    };
  }
}

function getSupabaseOrThrow() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }
  return supabase;
}

function normalizeLabel(label: string) {
  return label.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function normalizeMarketStatus(status: string): MatchViewModel["marketStatus"] {
  if (status === "locked" || status === "revealed" || status === "settled") {
    return status;
  }

  return "open";
}

function sortMatchesForHome(left: MatchViewModel, right: MatchViewModel) {
  const score = (match: MatchViewModel) => {
    if (match.statusVariant === "live") {
      return 0;
    }
    if (match.isEditable) {
      return 1;
    }
    if (match.statusVariant === "locked") {
      return 2;
    }
    return 3;
  };

  return score(left) - score(right);
}
