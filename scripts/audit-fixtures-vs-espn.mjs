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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Faltan envs Supabase.");

const ESPN_TO_DB = { RSA: "ZAF", HAI: "HTI", URY: "URU" };
const norm = (c) => (c ? ESPN_TO_DB[c] ?? c : null);

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const espnUrl = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260630&limit=200";
const espnRes = await fetch(espnUrl, { cache: "no-store" });
if (!espnRes.ok) throw new Error(`ESPN ${espnRes.status}`);
const espnData = await espnRes.json();
const espnEvents = espnData.events ?? [];

const teams = await supabase.from("teams").select("id, fifa_code, name");
const teamById = new Map(teams.data.map((t) => [t.id, t]));
const teamByCode = new Map(teams.data.map((t) => [t.fifa_code, t]));

const stages = await supabase.from("tournament_stages").select("id, code");
const groupStageId = stages.data.find((s) => s.code === "group")?.id;

const matches = await supabase
  .from("matches")
  .select("id, external_id, kickoff_at, status, home_team_id, away_team_id, stage_id")
  .eq("stage_id", groupStageId);

const dbMatches = matches.data.map((m) => ({
  ...m,
  homeCode: teamById.get(m.home_team_id)?.fifa_code,
  awayCode: teamById.get(m.away_team_id)?.fifa_code,
}));

const pairKey = (a, b) => [a, b].sort().join("|");
const dbByUnorderedPair = new Map();
for (const m of dbMatches) {
  const key = pairKey(m.homeCode, m.awayCode);
  const list = dbByUnorderedPair.get(key) ?? [];
  list.push(m);
  dbByUnorderedPair.set(key, list);
}

const espnFlat = [];
for (const ev of espnEvents) {
  const comp = ev.competitions?.[0];
  if (!comp) continue;
  const h = comp.competitors.find((c) => c.homeAway === "home");
  const a = comp.competitors.find((c) => c.homeAway === "away");
  const homeCode = norm(h?.team?.abbreviation);
  const awayCode = norm(a?.team?.abbreviation);
  if (!homeCode || !awayCode) continue;
  espnFlat.push({
    eventId: ev.id,
    kickoff: ev.date,
    homeCode,
    awayCode,
    pairKey: pairKey(homeCode, awayCode),
  });
}

const ticketsAgg = await supabase
  .from("tickets")
  .select("id, match_market_id, match_markets!inner(match_id)");
const ticketsByMatch = new Map();
for (const t of ticketsAgg.data ?? []) {
  const mid = t.match_markets.match_id;
  ticketsByMatch.set(mid, (ticketsByMatch.get(mid) ?? 0) + 1);
}

const exactMatch = [];
const kickoffDrift = [];
const homeAwayFlip = [];
const pairingMismatch = [];
const espnUnmatched = [];
const dbUnmatched = [];

const usedDbIds = new Set();

for (const ev of espnFlat) {
  const candidates = dbByUnorderedPair.get(ev.pairKey) ?? [];
  if (!candidates.length) {
    espnUnmatched.push(ev);
    continue;
  }
  const best = candidates.reduce((acc, cur) => {
    const dAcc = Math.abs(new Date(acc.kickoff_at) - new Date(ev.kickoff));
    const dCur = Math.abs(new Date(cur.kickoff_at) - new Date(ev.kickoff));
    return dCur < dAcc ? cur : acc;
  });
  usedDbIds.add(best.id);
  const driftMs = Math.abs(new Date(best.kickoff_at) - new Date(ev.kickoff));
  const sameOrientation = best.homeCode === ev.homeCode && best.awayCode === ev.awayCode;
  const ticketCount = ticketsByMatch.get(best.id) ?? 0;
  const row = {
    dbId: best.id,
    espnId: ev.eventId,
    dbPair: `${best.homeCode}-${best.awayCode}`,
    espnPair: `${ev.homeCode}-${ev.awayCode}`,
    dbKickoff: best.kickoff_at,
    espnKickoff: ev.kickoff,
    dbStatus: best.status,
    ticketCount,
    driftHours: +(driftMs / 3_600_000).toFixed(1),
  };
  if (driftMs < 60_000 && sameOrientation) exactMatch.push(row);
  else if (driftMs < 60_000 && !sameOrientation) homeAwayFlip.push(row);
  else if (sameOrientation) kickoffDrift.push(row);
  else pairingMismatch.push(row);
}

for (const m of dbMatches) {
  if (!usedDbIds.has(m.id)) {
    dbUnmatched.push({
      dbId: m.id,
      pair: `${m.homeCode}-${m.awayCode}`,
      kickoff: m.kickoff_at,
      status: m.status,
      tickets: ticketsByMatch.get(m.id) ?? 0,
    });
  }
}

const print = (title, rows) => {
  console.log(`\n=== ${title} (${rows.length}) ===`);
  if (!rows.length) return;
  console.table(rows);
};

console.log(`ESPN devolvió ${espnEvents.length} eventos, ${espnFlat.length} con par válido.`);
console.log(`DB tiene ${dbMatches.length} partidos de grupo.`);
print("EXACT (par + kickoff coinciden, no tocar)", exactMatch);
print("KICKOFF DRIFT (mismo par, fecha distinta — sync hubiera fixeado)", kickoffDrift);
print("HOME/AWAY FLIP (par OK, lado invertido)", homeAwayFlip);
print("PAIRING MISMATCH (par OK por equipos pero fecha + orientación distinta)", pairingMismatch);
print("DB sin contraparte en ESPN (estos partidos NO existen en la realidad)", dbUnmatched);
print("ESPN sin contraparte en DB (faltan en el seed)", espnUnmatched);

const totalTicketsAtRisk =
  kickoffDrift.reduce((s, r) => s + r.ticketCount, 0) +
  homeAwayFlip.reduce((s, r) => s + r.ticketCount, 0) +
  pairingMismatch.reduce((s, r) => s + r.ticketCount, 0) +
  dbUnmatched.reduce((s, r) => s + r.tickets, 0);
console.log(`\nTickets afectados por cambios: ${totalTicketsAtRisk}`);
