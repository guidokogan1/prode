import { describe, expect, it } from "vitest";
import { computeRankMovement } from "@/lib/rank-movement";
import type { RankingTimeline } from "@/lib/domain";

function buildTimeline(entries: { userName: string; points: number[] }[], matchCount: number): RankingTimeline {
  return {
    matchLabels: Array.from({ length: matchCount }, (_, index) => `M${index + 1}`),
    entries: entries.map((entry) => ({ ...entry, isCurrentUser: false })),
  };
}

describe("computeRankMovement", () => {
  it("returns null for everyone when there is less than two settled matches", () => {
    const timeline = buildTimeline(
      [
        { userName: "Ana", points: [12000] },
        { userName: "Beto", points: [8000] },
      ],
      1,
    );
    const movement = computeRankMovement(
      [
        { name: "Ana", position: 1 },
        { name: "Beto", position: 2 },
      ],
      timeline,
    );
    expect(movement).toEqual({ Ana: null, Beto: null });
  });

  it("computes positive delta when a player climbs positions", () => {
    const timeline = buildTimeline(
      [
        { userName: "Ana", points: [12000, 12000] },
        { userName: "Beto", points: [8000, 20000] },
      ],
      2,
    );
    const movement = computeRankMovement(
      [
        { name: "Beto", position: 1 },
        { name: "Ana", position: 2 },
      ],
      timeline,
    );
    expect(movement).toEqual({ Beto: 1, Ana: -1 });
  });

  it("returns zero when a player holds position", () => {
    const timeline = buildTimeline(
      [
        { userName: "Ana", points: [12000, 30000] },
        { userName: "Beto", points: [8000, 9000] },
      ],
      2,
    );
    const movement = computeRankMovement(
      [
        { name: "Ana", position: 1 },
        { name: "Beto", position: 2 },
      ],
      timeline,
    );
    expect(movement).toEqual({ Ana: 0, Beto: 0 });
  });

  it("supports multi-step jumps", () => {
    const timeline = buildTimeline(
      [
        { userName: "Ana", points: [30000, 30000] },
        { userName: "Beto", points: [20000, 20000] },
        { userName: "Caro", points: [10000, 90000] },
      ],
      2,
    );
    const movement = computeRankMovement(
      [
        { name: "Caro", position: 1 },
        { name: "Ana", position: 2 },
        { name: "Beto", position: 3 },
      ],
      timeline,
    );
    expect(movement).toEqual({ Caro: 2, Ana: -1, Beto: -1 });
  });

  it("returns null when timeline is missing", () => {
    const movement = computeRankMovement([{ name: "Ana", position: 1 }], null);
    expect(movement).toEqual({ Ana: null });
  });
});
