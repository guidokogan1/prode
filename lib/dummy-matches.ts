import type { SupabaseClient } from "@supabase/supabase-js";

const GROUP_STAGE_CODE = "group";
const DUMMY_GROUP_LABEL = "Grupo X";
const DUMMY_CONFIRMATION_TOKEN = "DELETE_DUMMY_MATCHES";
const AR_TZ = "America/Argentina/Buenos_Aires";

type DummyTeamMeta = {
  code: string;
  name: string;
  flag: string;
  groupLetter: "X";
};

export type DummyMatchDefinition = {
  id: string;
  groupLabel: typeof DUMMY_GROUP_LABEL;
  homeCode: string;
  awayCode: string;
  kickoffAt: string;
  finishAt: string;
  venueCity: string;
  winnerCode: string;
  finalScore: {
    home: number;
    away: number;
  };
};

type DummyMatchStatus = "scheduled" | "live" | "finished";

export const DUMMY_MATCH_CONFIRMATION_TOKEN = DUMMY_CONFIRMATION_TOKEN;

const dummyTeams: DummyTeamMeta[] = [
  { code: "BOL", name: "Bolivia", flag: "🇧🇴", groupLetter: "X" },
  { code: "PRK", name: "Corea del Norte", flag: "🇰🇵", groupLetter: "X" },
  { code: "GEO", name: "Georgia", flag: "🇬🇪", groupLetter: "X" },
  { code: "ROU", name: "Rumania", flag: "🇷🇴", groupLetter: "X" },
  { code: "CHL", name: "Chile", flag: "🇨🇱", groupLetter: "X" },
  { code: "JAM", name: "Jamaica", flag: "🇯🇲", groupLetter: "X" },
];

export const DUMMY_MATCHES: DummyMatchDefinition[] = [
  {
    id: "dummy-x-bol-prk",
    groupLabel: DUMMY_GROUP_LABEL,
    homeCode: "BOL",
    awayCode: "PRK",
    kickoffAt: "2026-06-05T13:00:00Z",
    finishAt: "2026-06-05T15:00:00Z",
    venueCity: "Buenos Aires",
    winnerCode: "PRK",
    finalScore: { home: 1, away: 2 },
  },
  {
    id: "dummy-x-geo-rou",
    groupLabel: DUMMY_GROUP_LABEL,
    homeCode: "GEO",
    awayCode: "ROU",
    kickoffAt: "2026-06-05T16:00:00Z",
    finishAt: "2026-06-05T18:00:00Z",
    venueCity: "Buenos Aires",
    winnerCode: "GEO",
    finalScore: { home: 2, away: 1 },
  },
  {
    id: "dummy-x-chl-jam",
    groupLabel: DUMMY_GROUP_LABEL,
    homeCode: "CHL",
    awayCode: "JAM",
    kickoffAt: "2026-06-05T19:00:00Z",
    finishAt: "2026-06-05T21:00:00Z",
    venueCity: "Buenos Aires",
    winnerCode: "JAM",
    finalScore: { home: 1, away: 2 },
  },
];

const dummyTeamByCode = new Map(dummyTeams.map((team) => [team.code, team] as const));
const dummyMatchById = new Map(DUMMY_MATCHES.map((match) => [match.id, match] as const));

type MatchIdentityRow = {
  id: string;
  home_team_id: string;
  away_team_id: string;
};

type TeamRow = {
  id: string;
  fifa_code: string;
};

type MarketRow = {
  id: string;
  match_id: string;
};

type CleanupCountRow = {
  id: string;
};

type DummyLifecycleRow = {
  id: string;
  status: string;
  home_team_id: string;
  away_team_id: string;
  home_score_90: number | null;
  away_score_90: number | null;
  home_score_ft: number | null;
  away_score_ft: number | null;
  winner_team_id: string | null;
  winner_mode: string | null;
};

export function getDummyTeamMeta(code: string) {
  return dummyTeamByCode.get(code);
}

export function getDummyMatchDefinition(matchId: string) {
  return dummyMatchById.get(matchId);
}

export function isDummyTeamCode(code: string) {
  return dummyTeamByCode.has(code);
}

export function isDummyMatchId(matchId: string) {
  return dummyMatchById.has(matchId);
}

export function getDummyGroupLabel(homeCode: string, awayCode: string, stageCode: string) {
  if (stageCode !== GROUP_STAGE_CODE) {
    return undefined;
  }

  const home = getDummyTeamMeta(homeCode);
  const away = getDummyTeamMeta(awayCode);

  if (!home || !away || home.groupLetter !== away.groupLetter) {
    return undefined;
  }

  return DUMMY_GROUP_LABEL;
}

export function getDummyMatchIds() {
  return DUMMY_MATCHES.map((match) => match.id);
}

export function shouldIncludeMatchInChampionPool(matchId: string) {
  return !isDummyMatchId(matchId);
}

export function getDummyHomeSectionTitle() {
  return "Partidos del dia";
}

export function deriveDummyMatchState(matchId: string, now = new Date()) {
  const definition = getDummyMatchDefinition(matchId);

  if (!definition) {
    return null;
  }

  const nowMs = now.getTime();
  const kickoffMs = new Date(definition.kickoffAt).getTime();
  const finishMs = new Date(definition.finishAt).getTime();

  let status: DummyMatchStatus = "scheduled";
  if (nowMs >= finishMs) {
    status = "finished";
  } else if (nowMs >= kickoffMs) {
    status = "live";
  }

  if (status === "finished") {
    return {
      status,
      homeScore90: definition.finalScore.home,
      awayScore90: definition.finalScore.away,
      homeScoreFt: definition.finalScore.home,
      awayScoreFt: definition.finalScore.away,
      winnerCode: definition.winnerCode,
      winnerMode: "regular_time" as const,
    };
  }

  if (status === "live") {
    return {
      status,
      homeScore90: 0,
      awayScore90: 0,
      homeScoreFt: null,
      awayScoreFt: null,
      winnerCode: null,
      winnerMode: null,
    };
  }

  return {
    status,
    homeScore90: null,
    awayScore90: null,
    homeScoreFt: null,
    awayScoreFt: null,
    winnerCode: null,
    winnerMode: null,
  };
}

export async function ensureDummyMatchesSeeded(supabase: SupabaseClient) {
  const stageQuery = await supabase
    .from("tournament_stages")
    .select("id")
    .eq("code", GROUP_STAGE_CODE)
    .maybeSingle<{ id: string }>();

  if (stageQuery.error || !stageQuery.data) {
    return {
      ok: false as const,
      reason: "No se encontro la fase de grupos para cargar los dummy.",
    };
  }
  const stageId = stageQuery.data.id;

  const teamUpsert = await supabase.from("teams").upsert(
    dummyTeams.map((team) => ({
      fifa_code: team.code,
      name: team.name,
      flag_url: null,
    })),
    { onConflict: "fifa_code" },
  );

  if (teamUpsert.error) {
    return {
      ok: false as const,
      reason: "No se pudieron crear los equipos dummy.",
    };
  }

  const teamsQuery = await supabase
    .from("teams")
    .select("id, fifa_code")
    .in("fifa_code", dummyTeams.map((team) => team.code))
    .returns<TeamRow[]>();

  if (teamsQuery.error || !teamsQuery.data?.length) {
    return {
      ok: false as const,
      reason: "No se pudieron leer los equipos dummy.",
    };
  }

  const teamIdByCode = new Map(teamsQuery.data.map((team) => [team.fifa_code, team.id] as const));

  const existingMatchesQuery = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id")
    .in("id", getDummyMatchIds())
    .returns<MatchIdentityRow[]>();

  if (existingMatchesQuery.error) {
    return {
      ok: false as const,
      reason: "No se pudieron validar los partidos dummy existentes.",
    };
  }

  const existingMatchesById = new Map((existingMatchesQuery.data ?? []).map((match) => [match.id, match] as const));

  for (const match of DUMMY_MATCHES) {
    const existing = existingMatchesById.get(match.id);
    if (!existing) {
      continue;
    }

    const expectedHomeId = teamIdByCode.get(match.homeCode);
    const expectedAwayId = teamIdByCode.get(match.awayCode);

    if (!expectedHomeId || !expectedAwayId) {
      return {
        ok: false as const,
        reason: `No se pudieron resolver los equipos dummy para ${match.id}.`,
      };
    }

    if (existing.home_team_id !== expectedHomeId || existing.away_team_id !== expectedAwayId) {
      return {
        ok: false as const,
        reason: `El partido ${match.id} ya existe con equipos distintos. No se toca automaticamente.`,
      };
    }
  }

  const missingMatches = DUMMY_MATCHES.filter((match) => !existingMatchesById.has(match.id)).map((match) => ({
    id: match.id,
    external_id: match.id,
    stage_id: stageId,
    home_team_id: teamIdByCode.get(match.homeCode),
    away_team_id: teamIdByCode.get(match.awayCode),
    kickoff_at: match.kickoffAt,
    status: "scheduled",
    venue_name: match.venueCity,
    venue_city: match.venueCity,
    home_score_90: null,
    away_score_90: null,
    home_score_ft: null,
    away_score_ft: null,
    winner_team_id: null,
    winner_mode: null,
  }));

  if (missingMatches.some((match) => !match.home_team_id || !match.away_team_id)) {
    return {
      ok: false as const,
      reason: "Faltan IDs de equipos al preparar los partidos dummy.",
    };
  }

  if (missingMatches.length) {
    const insertMatches = await supabase.from("matches").insert(missingMatches as never[]);
    if (insertMatches.error) {
      return {
        ok: false as const,
        reason: "No se pudieron insertar los partidos dummy.",
      };
    }
  }

  const marketsQuery = await supabase
    .from("match_markets")
    .select("id, match_id")
    .in("match_id", getDummyMatchIds())
    .returns<MarketRow[]>();

  if (marketsQuery.error) {
    return {
      ok: false as const,
      reason: "No se pudieron leer los mercados dummy.",
    };
  }

  const marketByMatchId = new Map((marketsQuery.data ?? []).map((market) => [market.match_id, market] as const));
  const missingMarkets = DUMMY_MATCHES.filter((match) => !marketByMatchId.has(match.id)).map((match) => ({
    match_id: match.id,
    market_type: "1x2",
    lock_at: match.kickoffAt,
    status: "open",
  }));

  if (missingMarkets.length) {
    const insertMarkets = await supabase.from("match_markets").insert(missingMarkets);
    if (insertMarkets.error) {
      return {
        ok: false as const,
        reason: "No se pudieron crear los mercados dummy.",
      };
    }
  }

  const refreshedMarketsQuery = await supabase
    .from("match_markets")
    .select("id, match_id")
    .in("match_id", getDummyMatchIds())
    .returns<MarketRow[]>();

  if (refreshedMarketsQuery.error || !refreshedMarketsQuery.data?.length) {
    return {
      ok: false as const,
      reason: "No se pudieron refrescar los mercados dummy.",
    };
  }

  const outcomesUpsert = await supabase.from("market_outcomes").upsert(
    refreshedMarketsQuery.data.flatMap((market) => [
      { match_market_id: market.id, code: "home", label: "Gana local", sort_order: 10 },
      { match_market_id: market.id, code: "draw", label: "Empate", sort_order: 20 },
      { match_market_id: market.id, code: "away", label: "Gana visitante", sort_order: 30 },
    ]),
    { onConflict: "match_market_id,code" },
  );

  if (outcomesUpsert.error) {
    return {
      ok: false as const,
      reason: "No se pudieron asegurar los outcomes dummy.",
    };
  }

  return {
    ok: true as const,
    seededMatches: missingMatches.length,
    seededMarkets: missingMarkets.length,
    totalMatches: DUMMY_MATCHES.length,
  };
}

export async function syncDummyMatchesLifecycle(supabase: SupabaseClient, now = new Date()) {
  const matchesQuery = await supabase
    .from("matches")
    .select("id, status, home_team_id, away_team_id, home_score_90, away_score_90, home_score_ft, away_score_ft, winner_team_id, winner_mode")
    .in("id", getDummyMatchIds())
    .returns<DummyLifecycleRow[]>();

  if (matchesQuery.error) {
    return {
      ok: false as const,
      reason: "No se pudieron leer los partidos dummy para sincronizar.",
    };
  }

  if (!matchesQuery.data?.length) {
    return {
      ok: true as const,
      processed: 0,
      updated: 0,
      skipped: getDummyMatchIds().length,
    };
  }

  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];

  for (const row of matchesQuery.data) {
    const nextState = deriveDummyMatchState(row.id, now);
    const definition = getDummyMatchDefinition(row.id);

    if (!nextState || !definition) {
      continue;
    }

    const winnerTeamId =
      nextState.winnerCode == null
        ? null
        : nextState.winnerCode === definition.homeCode
          ? row.home_team_id
          : nextState.winnerCode === definition.awayCode
            ? row.away_team_id
            : null;

    const patch: Record<string, unknown> = {};

    if (row.status !== nextState.status) patch.status = nextState.status;
    if (row.home_score_90 !== nextState.homeScore90) patch.home_score_90 = nextState.homeScore90;
    if (row.away_score_90 !== nextState.awayScore90) patch.away_score_90 = nextState.awayScore90;
    if (row.home_score_ft !== nextState.homeScoreFt) patch.home_score_ft = nextState.homeScoreFt;
    if (row.away_score_ft !== nextState.awayScoreFt) patch.away_score_ft = nextState.awayScoreFt;
    if (row.winner_team_id !== winnerTeamId) patch.winner_team_id = winnerTeamId;
    if ((row.winner_mode ?? null) !== nextState.winnerMode) patch.winner_mode = nextState.winnerMode;

    if (Object.keys(patch).length > 0) {
      patch.updated_at = now.toISOString();
      updates.push({ id: row.id, patch });
    }
  }

  for (const update of updates) {
    const result = await supabase.from("matches").update(update.patch).eq("id", update.id);
    if (result.error) {
      return {
        ok: false as const,
        reason: `No se pudo actualizar el partido dummy ${update.id}.`,
      };
    }
  }

  return {
    ok: true as const,
    processed: matchesQuery.data.length,
    updated: updates.length,
    skipped: getDummyMatchIds().length - matchesQuery.data.length,
  };
}

export async function getDummyCleanupImpact(supabase: SupabaseClient) {
  const matchIds = getDummyMatchIds();
  const [matches, markets, tickets, settlements] = await Promise.all([
    supabase.from("matches").select("id").in("id", matchIds).returns<CleanupCountRow[]>(),
    supabase.from("match_markets").select("id").in("match_id", matchIds).returns<CleanupCountRow[]>(),
    supabase.from("tickets").select("id").in("match_market_id", await listDummyMarketIds(supabase)).returns<CleanupCountRow[]>(),
    supabase
      .from("settlements")
      .select("id, ticket:tickets(match_market_id)")
      .returns<{ id: string; ticket: { match_market_id: string } | { match_market_id: string }[] | null }[]>(),
  ]);

  if (matches.error || markets.error || tickets.error || settlements.error) {
    return {
      ok: false as const,
      reason: "No se pudo calcular el impacto del cleanup dummy.",
    };
  }

  const dummyMarketIds = new Set((markets.data ?? []).map((market) => market.id));
  const impactedSettlements = (settlements.data ?? []).filter((settlement) => {
    const ticket = Array.isArray(settlement.ticket) ? settlement.ticket[0] : settlement.ticket;
    return ticket?.match_market_id ? dummyMarketIds.has(ticket.match_market_id) : false;
  });

  return {
    ok: true as const,
    counts: {
      matches: matches.data?.length ?? 0,
      matchMarkets: markets.data?.length ?? 0,
      tickets: tickets.data?.length ?? 0,
      settlements: impactedSettlements.length,
    },
  };
}

async function listDummyMarketIds(supabase: SupabaseClient) {
  const markets = await supabase
    .from("match_markets")
    .select("id")
    .in("match_id", getDummyMatchIds())
    .returns<CleanupCountRow[]>();

  if (markets.error) {
    return [] as string[];
  }

  return (markets.data ?? []).map((market) => market.id);
}

export async function cleanupDummyMatches(
  supabase: SupabaseClient,
  params: {
    dryRun?: boolean;
    confirm?: string;
    backupConfirmed?: boolean;
  } = {},
) {
  const impact = await getDummyCleanupImpact(supabase);

  if (!impact.ok) {
    return impact;
  }

  if (params.dryRun) {
    return {
      ok: true as const,
      dryRun: true,
      counts: impact.counts,
      requiredConfirmation: DUMMY_CONFIRMATION_TOKEN,
      backupRequired: true,
      timezone: AR_TZ,
    };
  }

  if (!params.backupConfirmed) {
    return {
      ok: false as const,
      reason: "Confirma que corriste export-picks antes del cleanup dummy.",
    };
  }

  if (params.confirm !== DUMMY_CONFIRMATION_TOKEN) {
    return {
      ok: false as const,
      reason: `Falta la confirmacion explicita ${DUMMY_CONFIRMATION_TOKEN}.`,
    };
  }

  const deleteMatches = await supabase.from("matches").delete().in("id", getDummyMatchIds());
  if (deleteMatches.error) {
    return {
      ok: false as const,
      reason: "No se pudieron borrar los partidos dummy.",
    };
  }

  return {
    ok: true as const,
    dryRun: false,
    counts: impact.counts,
    deletedMatchIds: getDummyMatchIds(),
  };
}
