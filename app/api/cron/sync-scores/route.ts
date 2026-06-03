import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FD_TO_DB: Record<string, string> = {
  RSA: "ZAF",
  HAI: "HTI",
  URY: "URU",
};

const FD_STAGE_TO_DB: Record<string, string> = {
  GROUP_STAGE: "group",
  LAST_32: "round_of_32",
  LAST_16: "round_of_16",
  QUARTER_FINALS: "quarter_final",
  SEMI_FINALS: "semi_final",
  THIRD_PLACE: "third_place",
  FINAL: "final",
};

const FD_COMPETITION = "WC";
const FD_BASE = "https://api.football-data.org/v4";

type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
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

function mapStatus(fdStatus: string): { dbStatus: string | null; isFinal: boolean } {
  switch (fdStatus) {
    case "FINISHED":
    case "AWARDED":
      return { dbStatus: "finished", isFinal: true };
    case "IN_PLAY":
    case "PAUSED":
    case "EXTRA_TIME":
    case "PENALTY_SHOOTOUT":
    case "LIVE":
      return { dbStatus: "live", isFinal: false };
    case "POSTPONED":
      return { dbStatus: "postponed", isFinal: false };
    case "SUSPENDED":
    case "CANCELLED":
      return { dbStatus: "cancelled", isFinal: false };
    default:
      return { dbStatus: null, isFinal: false };
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

  const stagesQuery = await supabase.from("tournament_stages").select("id, code");
  if (stagesQuery.error || !stagesQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se pudieron cargar stages." }, { status: 500 });
  }
  const stageIdByCode = new Map(stagesQuery.data.map((s) => [s.code, s.id]));

  const dbMatchesQuery = await supabase
    .from("matches")
    .select("id, kickoff_at, home_team_id, away_team_id, status, home_score_ft, away_score_ft");
  if (dbMatchesQuery.error || !dbMatchesQuery.data) {
    return NextResponse.json({ ok: false, reason: "No se pudieron cargar matches." }, { status: 500 });
  }

  const dbByPair = new Map<string, (typeof dbMatchesQuery.data)[number][]>();
  for (const m of dbMatchesQuery.data) {
    const key = `${m.home_team_id}|${m.away_team_id}`;
    const list = dbByPair.get(key) ?? [];
    list.push(m);
    dbByPair.set(key, list);
  }

  const updates: { id: string; status: string | null; home_score_ft: number | null; away_score_ft: number | null; winner_team_id: string | null }[] = [];
  const inserts: { fd: FdMatch; homeId: string; awayId: string; stageCode: string }[] = [];
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
    const candidates = dbByPair.get(`${homeId}|${awayId}`);
    if (!candidates || !candidates.length) {
      const stageCode = FD_STAGE_TO_DB[fd.stage as keyof typeof FD_STAGE_TO_DB];
      if (stageCode && stageCode !== "group") {
        inserts.push({ fd, homeId, awayId, stageCode });
      } else {
        skipped += 1;
      }
      continue;
    }
    const fdTime = new Date(fd.utcDate).getTime();
    const dbMatch = candidates.length === 1
      ? candidates[0]
      : candidates.reduce((best, cur) => {
          const dBest = Math.abs(new Date(best.kickoff_at).getTime() - fdTime);
          const dCur = Math.abs(new Date(cur.kickoff_at).getTime() - fdTime);
          return dCur < dBest ? cur : best;
        });
    if (dbMatch.status === "settled" || (dbMatch.status === "finished" && dbMatch.home_score_ft != null)) {
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

  let insertedMatches = 0;
  for (const ins of inserts) {
    const stageId = stageIdByCode.get(ins.stageCode);
    if (!stageId) continue;
    const homeCode = normalizeTla(ins.fd.homeTeam.tla);
    const awayCode = normalizeTla(ins.fd.awayTeam.tla);
    const matchId = `${ins.stageCode}-${(homeCode ?? "").toLowerCase()}-${(awayCode ?? "").toLowerCase()}-${ins.fd.id}`;
    const matchInsert = await supabase.from("matches").insert({
      id: matchId,
      external_id: String(ins.fd.id),
      stage_id: stageId,
      home_team_id: ins.homeId,
      away_team_id: ins.awayId,
      kickoff_at: ins.fd.utcDate,
      status: "scheduled",
    });
    if (matchInsert.error) continue;

    const marketInsert = await supabase
      .from("match_markets")
      .insert({
        match_id: matchId,
        market_type: "qualifies",
        lock_at: ins.fd.utcDate,
        status: "open",
      })
      .select("id")
      .single<{ id: string }>();
    if (marketInsert.error || !marketInsert.data) continue;

    await supabase.from("market_outcomes").upsert(
      [
        { match_market_id: marketInsert.data.id, code: "home_qualifies", label: "Clasifica local", sort_order: 10 },
        { match_market_id: marketInsert.data.id, code: "away_qualifies", label: "Clasifica visitante", sort_order: 20 },
      ],
      { onConflict: "match_market_id,code" },
    );

    insertedMatches += 1;
  }

  const kickoffByMatchId = new Map<string, string>();
  for (const fd of fdMatches) {
    const homeCode = normalizeTla(fd.homeTeam.tla);
    const awayCode = normalizeTla(fd.awayTeam.tla);
    if (!homeCode || !awayCode) continue;
    const homeId = teamByCode.get(homeCode);
    const awayId = teamByCode.get(awayCode);
    if (!homeId || !awayId) continue;
    const candidates = dbByPair.get(`${homeId}|${awayId}`);
    if (candidates && candidates.length === 1) {
      kickoffByMatchId.set(candidates[0].id, fd.utcDate);
    }
  }

  let actuallyUpdated = 0;
  for (const u of updates) {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (u.status) updateData.status = u.status;
    if (u.home_score_ft != null) updateData.home_score_ft = u.home_score_ft;
    if (u.away_score_ft != null) updateData.away_score_ft = u.away_score_ft;
    if (u.winner_team_id) updateData.winner_team_id = u.winner_team_id;
    if (Object.keys(updateData).length === 1) continue;
    const res = await supabase.from("matches").update(updateData).eq("id", u.id);
    if (!res.error) actuallyUpdated += 1;
  }

  let kickoffSynced = 0;
  for (const m of dbMatchesQuery.data) {
    const fdKickoff = kickoffByMatchId.get(m.id);
    if (!fdKickoff) continue;
    const current = new Date(m.kickoff_at).getTime();
    const incoming = new Date(fdKickoff).getTime();
    if (Math.abs(current - incoming) < 60_000) continue;
    const res = await supabase
      .from("matches")
      .update({ kickoff_at: fdKickoff, updated_at: new Date().toISOString() })
      .eq("id", m.id);
    if (!res.error) {
      await supabase.from("match_markets").update({ lock_at: fdKickoff }).eq("match_id", m.id);
      kickoffSynced += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    fdMatchesTotal: fdMatches.length,
    matched: updates.length,
    skipped,
    alreadySettled,
    actuallyUpdated,
    insertedMatches,
    kickoffSynced,
    updated: updates
      .filter((u) => u.status || u.home_score_ft != null)
      .map((u) => ({ id: u.id, status: u.status, score: `${u.home_score_ft ?? "-"}:${u.away_score_ft ?? "-"}` })),
  });
}
