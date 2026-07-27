import { createClient } from "@supabase/supabase-js";
import liga2026Data from "../data/liga-2026.json" with { type: "json" };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stageRows = [
  { code: "group", name: "Fase de zonas", sort_order: 10 },
  { code: "round_of_16", name: "Octavos de final", sort_order: 30 },
  { code: "quarter_final", name: "Cuartos de final", sort_order: 40 },
  { code: "semi_final", name: "Semifinales", sort_order: 50 },
  { code: "final", name: "Final", sort_order: 70 },
];

const championLockAt = process.env.CHAMPION_LOCK_AT || "2026-08-01T00:00:00Z";

const teams = liga2026Data.zones.flatMap((zone) => zone.teams);

async function main() {
  const stageUpsert = await supabase.from("tournament_stages").upsert(stageRows, { onConflict: "code" });
  if (stageUpsert.error) throw stageUpsert.error;

  const teamUpsert = await supabase.from("teams").upsert(
    teams.map((team) => ({
      fifa_code: team.code,
      name: team.name,
      flag_url: `https://a.espncdn.com/i/teamlogos/soccer/500/${team.espnId}.png`,
    })),
    { onConflict: "fifa_code" },
  );
  if (teamUpsert.error) throw teamUpsert.error;

  const championQuery = await supabase.from("champion_market").select("id").limit(1);
  if (championQuery.error) throw championQuery.error;

  if ((championQuery.data ?? []).length === 0) {
    const championInsert = await supabase.from("champion_market").insert({
      lock_at: championLockAt,
      status: "open",
    });
    if (championInsert.error) throw championInsert.error;
  }

  console.log(`Seed listo: ${teams.length} equipos, ${stageRows.length} stages. Fixtures: correr el cron sync-fixtures.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
