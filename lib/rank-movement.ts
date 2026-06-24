import type { RankingTimeline } from "@/lib/domain";

export type RankMovement = number | null;

type CurrentStanding = {
  name: string;
  position: number;
};

function rankByGrossAt(timeline: RankingTimeline, matchIndex: number) {
  if (matchIndex < 0) return null;

  const ordered = timeline.entries
    .map((entry) => ({ name: entry.userName, value: entry.points[matchIndex] ?? 0 }))
    .sort((left, right) => right.value - left.value);

  const positionByName = new Map<string, number>();
  ordered.forEach((row, index) => positionByName.set(row.name, index + 1));
  return positionByName;
}

export function computeRankMovement(
  standings: CurrentStanding[],
  timeline: RankingTimeline | null | undefined,
): Record<string, RankMovement> {
  const movement: Record<string, RankMovement> = {};
  for (const standing of standings) {
    movement[standing.name] = null;
  }

  if (!timeline || timeline.matchLabels.length < 2) {
    return movement;
  }

  const previousPositions = rankByGrossAt(timeline, timeline.matchLabels.length - 2);
  if (!previousPositions) return movement;

  for (const standing of standings) {
    const previousPosition = previousPositions.get(standing.name);
    if (previousPosition == null) continue;
    movement[standing.name] = previousPosition - standing.position;
  }

  return movement;
}
