import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FD_TO_DB: Record<string, string> = {
  RSA: "ZAF",
  HAI: "HTI",
  URY: "URU",
};

const FD_COMPETITION = "WC";
const FD_BASE = "https://api.football-data.org/v4";

type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { tla: string | null };
  awayTeam: { tla: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    winner: string | null;
  };
};

function normalizeTla(tla: string | null | undefined): string | null {
  if (!tla) return null;
  return FD_TO_DB[tla] ?? tla;
}

function mapStatus(fdStatus: string): { dbStatus: string; isFinal: boolean } {
  switch (fdStatus) {
    case "FINISHED":
    case "AWARDED":
      return { dbStatus: "final", isFinal: true };
    case "IN_PLAY":
    case "PAUSED":
    case "EXTRA_TIME":
    case "PENALTY_SHOOTOUT":
    case "LIVE":
      return { dbStatus: "live", isFinal: false };
    case "TIMED":
    case "SCHEDULED":
      return { dbStatus: "scheduled", isFinal: false };
    case "POSTPONED":
    case "SUSPENDED":
    case "CANCELLED":
      return { dbStatus: "postponed", isFinal: false };
    default:
      return { dbStatus: "scheduled", isFinal: false };
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const fdToken = process.env.FOOTBALL_DATA_TOKEN;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }

  if (!fdToken) {
    return NextResponse.json({ ok: false, reason: "FOOTBALL_DATA_TOKEN no configurado." }, { status: 500 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }

  const fdResponse = await fetch(`${FD_BASE}/competitions/${FD_COMPETITION}/matches`, {
    headers: { "X-Auth-Token": fdToken },
    cache: "no-store",
  });

  if (!fdResponse.ok) {
    return NextResponse.json({ ok: false, reason: `football-data ${fdResponse.status}` }, { status: 502 });
  }

  const fdPayload = (await fdResponse.json()) as { matches?: FdMatch[] };
  const fdMatches = fdPayload.matches ?? [];

  const teamsQuery = await supabase.from("teams").select("id, fifa_code");
  if (teamsQuery.error || !teamsQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se pudieron cargar teams." }, { status: 500 });
  }
  const teamByCode = new Map(teamsQuery.data.map((t) => [t.fifa_code, t.id]));

  const dbMatchesQuery = await supabase
    .from("matches")
    .select("id, kickoff_at, home_team_id, away_team_id, status, home_score_ft, away_score_ft");
  if (dbMatchesQuery.error || !dbMatchesQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se pudieron cargar matches." }, { status: 500 });
  }

  const dbByPair = new Map<string, (typeof dbMatchesQuery.data)[number]>();
  for (const m of dbMatchesQuery.data) {
    const key = `${m.home_team_id}|${m.away_team_id}|${new Date(m.kickoff_at).toISOString().slice(0, 10)}`;
    dbByPair.set(key, m);
  }

  const updates: { id: string; status: string; home_score_ft: number | null; away_score_ft: number | null; winner_team_id: string | null }[] = [];
  let skipped = 0;
  let alreadySettled = 0;

  for (const fd of fdMatches) {
    const homeCode = normalizeTla(fd.homeTeam.tla);
    const awayCode = normalizeTla(fd.awayTeam.tla);
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
    const dateKey = new Date(fd.utcDate).toISOString().slice(0, 10);
    const dbMatch = dbByPair.get(`${homeId}|${awayId}|${dateKey}`);
    if (!dbMatch) {
      skipped += 1;
      continue;
    }
    if (dbMatch.status === "final" && dbMatch.home_score_ft != null) {
      alreadySettled += 1;
      continue;
    }
    const { dbStatus, isFinal } = mapStatus(fd.status);
    const homeScore = fd.score.fullTime.home ?? fd.score.halfTime.home ?? null;
    const awayScore = fd.score.fullTime.away ?? fd.score.halfTime.away ?? null;
    let winnerTeamId: string | null = null;
    if (isFinal && homeScore != null && awayScore != null) {
      if (homeScore > awayScore) winnerTeamId = homeId;
      else if (awayScore > homeScore) winnerTeamId = awayId;
    }
    updates.push({
      id: dbMatch.id,
      status: dbStatus,
      home_score_ft: isFinal ? homeScore : dbMatch.home_score_ft,
      away_score_ft: isFinal ? awayScore : dbMatch.away_score_ft,
      winner_team_id: winnerTeamId,
    });
  }

  for (const u of updates) {
    const updateData: Record<string, unknown> = { status: u.status, updated_at: new Date().toISOString() };
    if (u.home_score_ft != null) updateData.home_score_ft = u.home_score_ft;
    if (u.away_score_ft != null) updateData.away_score_ft = u.away_score_ft;
    if (u.winner_team_id) updateData.winner_team_id = u.winner_team_id;
    await supabase.from("matches").update(updateData).eq("id", u.id);
  }

  return NextResponse.json({
    ok: true,
    fdMatchesTotal: fdMatches.length,
    matched: updates.length,
    skipped,
    alreadySettled,
    updated: updates.map((u) => ({ id: u.id, status: u.status, score: `${u.home_score_ft ?? "-"}:${u.away_score_ft ?? "-"}` })),
  });
}
