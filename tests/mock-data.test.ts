import { describe, expect, it } from "vitest";
import {
  getDefaultDemoPersonaSlug,
  getDemoPersonas,
  getFallbackHistory,
  getFallbackHomeSummary,
  getFallbackMatchById,
  getFallbackMatches,
  getFallbackProfile,
  isDemoPersonaSlug,
} from "@/lib/mock-data";

describe("demo mock data", () => {
  it("exposes a stable set of demo personas", () => {
    const personas = getDemoPersonas();

    expect(personas).toHaveLength(5);
    expect(personas.map((persona) => persona.slug)).toEqual([
      "guido",
      "mari",
      "bato",
      "pepo",
      "cami",
    ]);
  });

  it("falls back to the default persona for unknown slugs", () => {
    expect(getDefaultDemoPersonaSlug()).toBe("guido");
    expect(getFallbackProfile("unknown").name).toBe("Guido");
  });

  it("returns persona-specific mock variants", () => {
    expect(getFallbackProfile("mari").name).toBe("Mari");
    expect(getFallbackProfile("cami").championPick).toBe("Japon");
    expect(getFallbackHistory("bato")[0]?.title).toContain("Argentina");
  });

  it("computes home summary from the selected persona dataset", () => {
    const summary = getFallbackHomeSummary("pepo");

    expect(summary.liveMatches).toBe(1);
    expect(summary.pendingPicks).toBe(14);
    expect(summary.yourNetAmount).toBe(-3151);
  });

  it("returns persona-specific match states", () => {
    const guidoMatch = getFallbackMatchById("esp-uru", "guido");
    const mariMatch = getFallbackMatchById("esp-uru", "mari");

    expect(guidoMatch?.userStateLabel).toBe("Te falta jugar");
    expect(mariMatch?.userStateLabel).toBe("Tu jugada guardada");
  });

  it("validates demo persona slugs", () => {
    expect(isDemoPersonaSlug("guido")).toBe(true);
    expect(isDemoPersonaSlug("random")).toBe(false);
    expect(getFallbackMatches("cami")).toHaveLength(18);
  });
});
