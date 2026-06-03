import { describe, expect, it } from "vitest";
import { getMatchCardState } from "@/lib/match-card";
import type { MatchViewModel } from "@/lib/domain";
import { getMatchStateLabel, getMatchUrgencyBucket, getPickStateLabel, getQuickPlayOutcomeTargets, getQuickPlaySwipeOutcome, getUserNetLabel, getUserResultPill, getUserResultTone, sortMatchesByUrgency } from "@/lib/match-ui";

function createMatch(overrides: Partial<MatchViewModel> = {}): MatchViewModel {
  return {
    id: "arg-jpn",
    stage: "Fase de grupos",
    venue: "Monterrey",
    kickoffLabel: "11 Jun · 22:00",
    status: "scheduled",
    marketStatus: "open",
    statusVariant: "upcoming",
    statusLabel: "Falta 1 dia",
    marketType: "1x2",
    marketTypeLabel: "1X2",
    userStateLabel: "Te falta jugar",
    draftState: "idle",
    isEditable: true,
    home: { name: "Argentina", flag: "🇦🇷", score: 0 },
    away: { name: "Japon", flag: "🇯🇵", score: 0 },
    allocation: [
      { code: "home", label: "Argentina", shortLabel: "ARG", amount: 0, percentage: 0 },
      { code: "draw", label: "Empate", shortLabel: "X", amount: 0, percentage: 0 },
      { code: "away", label: "Japon", shortLabel: "JPN", amount: 0, percentage: 0 },
    ],
    consensus: [
      { code: "home", label: "Argentina", shortLabel: "ARG", percentage: 64 },
      { code: "draw", label: "Empate", shortLabel: "X", percentage: 19 },
      { code: "away", label: "Japon", shortLabel: "JPN", percentage: 17 },
    ],
    form: { home: "V V V E V", away: "E D V V D", homeGoals: 11, awayGoals: 7 },
    pickCountByCode: {},
    revealedTickets: [],
    ...overrides,
  };
}

describe("match ui helpers", () => {
  it("maps swipe left/right/up to the visible outcomes", () => {
    const match = createMatch();

    expect(getQuickPlayOutcomeTargets(match)).toEqual({
      left: "home",
      right: "away",
      draw: "draw",
    });
    expect(getQuickPlaySwipeOutcome(match, -80, 0)).toBe("home");
    expect(getQuickPlaySwipeOutcome(match, 80, 0)).toBe("away");
    expect(getQuickPlaySwipeOutcome(match, 0, -80)).toBe("draw");
    expect(getQuickPlaySwipeOutcome(match, 24, 0)).toBeNull();
  });

  it("does not depend on allocation order for quick play targets", () => {
    const reordered = createMatch({
      marketType: "qualifies",
      marketTypeLabel: "Clasifica",
      allocation: [
        { code: "away_qualifies", label: "Clasifica Japon", shortLabel: "JPN", amount: 0, percentage: 0 },
        { code: "home_qualifies", label: "Clasifica Argentina", shortLabel: "ARG", amount: 0, percentage: 0 },
      ],
    });

    expect(getQuickPlayOutcomeTargets(reordered)).toEqual({
      left: "home_qualifies",
      right: "away_qualifies",
      draw: null,
    });
    expect(getQuickPlaySwipeOutcome(reordered, -80, 0)).toBe("home_qualifies");
    expect(getQuickPlaySwipeOutcome(reordered, 80, 0)).toBe("away_qualifies");
  });

  it("derives minimal match state labels", () => {
    expect(getMatchStateLabel(createMatch())).toBe("Abierto");
    expect(getMatchStateLabel(createMatch({ status: "live", statusVariant: "live", marketStatus: "revealed" }))).toBe("En vivo");
    expect(getMatchStateLabel(createMatch({ marketStatus: "locked", statusVariant: "locked", isEditable: false }))).toBe("Cerrado");
    expect(getMatchStateLabel(createMatch({ marketStatus: "settled", statusVariant: "settled", status: "finished", isEditable: false }))).toBe("Liquidado");
  });

  it("derives minimal pick state labels", () => {
    expect(getPickStateLabel(createMatch())).toBe("Sin jugar");
    expect(getPickStateLabel(createMatch({ draftState: "draft" }))).toBe("Borrador");
    expect(getPickStateLabel(createMatch({ draftState: "saved_local" }))).toBe("Guardado local");
    expect(getPickStateLabel(createMatch({ draftState: "saved_remote" }))).toBe("Guardado");
    expect(getPickStateLabel(createMatch({ draftState: "sync_error" }))).toBe("Error");
    expect(
      getPickStateLabel(
        createMatch({
          marketStatus: "settled",
          statusVariant: "settled",
          status: "finished",
          userStateLabel: "Resultado +6.154",
        }),
      ),
    ).toBe("Liquidado");
  });

  it("groups matches by urgency before stage", () => {
    const pending = createMatch();
    const live = createMatch({ id: "live", status: "live", statusVariant: "live", marketStatus: "revealed", isEditable: false });
    const upcoming = createMatch({ id: "upcoming", draftState: "saved_local" });
    const settled = createMatch({ id: "settled", status: "finished", statusVariant: "settled", marketStatus: "settled", isEditable: false });

    expect(getMatchUrgencyBucket(pending)).toBe("pending");
    expect(getMatchUrgencyBucket(live)).toBe("live");
    expect(getMatchUrgencyBucket(upcoming)).toBe("upcoming");
    expect(getMatchUrgencyBucket(settled)).toBe("settled");

    expect([settled, upcoming, live, pending].sort(sortMatchesByUrgency).map((match) => match.id)).toEqual([
      "arg-jpn",
      "live",
      "upcoming",
      "settled",
    ]);
  });

  it("parses settled net labels for simple summaries", () => {
    expect(getUserResultTone("Ganaste +2.400")).toBe("positive");
    expect(getUserResultTone("Perdiste -3.800")).toBe("negative");
    expect(getUserResultPill("Perdiste -3.800")).toBe("Perdiste");
    expect(getUserResultPill("Resultado +6.154")).toBe("Ganaste");
    expect(getUserNetLabel("Ganaste +2.400")).toBe("+2.400");
    expect(getUserNetLabel("Perdiste -3.800")).toBe("-3.800");
    expect(getUserNetLabel("Resultado +6.154")).toBe("+6.154");
  });

  it("derives unified card states for editable, live and settled screens", () => {
    expect(getMatchCardState(createMatch(), "hero")).toMatchObject({
      mode: "editable-empty",
      primaryStatusLabel: "Jugar",
      defaultTab: "play",
      isInteractive: true,
    });

    expect(
      getMatchCardState(
        createMatch({
          draftState: "saved_remote",
          allocation: [
            { code: "home", label: "Argentina", shortLabel: "ARG", amount: 7000, percentage: 70 },
            { code: "draw", label: "Empate", shortLabel: "X", amount: 2000, percentage: 20 },
            { code: "away", label: "Japon", shortLabel: "JPN", amount: 1000, percentage: 10 },
          ],
        }),
        "hero",
      ),
    ).toMatchObject({
      mode: "editable-saved",
      primaryStatusLabel: "Editar",
      secondaryStatusLabel: "Guardado",
      isInteractive: true,
    });

    expect(
      getMatchCardState(createMatch({ status: "live", statusVariant: "live", marketStatus: "revealed", isEditable: false }), "hero"),
    ).toMatchObject({
      mode: "live",
      primaryStatusLabel: "En vivo",
      defaultTab: "play",
      isInteractive: false,
    });

    expect(
      getMatchCardState(
        createMatch({
          status: "finished",
          statusVariant: "settled",
          marketStatus: "settled",
          isEditable: false,
          home: { name: "Argentina", flag: "🇦🇷", score: 2 },
          away: { name: "Japon", flag: "🇯🇵", score: 1 },
          allocation: [
            { code: "home", label: "Argentina", shortLabel: "ARG", amount: 7000, percentage: 70 },
            { code: "draw", label: "Empate", shortLabel: "X", amount: 2000, percentage: 20 },
            { code: "away", label: "Japon", shortLabel: "JPN", amount: 1000, percentage: 10 },
          ],
          userStateLabel: "Ganaste +6.154",
        }),
        "hero",
      ),
    ).toMatchObject({
      mode: "settled",
      primaryStatusLabel: "Final",
      secondaryStatusLabel: "Acertaste",
      isInteractive: false,
      heroValue: "+6.154",
    });
  });
});
