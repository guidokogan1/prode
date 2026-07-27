import { NextRequest, NextResponse } from "next/server";
import { LIGA_2026_TEAMS, LIGA_2026_TOURNAMENT } from "@/lib/liga-2026";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ESPN_BASE = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LIGA_2026_TOURNAMENT.leagueCode}/scoreboard`;

const WINDOW_BEFORE_MS = 6 * 60 * 60 * 1000;
const WINDOW_AFTER_MS = 3 * 60 * 60 * 1000;

const codeByEspnId = new Map(LIGA_2026_TEAMS.map((team) => [team.espnId, team.code]));

type EspnCompetitor = {
  homeAway: "home" | "away";
  score: string | null;
  team: { id: string | null };
  shootoutScore?: string | number | null;
  shootoutGoals?: string | number | null;
};

type EspnEvent = {
  id: string;
  date: string;
  season?: { slug?: string };
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

function parseScore(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  const now = Date.now();
  const windowStart = new Date(now - WINDOW_BEFORE_MS).toISOString();
  const windowEnd = new Date(now + WINDOW_AFTER_MS).toISOString();

  const windowedMatchesQuery = await supabase
    .from("matches")
    .select("id, external_id, kickoff_at, home_team_id, away_team_id, status, winner_mode")
    .in("status", ["scheduled", "live"])
    .gte("kickoff_at", windowStart)
    .lte("kickoff_at", windowEnd);
  if (windowedMatchesQuery.error || !windowedMatchesQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se pudieron cargar matches." }, { status: 500 });
  }

  const windowedMatches = windowedMatchesQuery.data;
  if (windowedMatches.length === 0) {
    return NextResponse.json({ ok: true, source: "espn", inWindow: 0, actuallyUpdated: 0 });
  }

  const teamsQuery = await supabase.from("teams").select("id, fifa_code");
  if (teamsQuery.error || !teamsQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se pudieron cargar teams." }, { status: 500 });
  }
  const teamIdByCode = new Map(teamsQuery.data.map((team) => [team.fifa_code, team.id]));
  const resolveTeamId = (espnId: string | null): string | null => {
    if (!espnId) return null;
    const code = codeByEspnId.get(espnId);
    return code ? teamIdByCode.get(code) ?? null : null;
  };

  const espnResponse = await fetch(ESPN_BASE, { cache: "no-store" });
  if (!espnResponse.ok) {
    return NextResponse.json({ ok: false, reason: `ESPN ${espnResponse.status}` }, { status: 502 });
  }
  const espnPayload = (await espnResponse.json()) as { events?: EspnEvent[] };
  const espnEvents = espnPayload.events ?? [];

  const dbByExternalId = new Map<string, (typeof windowedMatches)[number]>();
  const dbByPair = new Map<string, (typeof windowedMatches)[number][]>();
  for (const match of windowedMatches) {
    if (match.external_id) dbByExternalId.set(match.external_id, match);
    const key = [match.home_team_id, match.away_team_id].sort().join("|");
    const list = dbByPair.get(key) ?? [];
    list.push(match);
    dbByPair.set(key, list);
  }

  let matched = 0;
  let actuallyUpdated = 0;
  const applied: unknown[] = [];

  for (const event of espnEvents) {
    if (event.season?.slug && event.season.slug !== LIGA_2026_TOURNAMENT.seasonSlug) continue;

    const competitors = event.competitions?.[0]?.competitors;
    if (!competitors) continue;
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");
    if (!home || !away) continue;

    const homeId = resolveTeamId(home.team.id);
    const awayId = resolveTeamId(away.team.id);
    if (!homeId || !awayId) continue;

    let dbMatch = dbByExternalId.get(event.id) ?? null;
    if (!dbMatch) {
      const candidates = dbByPair.get([homeId, awayId].sort().join("|"));
      if (!candidates || !candidates.length) continue;
      const espnTime = new Date(event.date).getTime();
      dbMatch =
        candidates.length === 1
          ? candidates[0]
          : candidates.reduce((best, current) =>
              Math.abs(new Date(current.kickoff_at).getTime() - espnTime) <
              Math.abs(new Date(best.kickoff_at).getTime() - espnTime)
                ? current
                : best,
            );
    }

    matched += 1;
    const phase = detectPhase(event.status);
    const runningHome = parseScore(home.score);
    const runningAway = parseScore(away.score);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const status = dbStatusFor(phase);
    if (status) updateData.status = status;

    if (phase === "regulation") {
      if (runningHome != null) updateData.home_score_90 = runningHome;
      if (runningAway != null) updateData.away_score_90 = runningAway;
    } else if (phase === "finished_regulation") {
      if (runningHome != null) {
        updateData.home_score_90 = runningHome;
        updateData.home_score_ft = runningHome;
      }
      if (runningAway != null) {
        updateData.away_score_90 = runningAway;
        updateData.away_score_ft = runningAway;
      }
    } else if (phase === "extra_time" || phase === "finished_extra_time" || phase === "finished_penalties") {
      if (runningHome != null) updateData.home_score_ft = runningHome;
      if (runningAway != null) updateData.away_score_ft = runningAway;
    }

    if (phase === "finished_regulation" || phase === "finished_extra_time") {
      if (runningHome != null && runningAway != null) {
        if (runningHome > runningAway) updateData.winner_team_id = homeId;
        else if (runningAway > runningHome) updateData.winner_team_id = awayId;
      }
    } else if (phase === "finished_penalties") {
      const homePens = parseScore(home.shootoutScore ?? home.shootoutGoals);
      const awayPens = parseScore(away.shootoutScore ?? away.shootoutGoals);
      if (homePens != null && awayPens != null) {
        if (homePens > awayPens) updateData.winner_team_id = homeId;
        else if (awayPens > homePens) updateData.winner_team_id = awayId;
      }
    }

    const mode = winnerModeFor(phase);
    if (mode) updateData.winner_mode = mode;

    if (Object.keys(updateData).length === 1) continue;

    const result = await supabase.from("matches").update(updateData).eq("id", dbMatch.id);
    if (!result.error) {
      actuallyUpdated += 1;
      applied.push({ id: dbMatch.id, phase, status });
    }
  }

  return NextResponse.json({
    ok: true,
    source: "espn",
    seasonSlug: LIGA_2026_TOURNAMENT.seasonSlug,
    inWindow: windowedMatches.length,
    espnEventsTotal: espnEvents.length,
    matched,
    actuallyUpdated,
    applied,
  });
}
