import { LIGA_2026_TEAMS, LIGA_2026_TOURNAMENT } from "@/lib/liga-2026";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const codeByEspnId = new Map(LIGA_2026_TEAMS.map((team) => [team.espnId, team.code]));

type EspnEvent = {
  id: string;
  date: string;
  season?: { slug?: string };
  competitions: { competitors: { homeAway: string; team?: { id?: string } }[] }[];
};

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

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LIGA_2026_TOURNAMENT.leagueCode}/scoreboard?dates=${espnDate(-daysBack)}-${espnDate(daysAhead)}&limit=100`;
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

  const toCreate: { id: string; homeId: string; awayId: string; kickoff: string; externalId: string }[] = [];
  const toReschedule: { id: string; kickoff: string }[] = [];
  for (const event of payload.events ?? []) {
    if (event.season?.slug && event.season.slug !== LIGA_2026_TOURNAMENT.seasonSlug) continue;
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const homeId = resolveTeamId(competitors.find((c) => c.homeAway === "home")?.team?.id);
    const awayId = resolveTeamId(competitors.find((c) => c.homeAway === "away")?.team?.id);
    if (!homeId || !awayId) continue;

    const id = `cl-${event.id}`;
    const existing = existingById.get(id);
    if (existing) {
      const drifted = Math.abs(new Date(existing.kickoff_at).getTime() - new Date(event.date).getTime()) > 60_000;
      if (drifted && existing.status === "scheduled") toReschedule.push({ id, kickoff: event.date });
      continue;
    }
    toCreate.push({ id, homeId, awayId, kickoff: event.date, externalId: event.id });
  }

  for (const match of toReschedule) {
    await supabase.from("matches").update({ kickoff_at: match.kickoff, updated_at: new Date().toISOString() }).eq("id", match.id);
    await supabase.from("match_markets").update({ lock_at: match.kickoff }).eq("match_id", match.id).eq("status", "open");
  }

  if (!toCreate.length) return { ok: true as const, created: [] as string[], rescheduled: toReschedule.length };

  const matchRows = toCreate.map((fixture) => ({
    id: fixture.id,
    external_id: fixture.externalId,
    stage_id: groupStageId,
    home_team_id: fixture.homeId,
    away_team_id: fixture.awayId,
    kickoff_at: fixture.kickoff,
    status: "scheduled",
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

  return { ok: true as const, created: toCreate.map((fixture) => fixture.id), rescheduled: toReschedule.length };
}
