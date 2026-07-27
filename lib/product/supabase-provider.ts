import { cache } from "react";
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
import { deriveDummyMatchState, getDummyMatchDefinition, isDummyMatchId } from "@/lib/dummy-matches";
import { MATCH_CREDIT, creditForMarketType, validateAllocations } from "@/lib/game";
import { formatGross } from "@/lib/format";
import { CHAMPION_CREDIT } from "@/lib/champion";
import { logPickEvent } from "@/lib/pick-events";
import { getServerSessionState } from "@/lib/product/session-state";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getLigaTeamMeta, getLigaZoneLabel } from "@/lib/liga-2026";

type MarketRow = {
  id: string;
  status: string;
  lock_at: string | null;
  market_type: string;
  match:
    | {
        home: { name: string } | { name: string }[] | null;
        away: { name: string } | { name: string }[] | null;
      }
    | {
        home: { name: string } | { name: string }[] | null;
        away: { name: string } | { name: string }[] | null;
      }[]
    | null;
};
type OutcomeRow = { id: string; code: string; label: string };
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
  id: string;
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
  market_outcome_id: string;
};
type SettlementQueryRow = {
  ticket_id: string;
  net_result_amount: number;
  gross_return_amount: number;
};
type UserQueryRow = {
  id: string;
  display_name: string;
};

export class SupabaseProductProvider implements ProductProvider {
  mode = "supabase" as const;

  async getSessionState(): Promise<SessionState> {
    return getCachedSupabaseSessionState();
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
    let yourGrossAmount = 0;

    if (session.userId) {
      const [leaderboardQuery, grossAggregates] = await Promise.all([
        supabase
          .from("leaderboard_snapshots")
          .select("total_net_amount")
          .eq("user_id", session.userId)
          .order("as_of", { ascending: false })
          .limit(1)
          .maybeSingle<{ total_net_amount: number }>(),
        loadGrossAggregates(supabase, [session.userId]),
      ]);

      if (!leaderboardQuery.error && leaderboardQuery.data) {
        yourNetAmount = leaderboardQuery.data.total_net_amount;
      }
      yourGrossAmount = grossAggregates.get(session.userId)?.totalGross ?? 0;
    }

    return {
      liveMatches: liveMatchesQuery.count ?? 0,
      pendingPicks: matches.filter((match) => match.userStateLabel === "Te falta jugar").length,
      settledToday: settledTodayQuery.count ?? 0,
      yourNetAmount,
      yourGrossAmount,
    };
  }

  async getMatchesForHome(): Promise<MatchViewModel[]> {
    const groups = await this.listMatchesByStage();
    return groups.flatMap((group) => group.matches).sort(sortMatchesForHome);
  }

  async listMatches(): Promise<MatchViewModel[]> {
    const matches = await this.loadMatchViewModels();
    return matches
      .slice()
      .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
      .map((item) => item.match);
  }

  async listMatchesByStage(): Promise<MatchStageGroup[]> {
    const matches = await this.loadMatchViewModels();
    const groups = new Map<string, MatchStageGroup & { sortOrder: number; isKnockout: boolean; kickoffAt: string; kickoffByMatchId: Map<string, string> }>();

    for (const item of matches) {
      const isKnockout = !item.match.groupLabel;
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
          isKnockout,
          kickoffAt: item.kickoffAt,
          kickoffByMatchId: new Map(),
        });
      }

      const group = groups.get(key)!;
      group.matches.push(item.match);
      group.kickoffByMatchId.set(item.match.id, item.kickoffAt);
    }

    const sectionRank = (group: { isKnockout: boolean; sortOrder: number }) =>
      group.isKnockout ? -group.sortOrder : 1000 + group.sortOrder;

    return Array.from(groups.values())
      .sort((left, right) => {
        if (sectionRank(left) !== sectionRank(right)) {
          return sectionRank(left) - sectionRank(right);
        }

        if (left.label !== right.label) {
          return left.label.localeCompare(right.label, "es");
        }

        return left.kickoffAt.localeCompare(right.kickoffAt);
      })
      .map(({ sortOrder: _sortOrder, isKnockout: _isKnockout, kickoffAt: _kickoffAt, kickoffByMatchId, ...group }) => ({
        ...group,
        matches: group.matches.slice().sort((a, b) => {
          const ka = kickoffByMatchId.get(a.id) ?? "";
          const kb = kickoffByMatchId.get(b.id) ?? "";
          return ka.localeCompare(kb);
        }),
      }));
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
      .select("rank_position, previous_rank_position, as_of, user_id, total_net_amount, positive_tickets_count, best_single_net_amount, user:users(display_name)")
      .order("rank_position", { ascending: true })
      .returns<
        {
          rank_position: number;
          previous_rank_position: number | null;
          as_of: string;
          user_id: string;
          total_net_amount: number;
          positive_tickets_count: number;
          best_single_net_amount: number | null;
          user: { display_name: string } | null;
        }[]
      >();

    if (!query.error && query.data?.length) {
      const latestByUser = new Map<string, (typeof query.data)[number]>();
      for (const row of query.data) {
        const existing = latestByUser.get(row.user_id);
        if (!existing || row.as_of > existing.as_of) {
          latestByUser.set(row.user_id, row);
        }
      }
      const uniqueRows = [...latestByUser.values()];

      const grossByUser = await loadGrossAggregates(supabase, uniqueRows.map((item) => item.user_id));
      const merged = uniqueRows.map((item) => {
        const gross = grossByUser.get(item.user_id);
        return {
          name: item.user?.display_name ?? "Jugador",
          netAmount: item.total_net_amount,
          grossAmount: gross?.totalGross ?? 0,
          positiveTickets: gross?.hitsCount ?? 0,
          bestHitAmount: item.best_single_net_amount ?? 0,
          bestHitGrossAmount: gross?.bestHitGross ?? 0,
          previousRankPosition: item.previous_rank_position,
          isCurrentUser: session.displayName === item.user?.display_name,
        };
      });
      merged.sort((a, b) => {
        if (b.grossAmount !== a.grossAmount) return b.grossAmount - a.grossAmount;
        if (b.positiveTickets !== a.positiveTickets) return b.positiveTickets - a.positiveTickets;
        if (b.bestHitGrossAmount !== a.bestHitGrossAmount) return b.bestHitGrossAmount - a.bestHitGrossAmount;
        return a.name.localeCompare(b.name);
      });
      return merged.map(({ previousRankPosition, ...row }, idx) => ({
        position: idx + 1,
        movement: previousRankPosition == null ? null : previousRankPosition - (idx + 1),
        ...row,
      }));
    }

    const usersQuery = await supabase
      .from("users")
      .select("display_name")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .returns<{ display_name: string }[]>();

    if (usersQuery.error || !usersQuery.data?.length) {
      return [];
    }

    return usersQuery.data.map((row, idx) => ({
      position: idx + 1,
      name: row.display_name,
      netAmount: 0,
      grossAmount: 0,
      positiveTickets: 0,
      bestHitAmount: 0,
      bestHitGrossAmount: 0,
      isCurrentUser: session.displayName === row.display_name,
    }));
  }

  async getProfile(): Promise<ProfileViewModel> {
    const supabase = getSupabaseOrThrow();
    const session = await this.getSessionState();

    if (!session.userId) {
      return {
        name: "Sin entrar",
        netAmount: 0,
        grossAmount: 0,
        positiveTickets: 0,
        bestHitAmount: 0,
        bestHitGrossAmount: 0,
        championPick: "Sin elegir",
      };
    }

    const [userQuery, leaderboardQuery, championQuery, grossAggregates] = await Promise.all([
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
      loadGrossAggregates(supabase, [session.userId]),
    ]);

    const gross = grossAggregates.get(session.userId);
    return {
      name: userQuery.data?.display_name ?? session.displayName ?? "Jugador",
      netAmount: leaderboardQuery.data?.total_net_amount ?? 0,
      grossAmount: gross?.totalGross ?? 0,
      positiveTickets: gross?.hitsCount ?? 0,
      bestHitAmount: leaderboardQuery.data?.best_single_net_amount ?? 0,
      bestHitGrossAmount: gross?.bestHitGross ?? 0,
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
        "ticket_id, net_result_amount, gross_return_amount, ticket:tickets(match_market_id), market:match_markets!inner(match_id), match:matches!inner(id, stage:tournament_stages(name), home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)), allocations:ticket_allocations(amount, outcome:market_outcomes(label))",
      )
      .eq("ticket.user_id", session.userId)
      .order("settled_at", { ascending: false })
      .limit(10);

    if (query.error || !query.data?.length) {
      return [];
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
          row.net_result_amount > 0
            ? "Jugada liquidada en positivo."
            : row.net_result_amount === 0
              ? "Recuperaste tu apuesta."
              : "Cobraste menos de lo apostado.",
        netAmount: row.net_result_amount,
        grossAmount: row.gross_return_amount ?? row.net_result_amount + MATCH_CREDIT,
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

  async getRankingTimeline(): Promise<import("@/lib/domain").RankingTimeline> {
    const supabase = getSupabaseOrThrow();
    const session = await this.getSessionState();

    const settlementsQuery = await supabase
      .from("settlements")
      .select(
        "net_result_amount, gross_return_amount, settled_at, ticket:tickets!inner(user_id, user:users!inner(display_name), market:match_markets!inner(match:matches!inner(id, kickoff_at, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name))))",
      )
      .order("settled_at", { ascending: true })
      .returns<
        {
          net_result_amount: number;
          gross_return_amount: number;
          settled_at: string;
          ticket: {
            user_id: string;
            user: { display_name: string } | { display_name: string }[] | null;
            market: {
              match:
                | { id: string; kickoff_at: string; home: { name: string } | { name: string }[] | null; away: { name: string } | { name: string }[] | null }
                | { id: string; kickoff_at: string; home: { name: string } | { name: string }[] | null; away: { name: string } | { name: string }[] | null }[]
                | null;
            } | null;
          } | null;
        }[]
      >();

    const rows = settlementsQuery.data ?? [];

    const matchMeta = new Map<string, { kickoffAt: string; label: string }>();
    const userGrossByMatch = new Map<string, Map<string, number>>();
    const userNames = new Map<string, string>();

    for (const row of rows) {
      const ticket = row.ticket;
      if (!ticket) continue;
      const userObj = Array.isArray(ticket.user) ? ticket.user[0] : ticket.user;
      const userName = userObj?.display_name;
      if (!userName) continue;
      userNames.set(ticket.user_id, userName);

      const matchObj = Array.isArray(ticket.market?.match) ? ticket.market?.match[0] : ticket.market?.match;
      if (!matchObj?.id) continue;
      const home = Array.isArray(matchObj.home) ? matchObj.home[0] : matchObj.home;
      const away = Array.isArray(matchObj.away) ? matchObj.away[0] : matchObj.away;
      const label = `${home?.name?.slice(0, 3) ?? "—"} vs ${away?.name?.slice(0, 3) ?? "—"}`;
      matchMeta.set(matchObj.id, { kickoffAt: matchObj.kickoff_at, label });

      const grossThis = row.gross_return_amount ?? row.net_result_amount + MATCH_CREDIT;
      let userBucket = userGrossByMatch.get(ticket.user_id);
      if (!userBucket) {
        userBucket = new Map();
        userGrossByMatch.set(ticket.user_id, userBucket);
      }
      userBucket.set(matchObj.id, (userBucket.get(matchObj.id) ?? 0) + grossThis);
    }

    const orderedMatches = Array.from(matchMeta.entries())
      .sort(([, a], [, b]) => a.kickoffAt.localeCompare(b.kickoffAt))
      .map(([id, meta]) => ({ id, label: meta.label }));

    const matchLabels = orderedMatches.map((m) => m.label);

    const entries: import("@/lib/domain").RankingTimelineEntry[] = Array.from(userNames.entries()).map(([userId, userName]) => {
      const userBucket = userGrossByMatch.get(userId) ?? new Map();
      let cumulative = 0;
      const points = orderedMatches.map((m) => {
        cumulative += userBucket.get(m.id) ?? 0;
        return cumulative;
      });
      return {
        userName,
        isCurrentUser: session.userId === userId,
        points,
      };
    });

    entries.sort((a, b) => (b.points[b.points.length - 1] ?? 0) - (a.points[a.points.length - 1] ?? 0));

    return { matchLabels, entries };
  }

  async submitTicket(payload: SaveTicketPayload): Promise<SaveTicketResult> {
    const supabase = getSupabaseOrThrow();
    const session = await this.getSessionState();

    if (!session.userId) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se encontró una sesión remota válida.",
      };
    }

    const marketQuery = await supabase
      .from("match_markets")
      .select("id, status, lock_at, market_type, match:matches(home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name))")
      .eq("match_id", payload.matchId)
      .maybeSingle<MarketRow>();

    if (marketQuery.error || !marketQuery.data) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se encontró el mercado del partido.",
      };
    }

    const market = marketQuery.data;
    const marketId = market.id;
    const credit = creditForMarketType(market.market_type);
    if (market.status !== "open") {
      return {
        ok: false,
        state: "sync_error",
        reason: "Este mercado ya cerró y no admite cambios.",
      };
    }

    const validation = validateAllocations(
      payload.allocations.map((allocation) => ({
        outcomeCode: allocation.label,
        amount: allocation.amount,
      })),
      credit,
    );

    if (!validation.ok) {
      return {
        ok: false,
        state: "sync_error",
        reason: validation.reason ?? "Jugada inválida.",
      };
    }

    const matchRow = firstRow(market.match);
    const home = firstRow(matchRow?.home);
    const away = firstRow(matchRow?.away);

    const outcomesQuery = await supabase
      .from("market_outcomes")
      .select("id, code, label")
      .eq("match_market_id", marketId)
      .returns<OutcomeRow[]>();

    if (outcomesQuery.error || !outcomesQuery.data) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se pudieron cargar los outcomes del partido.",
      };
    }

    const matchedOutcomes = payload.allocations
      .map((allocation) => {
        const outcome = outcomesQuery.data.find(
          (candidate) =>
            (allocation.code && candidate.code === allocation.code) ||
            normalizeLabel(candidate.label) === normalizeLabel(allocation.label) ||
            (home?.name &&
              away?.name &&
              normalizeLabel(getOutcomeDisplayLabel(candidate.code, home.name, away.name, market.market_type)) ===
                normalizeLabel(allocation.label)),
        );

        if (!outcome) {
          return null;
        }

        return {
          marketOutcomeId: outcome.id,
          amount: allocation.amount,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (matchedOutcomes.length !== payload.allocations.length) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No coinciden las opciones de la jugada con las del mercado.",
      };
    }

    if (matchedOutcomes.length === 0) {
      return {
        ok: false,
        state: "sync_error",
        reason: "La jugada está vacía.",
      };
    }

    const totalAllocated = matchedOutcomes.reduce((sum, row) => sum + (row.amount ?? 0), 0);
    if (totalAllocated <= 0) {
      return {
        ok: false,
        state: "sync_error",
        reason: "La jugada no tiene créditos asignados.",
      };
    }

    const ticketUpsert = await supabase
      .from("tickets")
      .upsert(
        {
          user_id: session.userId,
          match_market_id: marketId,
          credit_total: credit,
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

    const ticketId = ticketUpsert.data?.id;
    if (!ticketId) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se pudo resolver el ticket guardado.",
      };
    }

    const allocationRows = matchedOutcomes.map((row) => ({
      ticket_id: ticketId,
      market_outcome_id: row.marketOutcomeId,
      amount: row.amount,
    }));

    const upsertAllocations = await supabase
      .from("ticket_allocations")
      .upsert(allocationRows, { onConflict: "ticket_id,market_outcome_id" });
    if (upsertAllocations.error) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se pudieron guardar los montos de la jugada.",
      };
    }

    const keptOutcomeIds = allocationRows.map((row) => row.market_outcome_id);
    const pruneStale = await supabase
      .from("ticket_allocations")
      .delete()
      .eq("ticket_id", ticketId)
      .not("market_outcome_id", "in", `(${keptOutcomeIds.join(",")})`);
    if (pruneStale.error) {
      return {
        ok: false,
        state: "sync_error",
        reason: "No se pudo actualizar la jugada existente.",
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
    return loadCachedMatchViewModels(options.matchId ?? null, Boolean(options.includeReveals));
  }
}

const getCachedSupabaseSessionState = cache(async () => getServerSessionState("supabase"));

const loadCachedMatchViewModels = cache(async (matchId: string | null, includeReveals: boolean): Promise<LoadedMatch[]> => {
    const supabase = getSupabaseOrThrow();
    const session = await getCachedSupabaseSessionState();
    const matchesQuery = await supabase
      .from("matches")
      .select(
        "id, kickoff_at, status, venue_name, venue_city, home_score_90, away_score_90, home_score_ft, away_score_ft, stage:tournament_stages(code, name, sort_order), home:teams!matches_home_team_id_fkey(name, fifa_code), away:teams!matches_away_team_id_fkey(name, fifa_code)",
      )
      .match(matchId ? { id: matchId } : {})
      .returns<MatchQueryRow[]>();

    const matchRows = (matchesQuery.data ?? []).map((row) => {
      if (!isDummyMatchId(row.id)) {
        return row;
      }
      const derived = deriveDummyMatchState(row.id);
      if (!derived) {
        return row;
      }
      return {
        ...row,
        status: derived.status,
        home_score_90: derived.homeScore90,
        away_score_90: derived.awayScore90,
        home_score_ft: derived.homeScoreFt,
        away_score_ft: derived.awayScoreFt,
      };
    });
    if (!matchRows.length) {
      return [];
    }

    const matchIds = matchRows.map((row) => row.id);
    const marketsQuery = await supabase
      .from("match_markets")
      .select("id, match_id, market_type, lock_at, winning_outcome_code, status")
      .in("match_id", matchIds)
      .returns<MarketQueryRow[]>();

    const dummyStatusByMatchId = new Map(
      matchRows
        .filter((row) => isDummyMatchId(row.id))
        .map((row) => [row.id, row.status] as const),
    );
    const marketRows = (marketsQuery.data ?? []).map((row) => {
      const dummyStatus = dummyStatusByMatchId.get(row.match_id);
      if (!dummyStatus || row.status !== "open") {
        return row;
      }
      if (dummyStatus === "finished") {
        return { ...row, status: "settled" };
      }
      if (dummyStatus === "live") {
        return { ...row, status: "locked" };
      }
      return row;
    });
    const marketIds = marketRows.map((row) => row.id);

    const [outcomesQuery, currentUserData, allTicketData] = await Promise.all([
      marketIds.length
        ? supabase
            .from("market_outcomes")
            .select("id, match_market_id, code, label, sort_order")
            .in("match_market_id", marketIds)
            .order("sort_order", { ascending: true })
            .returns<OutcomeQueryRow[]>()
        : Promise.resolve({ data: [] as OutcomeQueryRow[] }),
      loadCurrentUserMap(supabase, session.userId, marketIds),
      loadAllTicketData(supabase, marketIds, includeReveals),
    ]);

    const marketsByMatchId = new Map<string, (typeof marketRows)[number]>();
    for (const row of marketRows) {
      const incumbent = marketsByMatchId.get(row.match_id);
      if (!incumbent) {
        marketsByMatchId.set(row.match_id, row);
        continue;
      }
      const score = (marketId: string) =>
        (currentUserData.ticketsByMarketId.has(marketId) ? 1_000_000 : 0) +
        (allTicketData.ticketsByMarketId.get(marketId)?.length ?? 0);
      const incumbentScore = score(incumbent.id);
      const candidateScore = score(row.id);
      if (candidateScore > incumbentScore || (candidateScore === incumbentScore && row.id < incumbent.id)) {
        marketsByMatchId.set(row.match_id, row);
      }
    }
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
        const outcomeById = new Map(outcomeRows.map((outcome) => [outcome.id, outcome] as const));
        const currentTicket = currentUserData.ticketsByMarketId.get(market.id);
        const currentAllocations = currentTicket
          ? currentUserData.allocationsByTicketId.get(currentTicket.id) ?? []
          : [];
        const marketTickets = allTicketData.ticketsByMarketId.get(market.id) ?? [];
        const totalByOutcomeCode = new Map<string, number>();

        for (const ticket of marketTickets) {
          const allocations = allTicketData.allocationsByTicketId.get(ticket.id) ?? [];
          for (const allocation of allocations) {
            const outcome = outcomeById.get(allocation.market_outcome_id);
            if (!outcome) {
              continue;
            }

            totalByOutcomeCode.set(outcome.code, (totalByOutcomeCode.get(outcome.code) ?? 0) + allocation.amount);
          }
        }

        const pickCountByCode: Partial<Record<MatchOutcomeCode, number>> = {};
        const poolByCode: Partial<Record<MatchOutcomeCode, number>> = {};
        for (const ticket of marketTickets) {
          const allocations = allTicketData.allocationsByTicketId.get(ticket.id) ?? [];
          let dominantAllocation: (typeof allocations)[number] | null = null;
          for (const allocation of allocations) {
            if (!dominantAllocation || allocation.amount > dominantAllocation.amount) {
              dominantAllocation = allocation;
            }
            const outcome = outcomeById.get(allocation.market_outcome_id);
            if (outcome && allocation.amount > 0) {
              const code = normalizeOutcomeCode(outcome.code, market.market_type);
              poolByCode[code] = (poolByCode[code] ?? 0) + allocation.amount;
            }
          }
          if (!dominantAllocation) continue;
          const dominantOutcome = outcomeById.get(dominantAllocation.market_outcome_id);
          if (!dominantOutcome) continue;
          const normalizedCode = normalizeOutcomeCode(dominantOutcome.code, market.market_type);
          pickCountByCode[normalizedCode] = (pickCountByCode[normalizedCode] ?? 0) + 1;
        }

        const totalPool = Array.from(totalByOutcomeCode.values()).reduce((sum, value) => sum + value, 0);
        const allocationByCode = new Map(
          currentAllocations
            .map((item) => {
              const outcome = outcomeById.get(item.market_outcome_id);
              return outcome ? ([outcome.code, item.amount] as const) : null;
            })
            .filter((item): item is readonly [string, number] => Boolean(item)),
        );

        const allocation = outcomeRows.map((outcome) => {
          const amount = allocationByCode.get(outcome.code) ?? 0;
          return {
            code: normalizeOutcomeCode(outcome.code, market.market_type),
            label: getOutcomeDisplayLabel(outcome.code, home.name, away.name, market.market_type),
            shortLabel: getOutcomeShortLabel(outcome.code, home.name, away.name, market.market_type),
            amount,
            percentage: Math.round((amount / creditForMarketType(market.market_type)) * 100),
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

        const computedNetByTicketId = computeDummyNetByTicketId({
          matchId: row.id,
          marketStatus: market.status,
          homeCode: home.fifa_code,
          awayCode: away.fifa_code,
          marketTickets,
          allocationsByTicketId: allTicketData.allocationsByTicketId,
          outcomeById,
          settlementsByTicketId: allTicketData.settlementsByTicketId,
        });

        const settlement = currentTicket
          ? currentUserData.settlementsByTicketId.get(currentTicket.id) ??
            (computedNetByTicketId.has(currentTicket.id)
              ? {
                  ticket_id: currentTicket.id,
                  net_result_amount: computedNetByTicketId.get(currentTicket.id)!,
                  gross_return_amount: computedNetByTicketId.get(currentTicket.id)! + creditForMarketType(market.market_type),
                }
              : undefined)
          : undefined;

        const revealedTickets =
          includeReveals && (market.status === "revealed" || market.status === "settled")
            ? marketTickets.map((ticket) => ({
                userName: allTicketData.usersById.get(ticket.user_id) ?? "Jugador",
                allocations: (allTicketData.allocationsByTicketId.get(ticket.id) ?? [])
                  .map((item) => {
                    const outcome = outcomeById.get(item.market_outcome_id);
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
                netAmount:
                  allTicketData.settlementsByTicketId.get(ticket.id)?.net_result_amount ??
                  computedNetByTicketId.get(ticket.id),
                grossAmount: (() => {
                  const settlement = allTicketData.settlementsByTicketId.get(ticket.id);
                  if (settlement) return settlement.gross_return_amount;
                  const net = computedNetByTicketId.get(ticket.id);
                  return typeof net === "number" ? net + creditForMarketType(market.market_type) : undefined;
                })(),
              }))
            : [];

        const loadedMatch: LoadedMatch = {
          match: {
            id: row.id,
            stage: stage.name,
            stageSortOrder: stage.sort_order,
            groupLabel: getLigaZoneLabel(home.fifa_code, away.fifa_code, stage.code),
            venue: row.venue_city ?? row.venue_name ?? "Sede",
            kickoffAt: row.kickoff_at,
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
              flag: getLigaTeamMeta(home.fifa_code)?.flag ?? "",
              score: row.status === "finished" ? row.home_score_ft ?? 0 : row.home_score_90 ?? 0,
            },
            away: {
              name: away.name,
              flag: getLigaTeamMeta(away.fifa_code)?.flag ?? "",
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
            pickCountByCode,
            poolByCode,
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
  });

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

type GrossAggregate = { totalGross: number; bestHitGross: number; hitsCount: number };

type SettlementRow = {
  net_result_amount: number;
  gross_return_amount: number;
  winning_outcome_code: string;
  ticket:
    | {
        user_id: string;
        allocations:
          | { amount: number; outcome: { code: string } | { code: string }[] | null }[]
          | null;
      }
    | {
        user_id: string;
        allocations:
          | { amount: number; outcome: { code: string } | { code: string }[] | null }[]
          | null;
      }[]
    | null;
};

async function loadGrossAggregates(
  supabase: ReturnType<typeof getSupabaseOrThrow>,
  userIds: string[],
): Promise<Map<string, GrossAggregate>> {
  const result = new Map<string, GrossAggregate>();
  if (userIds.length === 0) return result;

  const [settlementsQuery, championQuery] = await Promise.all([
    supabase
      .from("settlements")
      .select("net_result_amount, gross_return_amount, winning_outcome_code, ticket:tickets!inner(user_id, allocations:ticket_allocations(amount, outcome:market_outcomes(code)))")
      .in("ticket.user_id", userIds)
      .returns<SettlementRow[]>(),
    supabase
      .from("champion_picks")
      .select("user_id, gross_return_amount, net_result_amount, team_id, market:champion_market(winner_team_id)")
      .in("user_id", userIds)
      .not("settled_at", "is", null)
      .returns<{
        user_id: string;
        gross_return_amount: number | null;
        net_result_amount: number | null;
        team_id: string;
        market: { winner_team_id: string | null } | { winner_team_id: string | null }[] | null;
      }[]>(),
  ]);

  const bumpTotals = (userId: string, gross: number) => {
    const cur = result.get(userId) ?? { totalGross: 0, bestHitGross: 0, hitsCount: 0 };
    cur.totalGross += gross;
    cur.bestHitGross = Math.max(cur.bestHitGross, gross);
    result.set(userId, cur);
  };

  const bumpHit = (userId: string) => {
    const cur = result.get(userId) ?? { totalGross: 0, bestHitGross: 0, hitsCount: 0 };
    cur.hitsCount += 1;
    result.set(userId, cur);
  };

  for (const row of settlementsQuery.data ?? []) {
    const ticket = Array.isArray(row.ticket) ? row.ticket[0] : row.ticket;
    const userId = ticket?.user_id;
    if (!userId) continue;

    bumpTotals(userId, row.gross_return_amount ?? row.net_result_amount + MATCH_CREDIT);

    const dominant = (ticket.allocations ?? [])
      .filter((a) => a.amount > 0)
      .sort((a, b) => b.amount - a.amount)[0];
    if (!dominant) continue;
    const outcome = Array.isArray(dominant.outcome) ? dominant.outcome[0] : dominant.outcome;
    if (outcome?.code && outcome.code === row.winning_outcome_code) {
      bumpHit(userId);
    }
  }

  for (const champ of championQuery.data ?? []) {
    const gross = champ.gross_return_amount ?? (champ.net_result_amount != null ? champ.net_result_amount + CHAMPION_CREDIT : 0);
    bumpTotals(champ.user_id, gross);
    const market = Array.isArray(champ.market) ? champ.market[0] : champ.market;
    if (market?.winner_team_id && market.winner_team_id === champ.team_id) {
      bumpHit(champ.user_id);
    }
  }

  return result;
}

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
          .select("ticket_id, amount, market_outcome_id")
          .in("ticket_id", ticketIds)
          .returns<AllocationQueryRow[]>()
      : Promise.resolve({ data: [] as AllocationQueryRow[] }),
    ticketIds.length
      ? supabase
          .from("settlements")
          .select("ticket_id, net_result_amount, gross_return_amount")
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
          .select("ticket_id, amount, market_outcome_id")
          .in("ticket_id", ticketIds)
          .returns<AllocationQueryRow[]>()
      : Promise.resolve({ data: [] as AllocationQueryRow[] }),
    ticketIds.length
      ? supabase
          .from("settlements")
          .select("ticket_id, net_result_amount, gross_return_amount")
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

function stagePriorityRank(match: MatchViewModel) {
  const isKnockout = !match.groupLabel;
  return isKnockout ? -match.stageSortOrder : 1000 + match.stageSortOrder;
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

  return score(left) - score(right) || stagePriorityRank(left) - stagePriorityRank(right);
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
    return `Resultado ${formatGross(settlement.gross_return_amount)}`;
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

const AR_TZ = "America/Argentina/Buenos_Aires";

function formatKickoffLabel(kickoffAt: string) {
  const date = new Date(kickoffAt);
  const day = new Intl.DateTimeFormat("es-AR", { day: "numeric", timeZone: AR_TZ }).format(date);
  const month = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: AR_TZ })
    .format(date)
    .replace(".", "");
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: AR_TZ,
  }).format(date);

  return `${day} ${month} · ${time}`;
}

function computeDummyNetByTicketId(params: {
  matchId: string;
  marketStatus: string;
  homeCode: string;
  awayCode: string;
  marketTickets: TicketQueryRow[];
  allocationsByTicketId: Map<string, AllocationQueryRow[]>;
  outcomeById: Map<string, OutcomeQueryRow>;
  settlementsByTicketId: Map<string, SettlementQueryRow>;
}): Map<string, number> {
  const result = new Map<string, number>();
  if (params.marketStatus !== "settled" || !isDummyMatchId(params.matchId)) {
    return result;
  }
  const definition = getDummyMatchDefinition(params.matchId);
  if (!definition) {
    return result;
  }

  const winningOutcomeCode =
    definition.winnerCode === params.homeCode
      ? "home"
      : definition.winnerCode === params.awayCode
        ? "away"
        : "draw";

  let totalPool = 0;
  const winningStakeByTicket = new Map<string, number>();
  for (const ticket of params.marketTickets) {
    const ticketAllocations = params.allocationsByTicketId.get(ticket.id) ?? [];
    let ticketWinning = 0;
    for (const allocation of ticketAllocations) {
      const outcome = params.outcomeById.get(allocation.market_outcome_id);
      if (!outcome) continue;
      totalPool += allocation.amount;
      if (outcome.code === winningOutcomeCode) {
        ticketWinning += allocation.amount;
      }
    }
    winningStakeByTicket.set(ticket.id, ticketWinning);
  }

  const winningPool = Array.from(winningStakeByTicket.values()).reduce((sum, n) => sum + n, 0);
  if (winningPool <= 0 || totalPool <= 0) {
    return result;
  }

  for (const [ticketId, winningStake] of winningStakeByTicket) {
    if (params.settlementsByTicketId.has(ticketId)) continue;
    const grossReturn = totalPool * (winningStake / winningPool);
    const netResult = grossReturn - MATCH_CREDIT;
    result.set(ticketId, Math.round(netResult));
  }

  return result;
}
