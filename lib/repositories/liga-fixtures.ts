import { LIGA_2026_TEAMS, LIGA_2026_TOURNAMENT } from "@/lib/liga-2026";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const codeByEspnId = new Map(LIGA_2026_TEAMS.map((team) => [team.espnId, team.code]));

type EspnCompetitor = { homeAway: string; team?: { id?: string }; score?: string | null; winner?: boolean };
type EspnEvent = {
  id: string;
  date: string;
  season?: { slug?: string };
  status?: { type?: { state?: "pre" | "in" | "post" } };
  competitions: { competitors: EspnCompetitor[] }[];
};

function parseScore(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function lifecycleRank(status: string): number {
  if (status === "finished") return 2;
  if (status === "live") return 1;
  return 0;
}

function espnDate(offsetDays: number): string {
  const base = Date.now() + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(base).toISOString().slice(0, 10).replace(/-/g, "");
}

export async function ingestLigaFixtures({ daysBack = 3, daysAhead = 10 } = {}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false as const, reason: "Supabase no configurado." };

  const [teamsQuery, stagesQuery] = await Promise.all([
    supabase.from("teams").select("id, fifa_code"),
    supabase.from("tournament_stages").select("id, code"),
  ]);
  if (teamsQuery.error || stagesQuery.error) {
    return { ok: false as const, reason: "No se pudieron cargar teams/stages." };
  }
  const teamIdByCode = new Map((teamsQuery.data ?? []).map((team) => [team.fifa_code, team.id]));
  const groupStageId = new Map((stagesQuery.data ?? []).map((stage) => [stage.code, stage.id])).get("group");
  if (!groupStageId) return { ok: false as const, reason: "Falta el stage 'group'." };

  const resolveTeamId = (espnId: string | undefined): string | null => {
    const code = espnId ? codeByEspnId.get(espnId) : undefined;
    return code ? teamIdByCode.get(code) ?? null : null;
  };

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LIGA_2026_TOURNAMENT.leagueCode}/scoreboard?dates=${espnDate(-daysBack)}-${espnDate(daysAhead)}&limit=400`;
  let payload: { events?: EspnEvent[] };
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return { ok: false as const, reason: `ESPN ${response.status}` };
    payload = await response.json();
  } catch (error) {
    return { ok: false as const, reason: error instanceof Error ? error.message : "fetch ESPN falló" };
  }

  const existingQuery = await supabase.from("matches").select("id, kickoff_at, status");
  const existingById = new Map((existingQuery.data ?? []).map((match) => [match.id, match]));

  type NewFixture = {
    id: string;
    homeId: string;
    awayId: string;
    kickoff: string;
    externalId: string;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    winnerTeamId: string | null;
    winnerMode: string | null;
  };
  const toCreate: NewFixture[] = [];
  const toReschedule: { id: string; kickoff: string }[] = [];
  const toBackfill: { id: string; status: string; homeScore: number | null; awayScore: number | null; winnerTeamId: string | null; winnerMode: string | null }[] = [];
  for (const event of payload.events ?? []) {
    if (event.season?.slug && event.season.slug !== LIGA_2026_TOURNAMENT.seasonSlug) continue;
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const homeCompetitor = competitors.find((c) => c.homeAway === "home");
    const awayCompetitor = competitors.find((c) => c.homeAway === "away");
    const homeId = resolveTeamId(homeCompetitor?.team?.id);
    const awayId = resolveTeamId(awayCompetitor?.team?.id);
    if (!homeId || !awayId) continue;

    const id = `cl-${event.id}`;
    const state = event.status?.type?.state ?? "pre";
    const hasStarted = state !== "pre";
    const homeScore = hasStarted ? parseScore(homeCompetitor?.score) : null;
    const awayScore = hasStarted ? parseScore(awayCompetitor?.score) : null;
    const status = state === "post" ? "finished" : state === "in" ? "live" : "scheduled";
    let winnerTeamId: string | null = null;
    if (state === "post" && homeScore != null && awayScore != null) {
      if (homeScore > awayScore) winnerTeamId = homeId;
      else if (awayScore > homeScore) winnerTeamId = awayId;
    }

    const existing = existingById.get(id);
    if (existing) {
      const drifted = Math.abs(new Date(existing.kickoff_at).getTime() - new Date(event.date).getTime()) > 60_000;
      if (drifted && existing.status === "scheduled") toReschedule.push({ id, kickoff: event.date });
      if (lifecycleRank(status) > lifecycleRank(existing.status)) {
        toBackfill.push({ id, status, homeScore, awayScore, winnerTeamId, winnerMode: state === "post" ? "regulation" : null });
      }
      continue;
    }

    toCreate.push({
      id,
      homeId,
      awayId,
      kickoff: event.date,
      externalId: event.id,
      status,
      homeScore,
      awayScore,
      winnerTeamId,
      winnerMode: state === "post" ? "regulation" : null,
    });
  }

  for (const match of toReschedule) {
    await supabase.from("matches").update({ kickoff_at: match.kickoff, updated_at: new Date().toISOString() }).eq("id", match.id);
    await supabase.from("match_markets").update({ lock_at: match.kickoff }).eq("match_id", match.id).eq("status", "open");
  }

  for (const match of toBackfill) {
    await supabase
      .from("matches")
      .update({
        status: match.status,
        home_score_90: match.homeScore,
        away_score_90: match.awayScore,
        home_score_ft: match.status === "finished" ? match.homeScore : null,
        away_score_ft: match.status === "finished" ? match.awayScore : null,
        winner_team_id: match.winnerTeamId,
        winner_mode: match.winnerMode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);
  }

  if (!toCreate.length) {
    return { ok: true as const, created: [] as string[], rescheduled: toReschedule.length, backfilled: toBackfill.length };
  }

  const matchRows = toCreate.map((fixture) => ({
    id: fixture.id,
    external_id: fixture.externalId,
    stage_id: groupStageId,
    home_team_id: fixture.homeId,
    away_team_id: fixture.awayId,
    kickoff_at: fixture.kickoff,
    status: fixture.status,
    home_score_90: fixture.homeScore,
    away_score_90: fixture.awayScore,
    home_score_ft: fixture.status === "finished" ? fixture.homeScore : null,
    away_score_ft: fixture.status === "finished" ? fixture.awayScore : null,
    winner_team_id: fixture.winnerTeamId,
    winner_mode: fixture.winnerMode,
  }));
  const matchError = (await supabase.from("matches").upsert(matchRows, { onConflict: "id", ignoreDuplicates: true })).error;
  if (matchError) return { ok: false as const, reason: `matches: ${matchError.message}` };

  const marketRows = toCreate.map((fixture) => ({
    match_id: fixture.id,
    market_type: "1x2",
    lock_at: fixture.kickoff,
    status: "open",
  }));
  const marketError = (await supabase.from("match_markets").upsert(marketRows, { onConflict: "match_id", ignoreDuplicates: true })).error;
  if (marketError) return { ok: false as const, reason: `markets: ${marketError.message}` };

  const markets = (await supabase.from("match_markets").select("id, match_id").in("match_id", toCreate.map((f) => f.id))).data ?? [];
  const outcomeRows = markets.flatMap((market) => [
    { match_market_id: market.id, code: "home", label: "Gana local", sort_order: 10 },
    { match_market_id: market.id, code: "draw", label: "Empate", sort_order: 20 },
    { match_market_id: market.id, code: "away", label: "Gana visitante", sort_order: 30 },
  ]);
  if (outcomeRows.length) {
    const outcomeError = (await supabase.from("market_outcomes").upsert(outcomeRows, { onConflict: "match_market_id,code" })).error;
    if (outcomeError) return { ok: false as const, reason: `outcomes: ${outcomeError.message}` };
  }

  return { ok: true as const, created: toCreate.map((fixture) => fixture.id), rescheduled: toReschedule.length, backfilled: toBackfill.length };
}
