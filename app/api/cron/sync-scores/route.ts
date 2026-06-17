import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ESPN_TO_DB: Record<string, string> = {
  RSA: "ZAF",
  HAI: "HTI",
  URY: "URU",
};

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

type EspnCompetitor = {
  homeAway: "home" | "away";
  score: string | null;
  team: { abbreviation: string | null };
  shootoutScore?: string | number | null;
  shootoutGoals?: string | number | null;
};

type EspnEvent = {
  id: string;
  date: string;
  status: {
    type: {
      state: "pre" | "in" | "post";
      completed: boolean;
      name?: string;
      description?: string;
      detail?: string;
      shortDetail?: string;
    };
  };
  competitions: { competitors: EspnCompetitor[] }[];
};

type Phase =
  | "scheduled"
  | "regulation"
  | "extra_time"
  | "penalties"
  | "finished_regulation"
  | "finished_extra_time"
  | "finished_penalties";

function normalizeCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return ESPN_TO_DB[code] ?? code;
}

function detectPhase(evStatus: EspnEvent["status"]): Phase {
  const { state, completed, name, description, detail, shortDetail } = evStatus.type;
  const text = `${name ?? ""} ${description ?? ""} ${detail ?? ""} ${shortDetail ?? ""}`.toLowerCase();
  const isShootout = /pen|shoot/.test(text);
  const isExtra = /extra|aet|\bet\b|overtime/.test(text);

  if (state === "pre") return "scheduled";
  if (state === "in") {
    if (isShootout) return "penalties";
    if (isExtra) return "extra_time";
    return "regulation";
  }
  if (state === "post" && completed) {
    if (isShootout) return "finished_penalties";
    if (isExtra) return "finished_extra_time";
    return "finished_regulation";
  }
  return "scheduled";
}

function parseScore(s: string | number | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = typeof s === "number" ? s : Number(s);
  return Number.isFinite(n) ? n : null;
}

function dbStatusFor(phase: Phase): string | null {
  if (phase === "scheduled") return null;
  if (phase.startsWith("finished")) return "finished";
  return "live";
}

function winnerModeFor(phase: Phase): string | null {
  if (phase === "finished_regulation") return "regulation";
  if (phase === "finished_extra_time") return "extra_time";
  if (phase === "finished_penalties") return "penalties";
  return null;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const espnResponse = await fetch(ESPN_BASE, { cache: "no-store" });
  if (!espnResponse.ok) {
    return NextResponse.json({ ok: false, reason: `ESPN ${espnResponse.status}` }, { status: 502 });
  }

  const espnPayload = (await espnResponse.json()) as { events?: EspnEvent[] };
  const espnEvents = espnPayload.events ?? [];

  const teamsQuery = await supabase.from("teams").select("id, fifa_code");
  if (teamsQuery.error || !teamsQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se pudieron cargar teams." }, { status: 500 });
  }
  const teamByCode = new Map(teamsQuery.data.map((t) => [t.fifa_code, t.id]));

  const dbMatchesQuery = await supabase
    .from("matches")
    .select(
      "id, external_id, kickoff_at, home_team_id, away_team_id, status, home_score_90, away_score_90, home_score_ft, away_score_ft, winner_mode",
    );
  if (dbMatchesQuery.error || !dbMatchesQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se pudieron cargar matches." }, { status: 500 });
  }

  const dbByExternalId = new Map<string, (typeof dbMatchesQuery.data)[number]>();
  const dbByUnorderedPair = new Map<string, (typeof dbMatchesQuery.data)[number][]>();
  for (const m of dbMatchesQuery.data) {
    if (m.external_id) dbByExternalId.set(m.external_id, m);
    const key = [m.home_team_id, m.away_team_id].sort().join("|");
    const list = dbByUnorderedPair.get(key) ?? [];
    list.push(m);
    dbByUnorderedPair.set(key, list);
  }

  type Update = {
    id: string;
    status: string | null;
    phase: Phase;
    home_score_90: number | null;
    away_score_90: number | null;
    home_score_ft: number | null;
    away_score_ft: number | null;
    winner_team_id: string | null;
    winner_mode: string | null;
  };

  const updates: Update[] = [];
  const kickoffByMatchId = new Map<string, string>();
  let skipped = 0;
  let alreadySettled = 0;

  for (const ev of espnEvents) {
    const comp = ev.competitions?.[0];
    if (!comp) {
      skipped += 1;
      continue;
    }
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    if (!home || !away) {
      skipped += 1;
      continue;
    }
    const homeCode = normalizeCode(home.team.abbreviation);
    const awayCode = normalizeCode(away.team.abbreviation);
    if (!homeCode || !awayCode) {
      skipped += 1;
      continue;
    }
    const homeId = teamByCode.get(homeCode);
    const awayId = teamByCode.get(awayCode);
    if (!homeId || !awayId) {
      skipped += 1;
      continue;
    }
    const espnTime = new Date(ev.date).getTime();
    let dbMatch = dbByExternalId.get(ev.id) ?? null;
    if (!dbMatch) {
      const candidates = dbByUnorderedPair.get([homeId, awayId].sort().join("|"));
      if (!candidates || !candidates.length) {
        skipped += 1;
        continue;
      }
      dbMatch = candidates.length === 1
        ? candidates[0]
        : candidates.reduce((best, cur) => {
            const dBest = Math.abs(new Date(best.kickoff_at).getTime() - espnTime);
            const dCur = Math.abs(new Date(cur.kickoff_at).getTime() - espnTime);
            return dCur < dBest ? cur : best;
          });
    }
    if (dbMatch.status === "settled" || (dbMatch.status === "finished" && dbMatch.home_score_ft != null)) {
      alreadySettled += 1;
      continue;
    }

    const phase = detectPhase(ev.status);
    const runningHome = parseScore(home.score);
    const runningAway = parseScore(away.score);

    let next_home_90 = dbMatch.home_score_90;
    let next_away_90 = dbMatch.away_score_90;
    let next_home_ft = dbMatch.home_score_ft;
    let next_away_ft = dbMatch.away_score_ft;

    if (phase === "regulation") {
      if (runningHome != null) next_home_90 = runningHome;
      if (runningAway != null) next_away_90 = runningAway;
    } else if (phase === "extra_time") {
      if (runningHome != null) next_home_ft = runningHome;
      if (runningAway != null) next_away_ft = runningAway;
    } else if (phase === "finished_regulation") {
      if (runningHome != null) {
        next_home_90 = runningHome;
        next_home_ft = runningHome;
      }
      if (runningAway != null) {
        next_away_90 = runningAway;
        next_away_ft = runningAway;
      }
    } else if (phase === "finished_extra_time" || phase === "finished_penalties") {
      if (runningHome != null) next_home_ft = runningHome;
      if (runningAway != null) next_away_ft = runningAway;
    }

    let winnerTeamId: string | null = null;
    if (phase === "finished_regulation" || phase === "finished_extra_time") {
      if (next_home_ft != null && next_away_ft != null) {
        if (next_home_ft > next_away_ft) winnerTeamId = homeId;
        else if (next_away_ft > next_home_ft) winnerTeamId = awayId;
      }
    } else if (phase === "finished_penalties") {
      const homePens = parseScore(home.shootoutScore ?? home.shootoutGoals ?? null);
      const awayPens = parseScore(away.shootoutScore ?? away.shootoutGoals ?? null);
      if (homePens != null && awayPens != null) {
        if (homePens > awayPens) winnerTeamId = homeId;
        else if (awayPens > homePens) winnerTeamId = awayId;
      }
    }

    updates.push({
      id: dbMatch.id,
      status: dbStatusFor(phase),
      phase,
      home_score_90: next_home_90,
      away_score_90: next_away_90,
      home_score_ft: next_home_ft,
      away_score_ft: next_away_ft,
      winner_team_id: winnerTeamId,
      winner_mode: winnerModeFor(phase),
    });

    kickoffByMatchId.set(dbMatch.id, ev.date);
  }

  let actuallyUpdated = 0;
  for (const u of updates) {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (u.status) updateData.status = u.status;
    if (u.home_score_90 != null) updateData.home_score_90 = u.home_score_90;
    if (u.away_score_90 != null) updateData.away_score_90 = u.away_score_90;
    if (u.home_score_ft != null) updateData.home_score_ft = u.home_score_ft;
    if (u.away_score_ft != null) updateData.away_score_ft = u.away_score_ft;
    if (u.winner_team_id) updateData.winner_team_id = u.winner_team_id;
    if (u.winner_mode) updateData.winner_mode = u.winner_mode;
    if (Object.keys(updateData).length === 1) continue;
    const res = await supabase.from("matches").update(updateData).eq("id", u.id);
    if (!res.error) actuallyUpdated += 1;
  }

  let kickoffSynced = 0;
  for (const m of dbMatchesQuery.data) {
    const espnKickoff = kickoffByMatchId.get(m.id);
    if (!espnKickoff) continue;
    const current = new Date(m.kickoff_at).getTime();
    const incoming = new Date(espnKickoff).getTime();
    if (Math.abs(current - incoming) < 60_000) continue;
    const res = await supabase
      .from("matches")
      .update({ kickoff_at: espnKickoff, updated_at: new Date().toISOString() })
      .eq("id", m.id);
    if (!res.error) {
      await supabase.from("match_markets").update({ lock_at: espnKickoff }).eq("match_id", m.id);
      kickoffSynced += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    source: "espn",
    espnEventsTotal: espnEvents.length,
    matched: updates.length,
    skipped,
    alreadySettled,
    actuallyUpdated,
    kickoffSynced,
    updated: updates
      .filter((u) => u.status || u.home_score_90 != null || u.home_score_ft != null)
      .map((u) => ({
        id: u.id,
        status: u.status,
        phase: u.phase,
        score90: `${u.home_score_90 ?? "-"}:${u.away_score_90 ?? "-"}`,
        scoreFt: `${u.home_score_ft ?? "-"}:${u.away_score_ft ?? "-"}`,
        winner_mode: u.winner_mode,
      })),
  });
}
