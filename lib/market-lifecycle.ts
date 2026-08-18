export type MatchLifecycleStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";
export type MarketLifecycleStatus = "open" | "locked" | "revealed" | "settled";

export function deriveMarketStatus(params: {
  currentStatus: MarketLifecycleStatus;
  matchStatus: MatchLifecycleStatus;
  lockAt?: string | null;
  hasWinningOutcome: boolean;
  now?: number;
}) {
  const { currentStatus, matchStatus, lockAt, hasWinningOutcome, now = Date.now() } = params;
  const lockTime = lockAt ? new Date(lockAt).getTime() : null;
  const kickoffPassed = lockTime != null ? lockTime <= now : false;

  if (hasWinningOutcome && matchStatus === "finished") {
    return "settled" as const;
  }

  if (matchStatus === "live") {
    return "revealed" as const;
  }

  if (matchStatus === "finished") {
    return currentStatus === "settled" ? "settled" : "revealed";
  }

  if (kickoffPassed) {
    return "locked" as const;
  }

  return "open" as const;
}

export function deriveWinningOutcomeCode(params: {
  marketType: "1x2" | "qualifies";
  homeScore90?: number | null;
  awayScore90?: number | null;
  winnerTeamSide?: "home" | "away" | null;
  status: MatchLifecycleStatus;
}) {
  const { marketType, homeScore90, awayScore90, winnerTeamSide, status } = params;

  if (status !== "finished") {
    return null;
  }

  if (marketType === "1x2") {
    if (homeScore90 == null || awayScore90 == null) {
      return null;
    }

    if (homeScore90 > awayScore90) {
      return "home";
    }

    if (awayScore90 > homeScore90) {
      return "away";
    }

    return "draw";
  }

  if (winnerTeamSide === "home") {
    return "home_qualifies";
  }

  if (winnerTeamSide === "away") {
    return "away_qualifies";
  }

  return null;
}

export function isPickWindowOpen(params: {
  marketStatus: MarketLifecycleStatus;
  matchStatus: MatchLifecycleStatus;
  lockAt?: string | null;
  now?: number;
}) {
  const { marketStatus, matchStatus, lockAt, now = Date.now() } = params;

  if (marketStatus !== "open") {
    return false;
  }

  if (matchStatus !== "scheduled") {
    return false;
  }

  return lockAt == null || new Date(lockAt).getTime() > now;
}
