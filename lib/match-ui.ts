import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";

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
  return Number(raw.replace(/\./g, "").replace(/,/g, ""));
}
