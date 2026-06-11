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
};

type EspnEvent = {
  id: string;
  date: string;
  status: {
    type: {
      state: "pre" | "in" | "post";
      completed: boolean;
      name: string;
    };
  };
  competitions: { competitors: EspnCompetitor[] }[];
};

function normalizeCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return ESPN_TO_DB[code] ?? code;
}

function mapStatus(state: string, completed: boolean): { dbStatus: string | null; isFinal: boolean } {
  if (state === "post" && completed) return { dbStatus: "finished", isFinal: true };
  if (state === "in") return { dbStatus: "live", isFinal: false };
  if (state === "pre") return { dbStatus: null, isFinal: false };
  return { dbStatus: null, isFinal: false };
}

function parseScore(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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

  const updates: {
    id: string;
    status: string | null;
    home_score_ft: number | null;
    away_score_ft: number | null;
    winner_team_id: string | null;
  }[] = [];
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
    const candidates = dbByPair.get(`${homeId}|${awayId}`);
    if (!candidates || !candidates.length) {
      skipped += 1;
      continue;
    }
    const espnTime = new Date(ev.date).getTime();
    const dbMatch = candidates.length === 1
      ? candidates[0]
      : candidates.reduce((best, cur) => {
          const dBest = Math.abs(new Date(best.kickoff_at).getTime() - espnTime);
          const dCur = Math.abs(new Date(cur.kickoff_at).getTime() - espnTime);
          return dCur < dBest ? cur : best;
        });
    if (dbMatch.status === "settled" || (dbMatch.status === "finished" && dbMatch.home_score_ft != null)) {
      alreadySettled += 1;
      continue;
    }

    const { dbStatus, isFinal } = mapStatus(ev.status.type.state, ev.status.type.completed);
    const isLiveOrFinal = ev.status.type.state === "in" || ev.status.type.state === "post";
    const homeScore = isLiveOrFinal ? parseScore(home.score) : null;
    const awayScore = isLiveOrFinal ? parseScore(away.score) : null;
    let winnerTeamId: string | null = null;
    if (isFinal && homeScore != null && awayScore != null) {
      if (homeScore > awayScore) winnerTeamId = homeId;
      else if (awayScore > homeScore) winnerTeamId = awayId;
    }
    updates.push({
      id: dbMatch.id,
      status: dbStatus,
      home_score_ft: homeScore ?? dbMatch.home_score_ft,
      away_score_ft: awayScore ?? dbMatch.away_score_ft,
      winner_team_id: winnerTeamId,
    });

    kickoffByMatchId.set(dbMatch.id, ev.date);
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
      .filter((u) => u.status || u.home_score_ft != null)
      .map((u) => ({ id: u.id, status: u.status, score: `${u.home_score_ft ?? "-"}:${u.away_score_ft ?? "-"}` })),
  });
}
