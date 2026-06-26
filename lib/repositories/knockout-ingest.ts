import { getSupabaseServerClient } from "@/lib/supabase/server";

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260720&limit=80";
const ESPN_TO_DB: Record<string, string> = { RSA: "ZAF", HAI: "HTI", URY: "URU" };
const STAGE_BY_SLUG: Record<string, string> = {
  "round-of-32": "round_of_32",
  "round-of-16": "round_of_16",
  quarterfinals: "quarter_final",
  semifinals: "semi_final",
  final: "final",
  "3rd-place-match": "third_place",
};

type ScoreboardEvent = {
  id: string;
  date: string;
  season?: { slug?: string };
  competitions: { competitors: { homeAway: string; team?: { abbreviation?: string } }[] }[];
};

const pairKey = (stageId: string, teamA: string, teamB: string) => `${stageId}|${[teamA, teamB].sort().join("|")}`;

export async function ingestDefinedKnockouts() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { ok: false as const, reason: "Supabase no esta configurado." };

  const [teamsQuery, stagesQuery] = await Promise.all([
    supabase.from("teams").select("id, name, fifa_code"),
    supabase.from("tournament_stages").select("id, code"),
  ]);
  const teamByCode = new Map((teamsQuery.data ?? []).map((team) => [team.fifa_code, team]));
  const stageIdByCode = new Map((stagesQuery.data ?? []).map((stage) => [stage.code, stage.id]));
  const resolveTeam = (abbreviation: string) => teamByCode.get(ESPN_TO_DB[abbreviation] ?? abbreviation) ?? null;

  const existingQuery = await supabase
    .from("matches")
    .select("id, stage_id, home_team_id, away_team_id");
  const existingIds = new Set((existingQuery.data ?? []).map((m) => m.id));
  const existingPairs = new Set((existingQuery.data ?? []).map((m) => pairKey(m.stage_id, m.home_team_id, m.away_team_id)));

  let scoreboard: { events?: ScoreboardEvent[] };
  try {
    const response = await fetch(SCOREBOARD_URL, { cache: "no-store" });
    if (!response.ok) return { ok: false as const, reason: `ESPN ${response.status}` };
    scoreboard = await response.json();
  } catch (error) {
    return { ok: false as const, reason: error instanceof Error ? error.message : "fetch ESPN fallo" };
  }

  const now = Date.now();
  const seen = new Set<string>();
  const toCreate: { id: string; externalId: string; stageId: string; home: { id: string; name: string }; away: { id: string; name: string }; kickoff: string }[] = [];

  for (const event of scoreboard.events ?? []) {
    const stageCode = STAGE_BY_SLUG[event.season?.slug ?? ""];
    if (!stageCode) continue;
    const stageId = stageIdByCode.get(stageCode);
    if (!stageId) continue;

    const competitors = event.competitions[0].competitors;
    const home = resolveTeam(competitors.find((c) => c.homeAway === "home")?.team?.abbreviation ?? "");
    const away = resolveTeam(competitors.find((c) => c.homeAway === "away")?.team?.abbreviation ?? "");
    if (!home || !away) continue;
    if (new Date(event.date).getTime() <= now) continue;

    const key = pairKey(stageId, home.id, away.id);
    if (existingPairs.has(key) || seen.has(key)) continue;

    const id = `${stageCode}-${home.fifa_code}-${away.fifa_code}`.toLowerCase();
    if (existingIds.has(id)) continue;

    seen.add(key);
    toCreate.push({ id, externalId: event.id, stageId, home, away, kickoff: event.date });
  }

  if (!toCreate.length) return { ok: true as const, created: [] as string[] };

  const matchRows = toCreate.map((c) => ({
    id: c.id,
    external_id: c.externalId,
    stage_id: c.stageId,
    home_team_id: c.home.id,
    away_team_id: c.away.id,
    kickoff_at: c.kickoff,
    status: "scheduled",
  }));
  const matchErr = (await supabase.from("matches").upsert(matchRows, { onConflict: "id", ignoreDuplicates: true })).error;
  if (matchErr) return { ok: false as const, reason: `matches: ${matchErr.message}` };

  const existingMarkets = new Set(
    (await supabase.from("match_markets").select("match_id").in("match_id", toCreate.map((c) => c.id))).data?.map((m) => m.match_id) ?? [],
  );
  const marketRows = toCreate
    .filter((c) => !existingMarkets.has(c.id))
    .map((c) => ({ match_id: c.id, market_type: "qualifies", lock_at: c.kickoff, status: "open" }));
  if (marketRows.length) {
    const marketErr = (await supabase.from("match_markets").insert(marketRows)).error;
    if (marketErr) return { ok: false as const, reason: `markets: ${marketErr.message}` };
  }

  const markets = (await supabase.from("match_markets").select("id, match_id").in("match_id", toCreate.map((c) => c.id))).data ?? [];
  const byMatch = new Map(toCreate.map((c) => [c.id, c]));
  const outcomeRows = markets.flatMap((m) => {
    const c = byMatch.get(m.match_id);
    if (!c) return [];
    return [
      { match_market_id: m.id, code: "home_qualifies", label: `Clasifica ${c.home.name}`, sort_order: 10 },
      { match_market_id: m.id, code: "away_qualifies", label: `Clasifica ${c.away.name}`, sort_order: 20 },
    ];
  });
  if (outcomeRows.length) {
    const outcomeErr = (await supabase.from("market_outcomes").upsert(outcomeRows, { onConflict: "match_market_id, code" })).error;
    if (outcomeErr) return { ok: false as const, reason: `outcomes: ${outcomeErr.message}` };
  }

  return { ok: true as const, created: toCreate.map((c) => c.id) };
}
