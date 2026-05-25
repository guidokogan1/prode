import { describe, expect, it } from "vitest";

function summarizeBatchResults(
  results: Array<{ ok: boolean; stage: string; reason: string | null }>,
) {
  return {
    processed: results.length,
    failures: results.filter((result) => !result.ok).length,
    settled: results.filter((result) => result.stage === "settled").length,
    revealed: results.filter((result) => result.stage === "revealed").length,
  };
}

describe("batch match processing", () => {
  it("summarizes a mixed batch of match results", () => {
    const summary = summarizeBatchResults([
      { ok: true, stage: "open", reason: null },
      { ok: true, stage: "revealed", reason: null },
      { ok: true, stage: "settled", reason: null },
      { ok: false, stage: "error", reason: "missing market" },
    ]);

    expect(summary).toEqual({
      processed: 4,
      failures: 1,
      settled: 1,
      revealed: 1,
    });
  });
});
