import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch {}

const APPLY = process.argv.includes("--apply");
const log = (...a) => console.log(APPLY ? "[APPLY]" : "[DRY] ", ...a);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Faltan envs Supabase.");

const ESPN_TO_DB = { RSA: "ZAF", HAI: "HTI", URY: "URU" };
const norm = (c) => (c ? ESPN_TO_DB[c] ?? c : null);
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const espnRes = await fetch(
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260630&limit=200",
  { cache: "no-store" },
);
if (!espnRes.ok) throw new Error(`ESPN ${espnRes.status}`);
const espnEvents = (await espnRes.json()).events ?? [];

const teams = (await supabase.from("teams").select("id, fifa_code")).data;
const teamIdByCode = new Map(teams.map((t) => [t.fifa_code, t.id]));
const teamCodeById = new Map(teams.map((t) => [t.id, t.fifa_code]));

const stages = (await supabase.from("tournament_stages").select("id, code")).data;
const groupStageId = stages.find((s) => s.code === "group").id;

const dbMatches = (
  await supabase
    .from("matches")
    .select("id, external_id, kickoff_at, status, home_team_id, away_team_id")
    .eq("stage_id", groupStageId)
).data.map((m) => ({
  ...m,
  homeCode: teamCodeById.get(m.home_team_id),
  awayCode: teamCodeById.get(m.away_team_id),
}));

const pairKey = (a, b) => [a, b].sort().join("|");
const dbByPair = new Map();
for (const m of dbMatches) {
  const k = pairKey(m.homeCode, m.awayCode);
  const list = dbByPair.get(k) ?? [];
  list.push(m);
  dbByPair.set(k, list);
}

const espnByPair = [];
for (const ev of espnEvents) {
  const comp = ev.competitions?.[0];
  if (!comp) continue;
  const h = comp.competitors.find((c) => c.homeAway === "home");
  const a = comp.competitors.find((c) => c.homeAway === "away");
  const homeCode = norm(h?.team?.abbreviation);
  const awayCode = norm(a?.team?.abbreviation);
  if (!homeCode || !awayCode) continue;
  if (!teamIdByCode.has(homeCode) || !teamIdByCode.has(awayCode)) continue;
  espnByPair.push({ eventId: ev.id, kickoff: ev.date, homeCode, awayCode });
}

const repairs = [];
const usedDbIds = new Set();
for (const ev of espnByPair) {
  const candidates = dbByPair.get(pairKey(ev.homeCode, ev.awayCode)) ?? [];
  if (!candidates.length) continue;
  const best = candidates.reduce((acc, cur) => {
    const dAcc = Math.abs(new Date(acc.kickoff_at) - new Date(ev.kickoff));
    const dCur = Math.abs(new Date(cur.kickoff_at) - new Date(ev.kickoff));
    return dCur < dAcc ? cur : acc;
  });
  if (usedDbIds.has(best.id)) continue;
  usedDbIds.add(best.id);

  const sameOrientation = best.homeCode === ev.homeCode && best.awayCode === ev.awayCode;
  const driftMs = Math.abs(new Date(best.kickoff_at) - new Date(ev.kickoff));
  if (sameOrientation && driftMs < 60_000 && best.external_id === ev.eventId) continue;
  if (best.status !== "scheduled") {
    log(`SKIP non-scheduled ${best.id} (status=${best.status})`);
    continue;
  }
  repairs.push({
    dbId: best.id,
    espnId: ev.eventId,
    flipOrientation: !sameOrientation,
    oldHome: best.homeCode,
    oldAway: best.awayCode,
    newHomeCode: ev.homeCode,
    newAwayCode: ev.awayCode,
    newHomeId: teamIdByCode.get(ev.homeCode),
    newAwayId: teamIdByCode.get(ev.awayCode),
    oldKickoff: best.kickoff_at,
    newKickoff: ev.kickoff,
  });
}

console.log(`\nPartidos a reparar: ${repairs.length}`);
console.log(`Flips de orientación: ${repairs.filter((r) => r.flipOrientation).length}`);
console.table(
  repairs.map((r) => ({
    dbId: r.dbId,
    flip: r.flipOrientation,
    from: `${r.oldHome}-${r.oldAway} @ ${r.oldKickoff.slice(0, 16)}`,
    to: `${r.newHomeCode}-${r.newAwayCode} @ ${r.newKickoff.slice(0, 16)}`,
  })),
);

let totalTickets = 0;
let totalAllocSwaps = 0;
for (const r of repairs) {
  const markets = (
    await supabase.from("match_markets").select("id, market_type").eq("match_id", r.dbId)
  ).data ?? [];
  if (!markets.length) continue;
  for (const market of markets) {
    if (market.market_type !== "1x2") continue;
    const outcomes = (
      await supabase
        .from("market_outcomes")
        .select("id, code")
        .eq("match_market_id", market.id)
    ).data ?? [];
    const byCode = new Map(outcomes.map((o) => [o.code, o.id]));
    const homeOutcomeId = byCode.get("home");
    const awayOutcomeId = byCode.get("away");
    if (!homeOutcomeId || !awayOutcomeId) continue;

    const tickets = (
      await supabase.from("tickets").select("id").eq("match_market_id", market.id)
    ).data ?? [];
    totalTickets += tickets.length;

    if (!r.flipOrientation) continue;
    for (const t of tickets) {
      const allocs = (
        await supabase
          .from("ticket_allocations")
          .select("id, market_outcome_id, amount")
          .eq("ticket_id", t.id)
      ).data ?? [];
      const swapPlan = allocs
        .filter((a) => a.market_outcome_id === homeOutcomeId || a.market_outcome_id === awayOutcomeId)
        .map((a) => ({
          ticket_id: t.id,
          amount: a.amount,
          market_outcome_id:
            a.market_outcome_id === homeOutcomeId ? awayOutcomeId : homeOutcomeId,
        }));
      if (!swapPlan.length) continue;
      totalAllocSwaps += swapPlan.length;
      if (APPLY) {
        const delIds = allocs
          .filter((a) => a.market_outcome_id === homeOutcomeId || a.market_outcome_id === awayOutcomeId)
          .map((a) => a.id);
        const del = await supabase.from("ticket_allocations").delete().in("id", delIds);
        if (del.error) throw new Error(`delete allocs ticket ${t.id}: ${del.error.message}`);
        const ins = await supabase.from("ticket_allocations").insert(swapPlan);
        if (ins.error) throw new Error(`insert allocs ticket ${t.id}: ${ins.error.message}`);
      }
    }

    if (APPLY) {
      const upd = await supabase
        .from("match_markets")
        .update({ lock_at: r.newKickoff, updated_at: new Date().toISOString() })
        .eq("id", market.id);
      if (upd.error) throw new Error(`update market ${market.id}: ${upd.error.message}`);
    }
  }

  if (APPLY) {
    const upd = await supabase
      .from("matches")
      .update({
        home_team_id: r.newHomeId,
        away_team_id: r.newAwayId,
        kickoff_at: r.newKickoff,
        external_id: r.espnId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.dbId);
    if (upd.error) throw new Error(`update match ${r.dbId}: ${upd.error.message}`);
  }
}

console.log(`\nTickets en partidos afectados: ${totalTickets}`);
console.log(`Allocations a swappear (home↔away): ${totalAllocSwaps}`);
console.log(APPLY ? "\nAPPLY: cambios escritos." : "\nDRY RUN. Re-run con --apply para escribir.");
