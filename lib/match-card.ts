import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { formatCredits } from "@/lib/format";
import {
  deriveResolvedOutcome,
  getLeadingOutcome,
  getMatchActionLabel,
  getOutcomeHint,
  getPickStateLabel,
  getUserNetLabel,
  getUserResultTone,
} from "@/lib/match-ui";

export type MatchCardMode = "editable-empty" | "editable-saved" | "live" | "settled";
export type MatchCardDensity = "hero" | "compact";
export type MatchCardTab = "play" | "group";

export type MatchCardState = {
  mode: MatchCardMode;
  density: MatchCardDensity;
  primaryStatusLabel: "Jugar" | "Editar" | "Bloqueado" | "En vivo" | "Final";
  secondaryStatusLabel: string | null;
  defaultTab: MatchCardTab;
  isInteractive: boolean;
  showDrawGesture: boolean;
  heroValue: string;
  heroDescription: string;
  heroTone: "neutral" | "positive" | "negative" | "live";
  winningOutcome: MatchOutcomeCode | null;
  leadingUserOutcome: MatchViewModel["allocation"][number] | null;
  leadingConsensus: MatchViewModel["consensus"][number] | null;
  scoreOrKickoffLabel: string;
};

export function getMatchCardState(match: MatchViewModel, density: MatchCardDensity): MatchCardState {
  const resolvedOutcome = deriveResolvedOutcome(match);
  const leadingUserOutcome = getLeadingOutcome(match);
  const leadingConsensus = [...match.consensus].sort((left, right) => right.percentage - left.percentage)[0] ?? null;
  const pickState = getPickStateLabel(match);
  const primaryStatusLabel = getMatchActionLabel(match) as MatchCardState["primaryStatusLabel"];
  const showDrawGesture = match.marketType === "1x2";

  if (resolvedOutcome) {
    const winningLabel = match.consensus.find((item) => item.code === resolvedOutcome)?.label ?? "Resultado";
    const netLabel = getUserNetLabel(match.userStateLabel);
    const tone = getUserResultTone(match.userStateLabel);
    const pickedWinner = leadingUserOutcome?.code === resolvedOutcome;
    const secondaryStatusLabel = !leadingUserOutcome ? "Sin jugar" : pickedWinner ? "Acertaste" : "No entro";
    const heroDescription = !leadingUserOutcome
      ? `No jugaste este partido. Gano ${winningLabel}.`
      : pickedWinner
        ? `Fuiste con ${leadingUserOutcome.label}. Acertaste el lado. Cerro ${netLabel}.`
        : `Fuiste con ${leadingUserOutcome.label}, pero gano ${winningLabel}.`;

    return {
      mode: "settled",
      density,
      primaryStatusLabel: "Final",
      secondaryStatusLabel,
      defaultTab: "play",
      isInteractive: false,
      showDrawGesture: false,
      heroValue: netLabel,
      heroDescription,
      heroTone: tone === "positive" ? "positive" : tone === "negative" ? "negative" : "neutral",
      winningOutcome: resolvedOutcome,
      leadingUserOutcome,
      leadingConsensus,
      scoreOrKickoffLabel: `${match.home.score} - ${match.away.score}`,
    };
  }

  if (match.status === "live" || match.statusVariant === "live") {
    const heroValue = leadingUserOutcome?.label ?? "Sin jugar";
    const heroDescription = leadingUserOutcome
      ? `${formatCredits(leadingUserOutcome.amount)} · ${getOutcomeHint(leadingUserOutcome.code, match.marketType)}`
      : "Sin jugada cargada";

    return {
      mode: "live",
      density,
      primaryStatusLabel: "En vivo",
      secondaryStatusLabel: null,
      defaultTab: "group",
      isInteractive: false,
      showDrawGesture: false,
      heroValue,
      heroDescription,
      heroTone: "live",
      winningOutcome: null,
      leadingUserOutcome,
      leadingConsensus,
      scoreOrKickoffLabel: `${match.home.score} - ${match.away.score}`,
    };
  }

  if (!match.isEditable) {
    const heroValue = leadingUserOutcome?.label ?? "Sin jugar";
    const heroDescription = leadingUserOutcome
      ? `${formatCredits(leadingUserOutcome.amount)} · ${getOutcomeHint(leadingUserOutcome.code, match.marketType)}`
      : "No admite cambios";

    return {
      mode: "live",
      density,
      primaryStatusLabel: "Bloqueado",
      secondaryStatusLabel: null,
      defaultTab: "play",
      isInteractive: false,
      showDrawGesture: false,
      heroValue,
      heroDescription,
      heroTone: "neutral",
      winningOutcome: null,
      leadingUserOutcome,
      leadingConsensus,
      scoreOrKickoffLabel: match.kickoffLabel,
    };
  }

  if (pickState !== "Sin jugar") {
    const heroValue = leadingUserOutcome?.label ?? "Tu jugada";
    const heroDescription = leadingUserOutcome
      ? `${formatCredits(leadingUserOutcome.amount)} · ${getOutcomeHint(leadingUserOutcome.code, match.marketType)}`
      : "Toca para corregir";

    return {
      mode: "editable-saved",
      density,
      primaryStatusLabel: "Editar",
      secondaryStatusLabel: pickState === "Guardado" || pickState === "Guardado local" ? pickState : null,
      defaultTab: "play",
      isInteractive: match.isEditable,
      showDrawGesture,
      heroValue,
      heroDescription,
      heroTone: "neutral",
      winningOutcome: null,
      leadingUserOutcome,
      leadingConsensus,
      scoreOrKickoffLabel: match.kickoffLabel,
    };
  }

  return {
    mode: "editable-empty",
    density,
    primaryStatusLabel: "Jugar",
    secondaryStatusLabel: null,
    defaultTab: "play",
    isInteractive: match.isEditable,
    showDrawGesture,
    heroValue: "Elegi resultado",
    heroDescription: "Arrastra o toca",
    heroTone: "neutral",
    winningOutcome: null,
    leadingUserOutcome,
    leadingConsensus,
    scoreOrKickoffLabel: match.kickoffLabel,
  };
}
