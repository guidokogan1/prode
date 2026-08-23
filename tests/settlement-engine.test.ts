import { describe, expect, it } from "vitest";
import { computeLeaderboard, computeMarketSettlements } from "@/lib/settlement-engine";

describe("settlement engine", () => {
  it("computes market settlements for winners and losers", () => {
    const result = computeMarketSettlements(
      [
        { ticketId: "t1", outcomeCode: "home", amount: 7000 },
        { ticketId: "t2", outcomeCode: "home", amount: 3000 },
        { ticketId: "t3", outcomeCode: "away", amount: 10000 },
      ],
      "home",
    );

    expect(result.totalPool).toBe(20000);
    expect(result.winningPool).toBe(10000);
    expect(result.rows).toEqual([
      {
        ticketId: "t1",
        winningBetAmount: 7000,
        grossReturnAmount: 14000,
        netResultAmount: 4000,
      },
      {
        ticketId: "t2",
        winningBetAmount: 3000,
        grossReturnAmount: 6000,
        netResultAmount: -4000,
      },
      {
        ticketId: "t3",
        winningBetAmount: 0,
        grossReturnAmount: 0,
        netResultAmount: -10000,
      },
    ]);
  });

  it("pays nobody when nobody bet the winning outcome", () => {
    const result = computeMarketSettlements(
      [
        { ticketId: "t1", outcomeCode: "home", amount: 10000 },
        { ticketId: "t2", outcomeCode: "draw", amount: 10000 },
      ],
      "away",
    );

    expect(result.winningPool).toBe(0);
    expect(result.rows).toEqual([
      { ticketId: "t1", winningBetAmount: 0, grossReturnAmount: 0, netResultAmount: -10000 },
      { ticketId: "t2", winningBetAmount: 0, grossReturnAmount: 0, netResultAmount: -10000 },
    ]);
  });

  it("preserves decimal precision in uneven pool splits", () => {
    const result = computeMarketSettlements(
      [
        { ticketId: "t1", outcomeCode: "home", amount: 3333 },
        { ticketId: "t2", outcomeCode: "home", amount: 3333 },
        { ticketId: "t3", outcomeCode: "away", amount: 3334 },
      ],
      "home",
    );

    expect(result.totalPool).toBe(10000);
    expect(result.winningPool).toBe(6666);
    expect(result.rows[0]?.grossReturnAmount).toBe(5000);
    expect(result.rows[2]?.netResultAmount).toBe(-10000);
  });

  it("returns an empty leaderboard when there are no rows", () => {
    expect(computeLeaderboard([])).toEqual([]);
  });

  it("orders leaderboard by net, then positive tickets, then best hit", () => {
    const leaderboard = computeLeaderboard([
      { userId: "u1", displayName: "Guido", netResultAmount: 5000 },
      { userId: "u1", displayName: "Guido", netResultAmount: -2000 },
      { userId: "u2", displayName: "Mari", netResultAmount: 3000 },
      { userId: "u2", displayName: "Mari", netResultAmount: 0 },
      { userId: "u3", displayName: "Bato", netResultAmount: 3000 },
      { userId: "u3", displayName: "Bato", netResultAmount: 1000 },
    ]);

    expect(leaderboard.map((row) => row.name)).toEqual(["Bato", "Guido", "Mari"]);
    expect(leaderboard[0].netLabel).toBe("+$4.000");
    expect(leaderboard[1].bestHit).toBe("+$5.000");
  });

  it("counts a hit that paid exactly the credit back", () => {
    const leaderboard = computeLeaderboard([
      { userId: "u1", displayName: "Todos", netResultAmount: 0, stakeAmount: 10000, isHit: true },
      { userId: "u2", displayName: "Erro", netResultAmount: -10000, stakeAmount: 10000, isHit: false },
    ]);

    expect(leaderboard.find((row) => row.name === "Todos")?.positiveTicketsCount).toBe(1);
    expect(leaderboard.find((row) => row.name === "Erro")?.positiveTicketsCount).toBe(0);
  });

  it("breaks ties first by positive tickets and then by best single hit", () => {
    const leaderboard = computeLeaderboard([
      { userId: "u1", displayName: "Ana", netResultAmount: 3000 },
      { userId: "u1", displayName: "Ana", netResultAmount: -1000 },
      { userId: "u2", displayName: "Bruno", netResultAmount: 2000 },
      { userId: "u2", displayName: "Bruno", netResultAmount: 0 },
      { userId: "u3", displayName: "Caro", netResultAmount: 1500 },
      { userId: "u3", displayName: "Caro", netResultAmount: 500 },
    ]);

    expect(leaderboard.map((row) => row.name)).toEqual(["Caro", "Ana", "Bruno"]);
    expect(leaderboard[0]?.positiveTicketsCount).toBe(2);
    expect(leaderboard[1]?.bestHit).toBe("+$3.000");
  });
});
