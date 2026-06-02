export const TOURNAMENT_START_AT = "2026-06-11T00:00:00.000Z";

export function isChampionPickLocked(now = Date.now()) {
  return now >= new Date(TOURNAMENT_START_AT).getTime();
}
