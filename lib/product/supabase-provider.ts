import type {
  HistoryEntry,
  HomeSummary,
  MatchStageGroup,
  MatchOutcomeCode,
  MatchViewModel,
  ProductProvider,
  ProfileViewModel,
  RankingEntry,
  SaveTicketPayload,
  SaveTicketResult,
  SessionState,
} from "@/lib/domain";
import { formatNetAmount, MATCH_CREDIT, validateAllocations } from "@/lib/game";
import { getFallbackHistory, getFallbackRanking } from "@/lib/mock-data";
import { logPickEvent } from "@/lib/pick-events";
import { getServerSessionState } from "@/lib/product/session-state";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getWorldCupGroupLabel, getWorldCupTeamMeta } from "@/lib/world-cup-2026";

type MarketRow = { id: string; status: string; lock_at: string | null };
type OutcomeRow = { id: string; label: string };
type MarketQueryRow = {
  id: string;
  match_id: string;
  market_type: string;
  lock_at: string;
  winning_outcome_code: string | null;
  status: string;
};
type MatchQueryRow = {
  id: string;
  kickoff_at: string;
  status: string;
  venue_name: string | null;
  venue_city: string | null;
  home_score_90: number | null;
  away_score_90: number | null;
  home_score_ft: number | null;
  away_score_ft: number | null;
  stage: { code: string; name: string; sort_order: number } | { code: string; name: string; sort_order: number }[] | null;
  home: { name: string; fifa_code: string } | { name: string; fifa_code: string }[] | null;
  away: { name: string; fifa_code: string } | { name: string; fifa_code: string }[] | null;
};
type OutcomeQueryRow = {
  match_market_id: string;
  code: string;
  label: string;
  sort_order: number;
};
type TicketQueryRow = {
  id: string;
  user_id: string;
  match_market_id: string;
};
type AllocationQueryRow = {
  ticket_id: string;
  amount: number;
  outcome: { code: string; label: string } | { code: string; label: string }[] | null;
};
type SettlementQueryRow = {
  ticket_id: string;
  net_result_amount: number;
};
type UserQueryRow = {
  id: string;
  display_name: string;
};

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
    const matches = await this.loadMatchViewModels();
    return matches.map((item) => item.match);
  }

  async listMatchesByStage(): Promise<MatchStageGroup[]> {
    const matches = await this.loadMatchViewModels();
    const groups = new Map<string, MatchStageGroup & { sortOrder: number; kickoffAt: string }>();

    for (const item of matches) {
      const key = item.match.groupLabel
        ? `group:${item.match.groupLabel}`
        : `stage:${item.match.stage}`;
      const label = item.match.groupLabel ?? item.match.stage;

      if (!groups.has(key)) {
        groups.set(key, {
          stage: item.match.stage,
          label,
          matches: [],
          sortOrder: item.stageSortOrder,
          kickoffAt: item.kickoffAt,
        });
      }

      groups.get(key)!.matches.push(item.match);
    }

    return Array.from(groups.values())
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        if (left.label !== right.label) {
          return left.label.localeCompare(right.label, "es");
        }

        return left.kickoffAt.localeCompare(right.kickoffAt);
      })
      .map(({ sortOrder: _sortOrder, kickoffAt: _kickoffAt, ...group }) => group);
  }

  async getMatchDetail(id: string): Promise<MatchViewModel | null> {
    const matches = await this.loadMatchViewModels({ matchId: id, includeReveals: true });
    return matches[0]?.match ?? null;
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

    await logPickEvent({
      kind: "match_pick",
      userDisplayName: session.displayName ?? "unknown",
      matchId: payload.matchId,
      allocations: payload.allocations,
    });

    return {
      ok: true,
      mode: "remote",
      state: "saved_remote",
      message: "Jugada guardada en backend.",
    };
  }
  private async loadMatchViewModels(options: LoadMatchOptions = {}): Promise<LoadedMatch[]> {
    const supabase = getSupabaseOrThrow();
    const session = await this.getSessionState();
    const matchesQuery = await supabase
      .from("matches")
      .select(
        "id, kickoff_at, status, venue_name, venue_city, home_score_90, away_score_90, home_score_ft, away_score_ft, stage:tournament_stages(code, name, sort_order), home:teams!matches_home_team_id_fkey(name, fifa_code), away:teams!matches_away_team_id_fkey(name, fifa_code)",
      )
      .match(options.matchId ? { id: options.matchId } : {})
      .returns<MatchQueryRow[]>();

    const matchRows = matchesQuery.data ?? [];
    if (!matchRows.length) {
      return [];
    }

    const matchIds = matchRows.map((row) => row.id);
    const marketsQuery = await supabase
      .from("match_markets")
      .select("id, match_id, market_type, lock_at, winning_outcome_code, status")
      .in("match_id", matchIds)
      .returns<MarketQueryRow[]>();

    const marketRows = marketsQuery.data ?? [];
    const marketIds = marketRows.map((row) => row.id);

    const [outcomesQuery, currentUserData, allTicketData] = await Promise.all([
      marketIds.length
        ? supabase
            .from("market_outcomes")
            .select("match_market_id, code, label, sort_order")
            .in("match_market_id", marketIds)
            .order("sort_order", { ascending: true })
            .returns<OutcomeQueryRow[]>()
        : Promise.resolve({ data: [] as OutcomeQueryRow[] }),
      loadCurrentUserMap(supabase, session.userId, marketIds),
      loadAllTicketData(supabase, marketIds, Boolean(options.includeReveals)),
    ]);

    const marketsByMatchId = new Map(marketRows.map((row) => [row.match_id, row]));
    const outcomesByMarketId = groupBy(outcomesQuery.data ?? [], (item) => item.match_market_id);

    const mapped = matchRows
      .map<LoadedMatch | null>((row) => {
        const stage = firstRow(row.stage);
        const home = firstRow(row.home);
        const away = firstRow(row.away);
        const market = marketsByMatchId.get(row.id);

        if (!stage || !home || !away || !market) {
          return null;
        }

        const outcomeRows = outcomesByMarketId.get(market.id) ?? [];
        const currentTicket = currentUserData.ticketsByMarketId.get(market.id);
        const currentAllocations = currentTicket
          ? currentUserData.allocationsByTicketId.get(currentTicket.id) ?? []
          : [];
        const settlement = currentTicket
          ? currentUserData.settlementsByTicketId.get(currentTicket.id)
          : undefined;
        const marketTickets = allTicketData.ticketsByMarketId.get(market.id) ?? [];
        const totalByOutcomeCode = new Map<string, number>();

        for (const ticket of marketTickets) {
          const allocations = allTicketData.allocationsByTicketId.get(ticket.id) ?? [];
          for (const allocation of allocations) {
            const outcome = firstRow(allocation.outcome);
            if (!outcome) {
              continue;
            }

            totalByOutcomeCode.set(outcome.code, (totalByOutcomeCode.get(outcome.code) ?? 0) + allocation.amount);
          }
        }

        const totalPool = Array.from(totalByOutcomeCode.values()).reduce((sum, value) => sum + value, 0);
        const allocationByCode = new Map(
          currentAllocations.map((item) => [firstRow(item.outcome)?.code, item.amount] as const).filter((item): item is [string, number] => Boolean(item[0])),
        );

        const allocation = outcomeRows.map((outcome) => {
          const amount = allocationByCode.get(outcome.code) ?? 0;
          return {
            code: normalizeOutcomeCode(outcome.code, market.market_type),
            label: getOutcomeDisplayLabel(outcome.code, home.name, away.name, market.market_type),
            shortLabel: getOutcomeShortLabel(outcome.code, home.name, away.name, market.market_type),
            amount,
            percentage: Math.round((amount / MATCH_CREDIT) * 100),
          };
        });

        const consensus = outcomeRows.map((outcome) => {
          const amount = totalByOutcomeCode.get(outcome.code) ?? 0;
          return {
            code: normalizeOutcomeCode(outcome.code, market.market_type),
            label: getOutcomeDisplayLabel(outcome.code, home.name, away.name, market.market_type),
            shortLabel: getOutcomeShortLabel(outcome.code, home.name, away.name, market.market_type),
            percentage: totalPool > 0 ? Math.round((amount / totalPool) * 100) : 0,
          };
        });

        const revealedTickets =
          options.includeReveals && (market.status === "revealed" || market.status === "settled")
            ? marketTickets.map((ticket) => ({
                userName: allTicketData.usersById.get(ticket.user_id) ?? "Jugador",
                allocations: (allTicketData.allocationsByTicketId.get(ticket.id) ?? [])
                  .map((item) => {
                    const outcome = firstRow(item.outcome);
                    if (!outcome) {
                      return null;
                    }

                    return {
                      code: normalizeOutcomeCode(outcome.code, market.market_type),
                      label: getOutcomeDisplayLabel(outcome.code, home.name, away.name, market.market_type),
                      shortLabel: getOutcomeShortLabel(outcome.code, home.name, away.name, market.market_type),
                      amount: item.amount,
                    };
                  })
                  .filter((item): item is NonNullable<typeof item> => item !== null),
                netAmount: allTicketData.settlementsByTicketId.get(ticket.id)?.net_result_amount,
              }))
            : [];

        const loadedMatch: LoadedMatch = {
          match: {
            id: row.id,
            stage: stage.name,
            groupLabel: getWorldCupGroupLabel(home.fifa_code, away.fifa_code, stage.code),
            venue: row.venue_city ?? row.venue_name ?? "Sede",
            kickoffLabel: formatKickoffLabel(row.kickoff_at),
            status: normalizeMatchStatus(row.status),
            marketStatus: normalizeMarketStatus(market.status),
            statusVariant: deriveStatusVariant(row.status, market.status),
            statusLabel: deriveStatusLabel(row.status, market.status),
            marketType: market.market_type === "qualifies" ? "qualifies" : "1x2",
            marketTypeLabel: market.market_type === "qualifies" ? "Clasifica" : "1X2",
            userStateLabel: deriveUserStateLabel(normalizeMatchStatus(row.status), market.status, currentTicket, settlement),
            draftState: settlement
              ? "saved_remote"
              : currentTicket
                ? "saved_remote"
                : "idle",
            isEditable: market.status === "open",
            home: {
              name: home.name,
              flag: getWorldCupTeamMeta(home.fifa_code)?.flag ?? "🏳️",
              score: row.status === "finished" ? row.home_score_ft ?? 0 : row.home_score_90 ?? 0,
            },
            away: {
              name: away.name,
              flag: getWorldCupTeamMeta(away.fifa_code)?.flag ?? "🏳️",
              score: row.status === "finished" ? row.away_score_ft ?? 0 : row.away_score_90 ?? 0,
            },
            allocation,
            consensus,
            form: {
              home: "—",
              away: "—",
              homeGoals: 0,
              awayGoals: 0,
            },
            revealedTickets,
          },
          stageSortOrder: stage.sort_order,
          kickoffAt: row.kickoff_at,
        };

        return loadedMatch;
      })
      .filter((item): item is LoadedMatch => item !== null);

    return mapped
      .sort((left, right) => {
        if (left.stageSortOrder !== right.stageSortOrder) {
          return left.stageSortOrder - right.stageSortOrder;
        }

        return left.kickoffAt.localeCompare(right.kickoffAt);
      });
  }
}

function getSupabaseOrThrow() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }
  return supabase;
}

type LoadMatchOptions = {
  matchId?: string;
  includeReveals?: boolean;
};

async function loadCurrentUserMap(supabase: ReturnType<typeof getSupabaseOrThrow>, userId: string | undefined, marketIds: string[]) {
  if (!userId || marketIds.length === 0) {
    return {
      ticketsByMarketId: new Map<string, TicketQueryRow>(),
      allocationsByTicketId: new Map<string, AllocationQueryRow[]>(),
      settlementsByTicketId: new Map<string, SettlementQueryRow>(),
    };
  }

  const ticketsQuery = await supabase
    .from("tickets")
    .select("id, user_id, match_market_id")
    .eq("user_id", userId)
    .in("match_market_id", marketIds)
    .returns<TicketQueryRow[]>();

  const tickets = ticketsQuery.data ?? [];
  const ticketIds = tickets.map((ticket) => ticket.id);

  const [allocationsQuery, settlementsQuery] = await Promise.all([
    ticketIds.length
      ? supabase
          .from("ticket_allocations")
          .select("ticket_id, amount, outcome:market_outcomes(code, label)")
          .in("ticket_id", ticketIds)
          .returns<AllocationQueryRow[]>()
      : Promise.resolve({ data: [] as AllocationQueryRow[] }),
    ticketIds.length
      ? supabase
          .from("settlements")
          .select("ticket_id, net_result_amount")
          .in("ticket_id", ticketIds)
          .returns<SettlementQueryRow[]>()
      : Promise.resolve({ data: [] as SettlementQueryRow[] }),
  ]);

  return {
    ticketsByMarketId: new Map(tickets.map((ticket) => [ticket.match_market_id, ticket])),
    allocationsByTicketId: groupBy(allocationsQuery.data ?? [], (item) => item.ticket_id),
    settlementsByTicketId: new Map((settlementsQuery.data ?? []).map((item) => [item.ticket_id, item])),
  };
}

async function loadAllTicketData(
  supabase: ReturnType<typeof getSupabaseOrThrow>,
  marketIds: string[],
  includeReveals: boolean,
) {
  if (marketIds.length === 0) {
    return {
      ticketsByMarketId: new Map<string, TicketQueryRow[]>(),
      allocationsByTicketId: new Map<string, AllocationQueryRow[]>(),
      settlementsByTicketId: new Map<string, SettlementQueryRow>(),
      usersById: new Map<string, string>(),
    };
  }

  const ticketsQuery = await supabase
    .from("tickets")
    .select("id, user_id, match_market_id")
    .in("match_market_id", marketIds)
    .returns<TicketQueryRow[]>();

  const tickets = ticketsQuery.data ?? [];
  const ticketIds = tickets.map((ticket) => ticket.id);
  const userIds = includeReveals ? Array.from(new Set(tickets.map((ticket) => ticket.user_id))) : [];

  const [allocationsQuery, settlementsQuery, usersQuery] = await Promise.all([
    ticketIds.length
      ? supabase
          .from("ticket_allocations")
          .select("ticket_id, amount, outcome:market_outcomes(code, label)")
          .in("ticket_id", ticketIds)
          .returns<AllocationQueryRow[]>()
      : Promise.resolve({ data: [] as AllocationQueryRow[] }),
    ticketIds.length
      ? supabase
          .from("settlements")
          .select("ticket_id, net_result_amount")
          .in("ticket_id", ticketIds)
          .returns<SettlementQueryRow[]>()
      : Promise.resolve({ data: [] as SettlementQueryRow[] }),
    includeReveals && userIds.length
      ? supabase.from("users").select("id, display_name").in("id", userIds).returns<UserQueryRow[]>()
      : Promise.resolve({ data: [] as UserQueryRow[] }),
  ]);

  return {
    ticketsByMarketId: groupBy(tickets, (ticket) => ticket.match_market_id),
    allocationsByTicketId: groupBy(allocationsQuery.data ?? [], (item) => item.ticket_id),
    settlementsByTicketId: new Map((settlementsQuery.data ?? []).map((item) => [item.ticket_id, item])),
    usersById: new Map((usersQuery.data ?? []).map((item) => [item.id, item.display_name])),
  };
}

type LoadedMatch = {
  match: MatchViewModel;
  stageSortOrder: number;
  kickoffAt: string;
};

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

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return groups;
}

function normalizeMatchStatus(status: string): MatchViewModel["status"] {
  if (status === "live" || status === "finished") {
    return status;
  }

  return "scheduled";
}

function deriveStatusVariant(matchStatus: string, marketStatus: string): MatchViewModel["statusVariant"] {
  if (matchStatus === "finished" || marketStatus === "settled") {
    return "settled";
  }

  if (matchStatus === "live") {
    return "live";
  }

  if (marketStatus === "revealed") {
    return "revealed";
  }

  if (marketStatus === "locked") {
    return "locked";
  }

  return "upcoming";
}

function deriveStatusLabel(matchStatus: string, marketStatus: string) {
  if (matchStatus === "finished" || marketStatus === "settled") {
    return "Final";
  }

  if (matchStatus === "live") {
    return "En vivo";
  }

  if (marketStatus === "locked" || marketStatus === "revealed") {
    return "Cerrado";
  }

  return "Abierto";
}

function deriveUserStateLabel(
  matchStatus: MatchViewModel["status"],
  marketStatus: string,
  ticket: TicketQueryRow | undefined,
  settlement: SettlementQueryRow | undefined,
) {
  if (settlement) {
    return `Resultado ${formatNetAmount(settlement.net_result_amount)}`;
  }

  if (!ticket) {
    return matchStatus === "scheduled" && marketStatus === "open" ? "Te falta jugar" : "Sin jugar";
  }

  if (matchStatus === "live" || marketStatus === "revealed") {
    return "Reveal activo";
  }

  return "Jugada guardada";
}

function normalizeOutcomeCode(code: string, marketType: string): MatchOutcomeCode {
  if (code === "draw") {
    return "draw";
  }

  if (marketType === "qualifies") {
    return code === "away_qualifies" ? "away_qualifies" : "home_qualifies";
  }

  return code === "away" ? "away" : "home";
}

function getOutcomeDisplayLabel(code: string, homeName: string, awayName: string, marketType: string) {
  if (code === "draw") {
    return "Empate";
  }

  if (marketType === "qualifies") {
    return code === "away_qualifies" ? `Clasifica ${awayName}` : `Clasifica ${homeName}`;
  }

  return code === "away" ? awayName : homeName;
}

function getOutcomeShortLabel(code: string, homeName: string, awayName: string, marketType: string) {
  if (code === "draw") {
    return "Empate";
  }

  if (marketType === "qualifies") {
    return code === "away_qualifies" ? awayName : homeName;
  }

  return code === "away" ? awayName : homeName;
}

function formatKickoffLabel(kickoffAt: string) {
  const date = new Date(kickoffAt);
  const day = new Intl.DateTimeFormat("es-AR", { day: "numeric", timeZone: "UTC" }).format(date);
  const month = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "");
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);

  return `${day} ${month} · ${time}`;
}
