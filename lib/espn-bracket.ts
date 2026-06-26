import worldCup2026Data from "@/data/world-cup-2026.json";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026";
const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260720&limit=80";

const ESPN_TO_DB: Record<string, string> = { RSA: "ZAF", HAI: "HTI", URY: "URU" };

const flagByCode = new Map(
  (worldCup2026Data as { groups: { teams: { code: string; flag: string }[] }[] }).groups
    .flatMap((group) => group.teams)
    .map((team) => [team.code, team.flag]),
);
const flagFor = (abbreviation: string) => flagByCode.get(ESPN_TO_DB[abbreviation] ?? abbreviation) ?? "";

const ROUND_DEFS: { key: string; label: string; slugs: string[] }[] = [
  { key: "r32", label: "16vos", slugs: ["round-of-32"] },
  { key: "r16", label: "8vos", slugs: ["round-of-16"] },
  { key: "qf", label: "4tos", slugs: ["quarterfinals"] },
  { key: "sf", label: "Semis", slugs: ["semifinals"] },
  { key: "final", label: "Final", slugs: ["final", "3rd-place-match"] },
];

export type StandingRow = {
  rank: number;
  name: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  goalsFor: number;
  points: number;
  advanced: boolean;
};

export type GroupStanding = {
  label: string;
  complete: boolean;
  rows: StandingRow[];
};

export type BracketSlot = {
  text: string;
  flag: string;
  resolved: boolean;
};

export type BracketMatch = {
  date: string;
  title: string | null;
  third: boolean;
  home: BracketSlot;
  away: BracketSlot;
  fullyResolved: boolean;
};

export type KnockoutRound = {
  key: string;
  label: string;
  matches: BracketMatch[];
};

export type BracketData = {
  available: boolean;
  groups: GroupStanding[];
  groupsComplete: number;
  rounds: KnockoutRound[];
};

type ScoreboardEvent = {
  date: string;
  name?: string;
  season?: { slug?: string };
  competitions: { competitors: { homeAway: string; team?: { abbreviation?: string; displayName?: string } }[] }[];
};

async function loadSpanishNames() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return new Map<string, string>();
  const { data } = await supabase.from("teams").select("name, fifa_code");
  return new Map((data ?? []).map((team) => [team.fifa_code, team.name]));
}

function statValue(entry: { stats: { name: string; value: number }[] }, name: string) {
  return entry.stats.find((stat) => stat.name === name)?.value ?? 0;
}

function buildGroups(
  payload: { children?: { name: string; standings: { entries: { team: { abbreviation: string; displayName: string }; stats: { name: string; value: number }[] }[] } }[] },
  nameByCode: Map<string, string>,
): GroupStanding[] {
  const toSpanish = (abbreviation: string, fallback: string) =>
    nameByCode.get(ESPN_TO_DB[abbreviation] ?? abbreviation) ?? fallback;

  return (payload.children ?? []).map((group) => {
    const rows = group.standings.entries
      .map((entry) => ({
        rank: statValue(entry, "rank"),
        name: toSpanish(entry.team.abbreviation, entry.team.displayName),
        flag: flagFor(entry.team.abbreviation),
        played: statValue(entry, "gamesPlayed"),
        won: statValue(entry, "wins"),
        drawn: statValue(entry, "ties"),
        lost: statValue(entry, "losses"),
        goalDiff: statValue(entry, "pointDifferential"),
        goalsFor: statValue(entry, "pointsFor"),
        points: statValue(entry, "points"),
        advanced: statValue(entry, "advanced") === 1,
      }))
      .sort((left, right) => left.rank - right.rank);

    return {
      label: group.name.replace("Group", "Grupo"),
      complete: rows.every((row) => row.played >= 3),
      rows,
    };
  });
}

function slotFromCompetitor(
  competitor: { team?: { abbreviation?: string; displayName?: string } },
  nameByCode: Map<string, string>,
): BracketSlot {
  const abbreviation = competitor.team?.abbreviation ?? "";
  const displayName = competitor.team?.displayName ?? "";

  const realName = nameByCode.get(ESPN_TO_DB[abbreviation] ?? abbreviation);
  if (realName) return { text: realName, flag: flagFor(abbreviation), resolved: true };

  const winnerMatch = abbreviation.match(/^1([A-L])$/);
  if (winnerMatch) return { text: `Ganador Grupo ${winnerMatch[1]}`, flag: "", resolved: false };

  const runnerMatch = abbreviation.match(/^2([A-L])$/);
  if (runnerMatch) return { text: `2º Grupo ${runnerMatch[1]}`, flag: "", resolved: false };

  if (abbreviation === "3RD" || /3rd place/i.test(displayName)) {
    const groupsMatch = displayName.match(/Group ([A-L/]+)/);
    return { text: `3º (${groupsMatch ? groupsMatch[1] : "?"})`, flag: "", resolved: false };
  }

  return { text: "Por definir", flag: "", resolved: false };
}

function buildRounds(events: ScoreboardEvent[], nameByCode: Map<string, string>): KnockoutRound[] {
  return ROUND_DEFS.map((definition) => {
    const matches = events
      .filter((event) => definition.slugs.includes(event.season?.slug ?? ""))
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((event) => {
        const competitors = event.competitions[0].competitors;
        const home = slotFromCompetitor(competitors.find((competitor) => competitor.homeAway === "home") ?? {}, nameByCode);
        const away = slotFromCompetitor(competitors.find((competitor) => competitor.homeAway === "away") ?? {}, nameByCode);
        const isThirdPlace = (event.season?.slug ?? "") === "3rd-place-match";
        return {
          date: event.date,
          title: isThirdPlace ? "3er puesto" : null,
          third: isThirdPlace,
          home,
          away,
          fullyResolved: home.resolved && away.resolved,
        };
      });
    return { key: definition.key, label: definition.label, matches };
  }).filter((round) => round.matches.length > 0);
}

export async function getBracketData(): Promise<BracketData> {
  const empty: BracketData = { available: false, groups: [], groupsComplete: 0, rounds: [] };

  try {
    const [nameByCode, standingsResponse, scoreboardResponse] = await Promise.all([
      loadSpanishNames(),
      fetch(STANDINGS_URL, { next: { revalidate: 300 } }),
      fetch(SCOREBOARD_URL, { next: { revalidate: 300 } }),
    ]);

    if (!standingsResponse.ok) return empty;

    const groups = buildGroups(await standingsResponse.json(), nameByCode);
    const rounds = scoreboardResponse.ok
      ? buildRounds((await scoreboardResponse.json()).events ?? [], nameByCode)
      : [];

    return {
      available: groups.length > 0,
      groups,
      groupsComplete: groups.filter((group) => group.complete).length,
      rounds,
    };
  } catch {
    return empty;
  }
}
