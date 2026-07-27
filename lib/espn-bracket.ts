import { LIGA_2026_TOURNAMENT } from "@/lib/liga-2026";

const LEAGUE = LIGA_2026_TOURNAMENT.leagueCode;
const YEAR = LIGA_2026_TOURNAMENT.year;

const STANDINGS_URL = `https://site.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/standings?season=${YEAR}`;
const SCOREBOARD_URL = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/scoreboard?limit=100`;

const ZONE_QUALIFIERS = 8;
const ZONE_ROUNDS = 16;

const ROUND_DEFS: { key: string; label: string; slugs: string[] }[] = [
  { key: "r16", label: "8vos", slugs: ["round-of-16", "octavos-de-final"] },
  { key: "qf", label: "4tos", slugs: ["quarterfinals", "cuartos-de-final"] },
  { key: "sf", label: "Semis", slugs: ["semifinals", "semifinales"] },
  { key: "final", label: "Final", slugs: ["final"] },
];

const crestUrl = (espnId: string | undefined) =>
  espnId ? `https://a.espncdn.com/i/teamlogos/soccer/500/${espnId}.png` : "";

export type StandingRow = {
  rank: number;
  name: string;
  flag: string;
  logo: string;
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
  logo: string;
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

type StandingsEntry = {
  team: { id?: string; displayName: string };
  stats: { name: string; value: number }[];
};

type StandingsChild = {
  name: string;
  standings: { entries: StandingsEntry[] };
};

type ScoreboardEvent = {
  date: string;
  season?: { slug?: string };
  competitions: { competitors: { homeAway: string; team?: { id?: string; displayName?: string } }[] }[];
};

function statValue(entry: StandingsEntry, name: string) {
  return entry.stats.find((stat) => stat.name === name)?.value ?? 0;
}

function zoneLabel(name: string) {
  return name.replace(/group/i, "Zona").trim();
}

function buildGroups(payload: { children?: StandingsChild[] }): GroupStanding[] {
  return (payload.children ?? []).map((child) => {
    const rows = child.standings.entries
      .map((entry) => ({
        rank: statValue(entry, "rank"),
        name: entry.team.displayName,
        flag: "",
        logo: crestUrl(entry.team.id),
        played: statValue(entry, "gamesPlayed"),
        won: statValue(entry, "wins"),
        drawn: statValue(entry, "ties"),
        lost: statValue(entry, "losses"),
        goalDiff: statValue(entry, "pointDifferential"),
        goalsFor: statValue(entry, "pointsFor"),
        points: statValue(entry, "points"),
        advanced: statValue(entry, "advanced") === 1 || statValue(entry, "rank") <= ZONE_QUALIFIERS,
      }))
      .sort((left, right) => left.rank - right.rank);

    return {
      label: zoneLabel(child.name),
      complete: rows.length > 0 && rows.every((row) => row.played >= ZONE_ROUNDS),
      rows,
    };
  });
}

function slotFromCompetitor(competitor: { team?: { id?: string; displayName?: string } }): BracketSlot {
  const displayName = competitor.team?.displayName ?? "";
  if (displayName) return { text: displayName, flag: "", logo: crestUrl(competitor.team?.id), resolved: true };
  return { text: "Por definir", flag: "", logo: "", resolved: false };
}

function buildRounds(events: ScoreboardEvent[]): KnockoutRound[] {
  return ROUND_DEFS.map((definition) => {
    const matches = events
      .filter((event) => definition.slugs.includes(event.season?.slug ?? ""))
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((event) => {
        const competitors = event.competitions[0].competitors;
        const home = slotFromCompetitor(competitors.find((competitor) => competitor.homeAway === "home") ?? {});
        const away = slotFromCompetitor(competitors.find((competitor) => competitor.homeAway === "away") ?? {});
        return {
          date: event.date,
          title: null,
          third: false,
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
    const [standingsResponse, scoreboardResponse] = await Promise.all([
      fetch(STANDINGS_URL, { next: { revalidate: 300 } }),
      fetch(SCOREBOARD_URL, { next: { revalidate: 300 } }),
    ]);

    if (!standingsResponse.ok) return empty;

    const groups = buildGroups(await standingsResponse.json());
    const rounds = scoreboardResponse.ok ? buildRounds((await scoreboardResponse.json()).events ?? []) : [];

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
