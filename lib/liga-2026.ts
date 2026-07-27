import liga2026Data from "@/data/liga-2026.json";

type SeedTeam = {
  espnId: string;
  code: string;
  name: string;
};

type SeedZone = {
  letter: string;
  teams: SeedTeam[];
};

const zones = liga2026Data.zones as SeedZone[];

type TeamMeta = SeedTeam & { zoneLetter: string; flag: string; logoUrl: string };

const teamMetaByCode = new Map<string, TeamMeta>();
const teamMetaByEspnId = new Map<string, TeamMeta>();

for (const zone of zones) {
  for (const team of zone.teams) {
    const meta: TeamMeta = {
      ...team,
      zoneLetter: zone.letter,
      flag: "",
      logoUrl: `https://a.espncdn.com/i/teamlogos/soccer/500/${team.espnId}.png`,
    };
    teamMetaByCode.set(team.code, meta);
    teamMetaByEspnId.set(team.espnId, meta);
  }
}

export const LIGA_2026_TOURNAMENT = liga2026Data.tournament;

export const LIGA_2026_ZONES = zones;

export const LIGA_2026_TEAMS = Array.from(teamMetaByCode.values());

export function getLigaTeamMeta(code: string) {
  return teamMetaByCode.get(code);
}

export function getLigaTeamMetaByEspnId(espnId: string) {
  return teamMetaByEspnId.get(espnId);
}

export function getLigaZoneLabel(homeCode: string, awayCode: string, stageCode: string) {
  if (stageCode !== "group") {
    return undefined;
  }

  const home = teamMetaByCode.get(homeCode);
  const away = teamMetaByCode.get(awayCode);

  if (!home || !away) {
    return undefined;
  }

  if (home.zoneLetter !== away.zoneLetter) {
    return "Interzonal";
  }

  return `Zona ${home.zoneLetter}`;
}
