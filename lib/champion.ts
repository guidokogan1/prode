export const TOURNAMENT_START_AT = "2026-06-11T00:00:00.000Z";
export const CHAMPION_CREDIT = 10000;

export function isChampionPickLocked(now = Date.now()) {
  return now >= new Date(TOURNAMENT_START_AT).getTime();
}

function getChampionLatePickNames() {
  return (process.env.CHAMPION_LATE_PICK_NAMES ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

export function isChampionPickAllowedFor(displayName: string | null | undefined, now = Date.now()) {
  if (!isChampionPickLocked(now)) {
    return true;
  }

  if (!displayName) {
    return false;
  }

  return getChampionLatePickNames().includes(displayName.trim().toLowerCase());
}
