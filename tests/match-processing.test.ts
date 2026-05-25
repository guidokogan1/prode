import { describe, expect, it } from "vitest";

function deriveProcessingStage(params: {
  nextStatus: "open" | "locked" | "revealed" | "settled";
  winningOutcomeCode: string | null;
}) {
  if (params.nextStatus === "settled" && params.winningOutcomeCode) {
    return "settled";
  }

  if (params.nextStatus === "revealed") {
    return "revealed";
  }

  return params.nextStatus;
}

describe("match processing orchestration", () => {
  it("returns settled when the market can be settled", () => {
    expect(
      deriveProcessingStage({
        nextStatus: "settled",
        winningOutcomeCode: "home",
      }),
    ).toBe("settled");
  });

  it("returns revealed when the market should only reveal", () => {
    expect(
      deriveProcessingStage({
        nextStatus: "revealed",
        winningOutcomeCode: null,
      }),
    ).toBe("revealed");
  });

  it("keeps open or locked states untouched", () => {
    expect(
      deriveProcessingStage({
        nextStatus: "open",
        winningOutcomeCode: null,
      }),
    ).toBe("open");

    expect(
      deriveProcessingStage({
        nextStatus: "locked",
        winningOutcomeCode: null,
      }),
    ).toBe("locked");
  });
});
