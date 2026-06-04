import { describe, expect, it } from "vitest";
import {
  DUMMY_MATCH_CONFIRMATION_TOKEN,
  deriveDummyMatchState,
  getDummyGroupLabel,
  getDummyMatchDefinition,
  getDummyTeamMeta,
  isDummyMatchId,
  shouldIncludeMatchInChampionPool,
} from "@/lib/dummy-matches";
import { getWorldCupGroupLabel, getWorldCupTeamMeta } from "@/lib/world-cup-2026";

describe("dummy matches helpers", () => {
  it("resolves dummy group and team metadata without touching real teams", () => {
    expect(getDummyTeamMeta("PRK")).toMatchObject({
      name: "Corea del Norte",
      flag: "🇰🇵",
      groupLetter: "X",
    });
    expect(getWorldCupTeamMeta("PRK")).toMatchObject({
      name: "Corea del Norte",
      flag: "🇰🇵",
    });
    expect(getWorldCupTeamMeta("ARG")).toMatchObject({
      name: "Argentina",
      flag: "🇦🇷",
    });
    expect(getDummyGroupLabel("BOL", "PRK", "group")).toBe("Grupo X");
    expect(getWorldCupGroupLabel("BOL", "PRK", "group")).toBe("Grupo X");
    expect(getWorldCupGroupLabel("ARG", "ALG", "group")).toBe("Grupo J");
  });

  it("derives dummy lifecycle states from the real clock", () => {
    const definition = getDummyMatchDefinition("dummy-x-bol-prk");
    expect(definition).not.toBeNull();

    expect(deriveDummyMatchState("dummy-x-bol-prk", new Date("2026-06-05T12:59:59Z"))).toMatchObject({
      status: "scheduled",
      winnerCode: null,
      winnerMode: null,
    });
    expect(deriveDummyMatchState("dummy-x-bol-prk", new Date("2026-06-05T13:00:00Z"))).toMatchObject({
      status: "live",
      homeScore90: 0,
      awayScore90: 0,
    });
    expect(deriveDummyMatchState("dummy-x-bol-prk", new Date("2026-06-05T15:00:00Z"))).toMatchObject({
      status: "finished",
      homeScore90: 1,
      awayScore90: 2,
      winnerCode: "PRK",
      winnerMode: "regular_time",
    });
  });

  it("marks only dummy matches as excluded from champion pool", () => {
    expect(isDummyMatchId("dummy-x-bol-prk")).toBe(true);
    expect(shouldIncludeMatchInChampionPool("dummy-x-bol-prk")).toBe(false);
    expect(shouldIncludeMatchInChampionPool("j-arg-jpn")).toBe(true);
    expect(DUMMY_MATCH_CONFIRMATION_TOKEN).toBe("DELETE_DUMMY_MATCHES");
  });
});
