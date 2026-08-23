import { describe, expect, it } from "vitest";
import {
  buildSinglePickAllocation,
  formatNetAmount,
  isMarketEditable,
  settleTicket,
  validateAllocations,
} from "@/lib/game";

describe("game rules", () => {
  it("validates a correct 10k allocation", () => {
    const result = validateAllocations([
      { outcomeCode: "home", amount: 7000 },
      { outcomeCode: "draw", amount: 2000 },
      { outcomeCode: "away", amount: 1000 },
    ]);

    expect(result.ok).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("rejects allocations that do not sum 10k", () => {
    const result = validateAllocations([
      { outcomeCode: "home", amount: 6000 },
      { outcomeCode: "draw", amount: 2000 },
      { outcomeCode: "away", amount: 1000 },
    ]);

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("10000");
  });

  it("rejects allocations above the outcome cap", () => {
    const result = validateAllocations([
      { outcomeCode: "home", amount: 11000 },
      { outcomeCode: "draw", amount: 0 },
      { outcomeCode: "away", amount: 0 },
    ]);

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("10000");
  });

  it("rejects negative allocations even when they sum 10k", () => {
    const result = validateAllocations([
      { outcomeCode: "home", amount: 7000 },
      { outcomeCode: "draw", amount: 4000 },
      { outcomeCode: "away", amount: -1000 },
    ]);

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("negativos");
  });

  it("settles a winning ticket proportionally", () => {
    const result = settleTicket({
      totalPool: 60000,
      winningPool: 15000,
      winningStake: 7000,
    });

    expect(result.grossReturn).toBe(28000);
    expect(result.netResult).toBe(18000);
  });

  it("formats net amounts for the UI", () => {
    expect(formatNetAmount(12222)).toBe("+$12.222");
    expect(formatNetAmount(-5280)).toBe("-$5.280");
    expect(formatNetAmount(0)).toBe("+$0");
  });

  it("keeps an open market editable before lock time", () => {
    expect(
      isMarketEditable({
        status: "open",
        lockAt: "2030-01-01T00:00:00Z",
        now: new Date("2029-01-01T00:00:00Z").getTime(),
      }),
    ).toBe(true);
  });

  it("keeps an open market editable when there is no lock time", () => {
    expect(
      isMarketEditable({
        status: "open",
      }),
    ).toBe(true);
  });

  it("locks a market after kickoff or when status changed", () => {
    expect(
      isMarketEditable({
        status: "open",
        lockAt: "2020-01-01T00:00:00Z",
        now: new Date("2021-01-01T00:00:00Z").getTime(),
      }),
    ).toBe(false);

    expect(
      isMarketEditable({
        status: "revealed",
        lockAt: "2030-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("throws when settlement receives invalid pool data", () => {
    expect(() =>
      settleTicket({
        totalPool: 10000,
        winningPool: 0,
        winningStake: 1000,
      }),
    ).toThrow("winningPool");

    expect(() =>
      settleTicket({
        totalPool: 10000,
        winningPool: 5000,
        winningStake: -10,
      }),
    ).toThrow("negativo");
  });

  it("puts the full credit on the picked outcome and zero on the rest", () => {
    expect(buildSinglePickAllocation(["home", "draw", "away"], "home")).toEqual([
      { outcomeCode: "home", amount: 10000 },
      { outcomeCode: "draw", amount: 0 },
      { outcomeCode: "away", amount: 0 },
    ]);

    expect(buildSinglePickAllocation(["home", "draw", "away"], "draw")).toEqual([
      { outcomeCode: "home", amount: 0 },
      { outcomeCode: "draw", amount: 10000 },
      { outcomeCode: "away", amount: 0 },
    ]);
  });

  it("scales the pick to the market credit", () => {
    expect(buildSinglePickAllocation(["home_qualifies", "away_qualifies"], "away_qualifies", 15000)).toEqual([
      { outcomeCode: "home_qualifies", amount: 0 },
      { outcomeCode: "away_qualifies", amount: 15000 },
    ]);
  });

  it("rejects a pick that is not among the outcomes", () => {
    expect(() => buildSinglePickAllocation(["home", "away"], "draw")).toThrow("invalido");
  });
});
