import worldCup2026Data from "@/data/world-cup-2026.json";

type SeedTeam = {
  code: string;
  name: string;
  flag: string;
};

type SeedGroup = {
  letter: string;
  venues: string[];
  matchDays: [string, string, string];
  teams: [SeedTeam, SeedTeam, SeedTeam, SeedTeam];
};

type GroupStageFixture = {
  id: string;
  groupLetter: string;
  homeCode: string;
  awayCode: string;
  kickoffAt: string;
  venueCity: string;
};

const groups = worldCup2026Data.groups as SeedGroup[];

const matchSlots = [
  { time: "16:00:00Z", venueIndex: 0 },
  { time: "19:00:00Z", venueIndex: 1 },
  { time: "16:00:00Z", venueIndex: 1 },
  { time: "19:00:00Z", venueIndex: 2 },
  { time: "17:00:00Z", venueIndex: 2 },
  { time: "20:00:00Z", venueIndex: 0 },
] as const;

const pairingTemplate: Array<[number, number]> = [
  [0, 1],
  [2, 3],
  [1, 2],
  [0, 3],
  [3, 1],
  [2, 0],
];

const teamMetaByCode = new Map<string, SeedTeam & { groupLetter: string }>();

for (const group of groups) {
  for (const team of group.teams) {
    teamMetaByCode.set(team.code, { ...team, groupLetter: group.letter });
  }
}

export const WORLD_CUP_2026_GROUPS = groups;

export const WORLD_CUP_2026_TEAMS = Array.from(teamMetaByCode.values());

export const WORLD_CUP_2026_GROUP_FIXTURES: GroupStageFixture[] = groups.flatMap((group) =>
  pairingTemplate.map(([homeIndex, awayIndex], index) => {
    const slot = matchSlots[index];
    const day = group.matchDays[Math.floor(index / 2)];
    const home = group.teams[homeIndex];
    const away = group.teams[awayIndex];

    return {
      id: `${group.letter.toLowerCase()}-${home.code.toLowerCase()}-${away.code.toLowerCase()}`,
      groupLetter: group.letter,
      homeCode: home.code,
      awayCode: away.code,
      kickoffAt: `${day}T${slot.time}`,
      venueCity: group.venues[slot.venueIndex],
    };
  }),
);

export function getWorldCupTeamMeta(code: string) {
  return teamMetaByCode.get(code);
}

export function getWorldCupGroupLabel(homeCode: string, awayCode: string, stageCode: string) {
  if (stageCode !== "group") {
    return undefined;
  }

  const home = getWorldCupTeamMeta(homeCode);
  const away = getWorldCupTeamMeta(awayCode);

  if (!home || !away || home.groupLetter !== away.groupLetter) {
    return undefined;
  }

  return `Grupo ${home.groupLetter}`;
}

