import { describe, expect, it } from "vitest";
import { deriveMarketStatus, deriveWinningOutcomeCode, isPickWindowOpen } from "@/lib/market-lifecycle";

describe("market lifecycle", () => {
  it("keeps market open before kickoff", () => {
    expect(
      deriveMarketStatus({
        currentStatus: "open",
        matchStatus: "scheduled",
        lockAt: "2030-01-01T00:00:00Z",
        hasWinningOutcome: false,
        now: new Date("2029-01-01T00:00:00Z").getTime(),
      }),
    ).toBe("open");
  });

  it("locks market after kickoff before live data arrives", () => {
    expect(
      deriveMarketStatus({
        currentStatus: "open",
        matchStatus: "scheduled",
        lockAt: "2020-01-01T00:00:00Z",
        hasWinningOutcome: false,
        now: new Date("2021-01-01T00:00:00Z").getTime(),
      }),
    ).toBe("locked");
  });

  it("reveals market when match goes live", () => {
    expect(
      deriveMarketStatus({
        currentStatus: "locked",
        matchStatus: "live",
        lockAt: "2020-01-01T00:00:00Z",
        hasWinningOutcome: false,
      }),
    ).toBe("revealed");
  });

  it("settles market when finished with winning outcome", () => {
    expect(
      deriveMarketStatus({
        currentStatus: "revealed",
        matchStatus: "finished",
        lockAt: "2020-01-01T00:00:00Z",
        hasWinningOutcome: true,
      }),
    ).toBe("settled");
  });

  it("keeps a finished market revealed until there is a winning outcome", () => {
    expect(
      deriveMarketStatus({
        currentStatus: "locked",
        matchStatus: "finished",
        lockAt: "2020-01-01T00:00:00Z",
        hasWinningOutcome: false,
      }),
    ).toBe("revealed");
  });

  it("derives 1x2 outcome from 90 minute score", () => {
    expect(
      deriveWinningOutcomeCode({
        marketType: "1x2",
        homeScore90: 2,
        awayScore90: 1,
        winnerTeamSide: null,
        status: "finished",
      }),
    ).toBe("home");

    expect(
      deriveWinningOutcomeCode({
        marketType: "1x2",
        homeScore90: 1,
        awayScore90: 1,
        winnerTeamSide: null,
        status: "finished",
      }),
    ).toBe("draw");
  });

  it("derives qualifies outcome from final winner", () => {
    expect(
      deriveWinningOutcomeCode({
        marketType: "qualifies",
        winnerTeamSide: "away",
        status: "finished",
      }),
    ).toBe("away_qualifies");
  });

  it("returns null when a finished qualifies market still has no winner", () => {
    expect(
      deriveWinningOutcomeCode({
        marketType: "qualifies",
        winnerTeamSide: null,
        status: "finished",
      }),
    ).toBeNull();
  });

  it("returns null for unfinished matches regardless of market type", () => {
    expect(
      deriveWinningOutcomeCode({
        marketType: "1x2",
        homeScore90: 1,
        awayScore90: 0,
        status: "live",
      }),
    ).toBeNull();

    expect(
      deriveWinningOutcomeCode({
        marketType: "qualifies",
        winnerTeamSide: "home",
        status: "scheduled",
      }),
    ).toBeNull();
  });
});

describe("isPickWindowOpen", () => {
  const kickoff = "2026-08-21T17:30:00.000Z";
  const beforeKickoff = new Date("2026-08-21T17:29:00.000Z").getTime();
  const afterKickoff = new Date("2026-08-21T17:31:00.000Z").getTime();

  it("stays open until the kickoff", () => {
    expect(
      isPickWindowOpen({ marketStatus: "open", matchStatus: "scheduled", lockAt: kickoff, now: beforeKickoff }),
    ).toBe(true);
  });

  it("closes at the kickoff even while the stored status still says open", () => {
    expect(
      isPickWindowOpen({ marketStatus: "open", matchStatus: "scheduled", lockAt: kickoff, now: afterKickoff }),
    ).toBe(false);
  });

  it("closes on a finished match the cron has not caught up with", () => {
    expect(
      isPickWindowOpen({ marketStatus: "open", matchStatus: "finished", lockAt: kickoff, now: beforeKickoff }),
    ).toBe(false);
  });

  it("closes on a live match", () => {
    expect(
      isPickWindowOpen({ marketStatus: "open", matchStatus: "live", lockAt: kickoff, now: beforeKickoff }),
    ).toBe(false);
  });

  it("stays closed once the market is locked, revealed or settled", () => {
    for (const marketStatus of ["locked", "revealed", "settled"] as const) {
      expect(
        isPickWindowOpen({ marketStatus, matchStatus: "scheduled", lockAt: kickoff, now: beforeKickoff }),
      ).toBe(false);
    }
  });

  it("stays open when no kickoff is recorded yet", () => {
    expect(
      isPickWindowOpen({ marketStatus: "open", matchStatus: "scheduled", lockAt: null, now: afterKickoff }),
    ).toBe(true);
  });
});
