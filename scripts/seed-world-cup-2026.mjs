import { createClient } from "@supabase/supabase-js";
import worldCup2026Data from "../data/world-cup-2026.json" with { type: "json" };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stageRows = [
  { code: "group", name: "Fase de grupos", sort_order: 10 },
  { code: "round_of_32", name: "Dieciseisavos", sort_order: 20 },
  { code: "round_of_16", name: "Octavos de final", sort_order: 30 },
  { code: "quarter_final", name: "Cuartos de final", sort_order: 40 },
  { code: "semi_final", name: "Semifinales", sort_order: 50 },
  { code: "third_place", name: "Tercer puesto", sort_order: 60 },
  { code: "final", name: "Final", sort_order: 70 },
];

const matchSlots = [
  { time: "16:00:00Z", venueIndex: 0 },
  { time: "19:00:00Z", venueIndex: 1 },
  { time: "16:00:00Z", venueIndex: 1 },
  { time: "19:00:00Z", venueIndex: 2 },
  { time: "17:00:00Z", venueIndex: 2 },
  { time: "20:00:00Z", venueIndex: 0 },
];

const pairingTemplate = [
  [0, 1],
  [2, 3],
  [1, 2],
  [0, 3],
  [3, 1],
  [2, 0],
];

const groups = worldCup2026Data.groups;
const teams = groups.flatMap((group) => group.teams);
const uniqueTeams = Array.from(new Map(teams.map((team) => [team.code, team])).values());

function buildGroupFixtures() {
  return groups.flatMap((group) =>
    pairingTemplate.map(([homeIndex, awayIndex], index) => {
      const slot = matchSlots[index];
      const day = group.matchDays[Math.floor(index / 2)];
      const home = group.teams[homeIndex];
      const away = group.teams[awayIndex];
      return {
        id: `${group.letter.toLowerCase()}-${home.code.toLowerCase()}-${away.code.toLowerCase()}`,
        stage_code: "group",
        home_code: home.code,
        away_code: away.code,
        kickoff_at: `${day}T${slot.time}`,
        status: "scheduled",
        venue_name: group.venues[slot.venueIndex],
        venue_city: group.venues[slot.venueIndex],
        home_score_90: null,
        away_score_90: null,
        home_score_ft: null,
        away_score_ft: null,
        winner_code: null,
        winner_mode: null,
      };
    }),
  );
}

async function main() {
  const fixtures = buildGroupFixtures();

  const stageUpsert = await supabase.from("tournament_stages").upsert(stageRows, { onConflict: "code" });
  if (stageUpsert.error) {
    throw stageUpsert.error;
  }

  const teamUpsert = await supabase.from("teams").upsert(
    uniqueTeams.map((team) => ({
      fifa_code: team.code,
      name: team.name,
      flag_url: null,
    })),
    { onConflict: "fifa_code" },
  );
  if (teamUpsert.error) {
    throw teamUpsert.error;
  }

  const [stagesQuery, teamsQuery] = await Promise.all([
    supabase.from("tournament_stages").select("id, code"),
    supabase.from("teams").select("id, fifa_code"),
  ]);

  if (stagesQuery.error) {
    throw stagesQuery.error;
  }
  if (teamsQuery.error) {
    throw teamsQuery.error;
  }

  const stageIdByCode = new Map((stagesQuery.data ?? []).map((item) => [item.code, item.id]));
  const teamIdByCode = new Map((teamsQuery.data ?? []).map((item) => [item.fifa_code, item.id]));

  const matchRows = fixtures.map((fixture) => ({
    id: fixture.id,
    external_id: fixture.id,
    stage_id: stageIdByCode.get(fixture.stage_code),
    home_team_id: teamIdByCode.get(fixture.home_code),
    away_team_id: teamIdByCode.get(fixture.away_code),
    kickoff_at: fixture.kickoff_at,
    status: fixture.status,
    venue_name: fixture.venue_name,
    venue_city: fixture.venue_city,
    home_score_90: fixture.home_score_90,
    away_score_90: fixture.away_score_90,
    home_score_ft: fixture.home_score_ft,
    away_score_ft: fixture.away_score_ft,
    winner_team_id: fixture.winner_code ? teamIdByCode.get(fixture.winner_code) : null,
    winner_mode: fixture.winner_mode,
  }));

  const invalidMatch = matchRows.find((row) => !row.stage_id || !row.home_team_id || !row.away_team_id);
  if (invalidMatch) {
    throw new Error(`Fixture inválido para ${invalidMatch.id}`);
  }

  const matchUpsert = await supabase.from("matches").upsert(matchRows, { onConflict: "id" });
  if (matchUpsert.error) {
    throw matchUpsert.error;
  }

  const matchesQuery = await supabase.from("matches").select("id");
  if (matchesQuery.error) {
    throw matchesQuery.error;
  }

  const desiredMatchIds = new Set(fixtures.map((fixture) => fixture.id));
  const existingMatchIds = (matchesQuery.data ?? [])
    .map((item) => item.id)
    .filter((id) => desiredMatchIds.has(id));

  const marketsQuery = await supabase.from("match_markets").select("id, match_id").in("match_id", existingMatchIds);
  if (marketsQuery.error) {
    throw marketsQuery.error;
  }

  const existingMarketByMatchId = new Map((marketsQuery.data ?? []).map((item) => [item.match_id, item.id]));
  const newMarketRows = existingMatchIds
    .filter((matchId) => !existingMarketByMatchId.has(matchId))
    .map((matchId) => ({
      match_id: matchId,
      market_type: "1x2",
      lock_at: fixtures.find((fixture) => fixture.id === matchId)?.kickoff_at,
      status: "open",
    }));

  if (newMarketRows.length) {
    const marketsInsert = await supabase.from("match_markets").insert(newMarketRows);
    if (marketsInsert.error) {
      throw marketsInsert.error;
    }
  }

  const refreshedMarketsQuery = await supabase.from("match_markets").select("id, match_id, market_type").in("match_id", existingMatchIds);
  if (refreshedMarketsQuery.error) {
    throw refreshedMarketsQuery.error;
  }

  const marketRows = refreshedMarketsQuery.data ?? [];
  const outcomeRows = marketRows.flatMap((market) => [
    { match_market_id: market.id, code: "home", label: "Gana local", sort_order: 10 },
    { match_market_id: market.id, code: "draw", label: "Empate", sort_order: 20 },
    { match_market_id: market.id, code: "away", label: "Gana visitante", sort_order: 30 },
  ]);

  const outcomesUpsert = await supabase.from("market_outcomes").upsert(outcomeRows, {
    onConflict: "match_market_id,code",
  });
  if (outcomesUpsert.error) {
    throw outcomesUpsert.error;
  }

  const championQuery = await supabase.from("champion_market").select("id").limit(1);
  if (championQuery.error) {
    throw championQuery.error;
  }

  if ((championQuery.data ?? []).length === 0) {
    const championInsert = await supabase.from("champion_market").insert({
      lock_at: "2026-06-11T00:00:00Z",
      status: "open",
    });
    if (championInsert.error) {
      throw championInsert.error;
    }
  }

  console.log(`Seed listo: ${uniqueTeams.length} equipos y ${fixtures.length} partidos de grupos.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
