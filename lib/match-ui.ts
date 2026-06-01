import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { parseCredits } from "@/lib/format";

export function formatCompactCredits(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }

  return String(value);
}

export function getOutcomeColor(code: MatchOutcomeCode) {
  if (code === "home" || code === "home_qualifies") {
    return "#3D9B5F";
  }

  if (code === "away" || code === "away_qualifies") {
    return "#E8413A";
  }

  return "#5B8FF0";
}

export function getOutcomeFlag(code: MatchOutcomeCode, match: MatchViewModel) {
  if (code === "home" || code === "home_qualifies") {
    return match.home.flag;
  }

  if (code === "away" || code === "away_qualifies") {
    return match.away.flag;
  }

  return "🤝";
}

export function getOutcomeHint(code: MatchOutcomeCode, marketType: MatchViewModel["marketType"]) {
  if (marketType === "qualifies") {
    return code === "home_qualifies" ? "Clasifica local" : "Clasifica visitante";
  }

  if (code === "home") {
    return "Gana local";
  }

  if (code === "away") {
    return "Gana visitante";
  }

  return "Empate";
}

export function getLeadingOutcome(match: MatchViewModel) {
  return [...match.allocation].sort((left, right) => right.percentage - left.percentage)[0] ?? null;
}

export function getQuickPlayOutcomeTargets(match: MatchViewModel) {
  const leftCode: MatchOutcomeCode = match.marketType === "qualifies" ? "home_qualifies" : "home";
  const rightCode: MatchOutcomeCode = match.marketType === "qualifies" ? "away_qualifies" : "away";
  const drawCode: MatchOutcomeCode | null = match.marketType === "1x2" ? "draw" : null;

  return {
    left: match.allocation.find((item) => item.code === leftCode)?.code ?? leftCode,
    right: match.allocation.find((item) => item.code === rightCode)?.code ?? rightCode,
    draw: drawCode && match.allocation.some((item) => item.code === drawCode) ? drawCode : null,
  };
}

export function getQuickPlaySwipeOutcome(match: MatchViewModel, offsetX: number, offsetY: number) {
  const { left, right, draw } = getQuickPlayOutcomeTargets(match);

  if (offsetX <= -68) {
    return left;
  }

  if (offsetX >= 68) {
    return right;
  }

  if (offsetY <= -68 && draw) {
    return draw;
  }

  return null;
}

export function getMatchStateLabel(match: MatchViewModel) {
  if (match.marketStatus === "settled" || match.statusVariant === "settled") {
    return "Liquidado";
  }

  if (match.statusVariant === "live" || match.status === "live") {
    return "En vivo";
  }

  if (
    match.marketStatus === "locked" ||
    match.marketStatus === "revealed" ||
    match.statusVariant === "locked" ||
    match.statusVariant === "revealed"
  ) {
    return "Cerrado";
  }

  return "Abierto";
}

export function getPickStateLabel(match: MatchViewModel) {
  if (match.marketStatus === "settled" || match.statusVariant === "settled" || match.userStateLabel.startsWith("Resultado")) {
    return "Liquidado";
  }

  if (match.draftState === "draft") {
    return "Borrador";
  }

  if (match.draftState === "saved_local") {
    return "Guardado local";
  }

  if (match.draftState === "saved_remote") {
    return "Guardado";
  }

  if (match.draftState === "sync_error") {
    return "Error";
  }

  return "Sin jugar";
}

export function getMatchActionLabel(match: MatchViewModel) {
  const matchState = getMatchStateLabel(match);
  const pickState = getPickStateLabel(match);

  if (matchState === "En vivo") {
    return "En vivo";
  }

  if (matchState === "Liquidado") {
    return "Liquidado";
  }

  if (!match.isEditable) {
    return "Bloqueado";
  }

  return pickState === "Sin jugar" ? "Jugar" : "Editar";
}

export function getMatchActionPriority(match: MatchViewModel) {
  const action = getMatchActionLabel(match);

  if (action === "Jugar") {
    return 0;
  }

  if (action === "Editar") {
    return 1;
  }

  if (action === "Bloqueado") {
    return 2;
  }

  if (action === "En vivo") {
    return 3;
  }

  return 4;
}

export function getMatchPickSummary(match: MatchViewModel) {
  const pickState = getPickStateLabel(match);

  if (pickState === "Sin jugar") {
    return "Sin jugar";
  }

  const leading = [...match.allocation].sort((left, right) => right.amount - left.amount)[0];
  return leading ? `Más a ${leading.label}` : pickState;
}

export type MatchUrgencyBucket = "pending" | "live" | "upcoming" | "settled";

export function getMatchUrgencyBucket(match: MatchViewModel): MatchUrgencyBucket {
  if (getMatchStateLabel(match) === "En vivo") {
    return "live";
  }

  if (match.isEditable && getPickStateLabel(match) === "Sin jugar") {
    return "pending";
  }

  if (getMatchStateLabel(match) === "Liquidado") {
    return "settled";
  }

  return "upcoming";
}

export function sortMatchesByUrgency(left: MatchViewModel, right: MatchViewModel) {
  const rank = (match: MatchViewModel) => {
    const bucket = getMatchUrgencyBucket(match);

    if (bucket === "pending") {
      return 0;
    }

    if (bucket === "live") {
      return 1;
    }

    if (bucket === "upcoming") {
      return 2;
    }

    return 3;
  };

  return rank(left) - rank(right);
}

export function deriveResolvedOutcome(match: MatchViewModel): MatchOutcomeCode | null {
  if (match.status !== "finished") {
    return null;
  }

  if (match.marketType === "qualifies") {
    return match.home.score > match.away.score ? "home_qualifies" : "away_qualifies";
  }

  if (match.home.score > match.away.score) {
    return "home";
  }

  if (match.away.score > match.home.score) {
    return "away";
  }

  return "draw";
}

export function parseAmount(raw: string) {
  return parseCredits(raw);
}
