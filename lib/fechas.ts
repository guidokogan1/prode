import type { MatchViewModel } from "@/lib/domain";

const MATCHES_PER_FECHA = 15;
const ART_OFFSET_MS = -3 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

export type FechaGroup = {
  number: number;
  matches: MatchViewModel[];
  startLabel: string;
  endLabel: string;
};

export type FechaDayGroup = {
  key: string;
  label: string;
  matches: MatchViewModel[];
};

function artDate(kickoffAt: string): Date {
  return new Date(new Date(kickoffAt).getTime() + ART_OFFSET_MS);
}

function shortDateLabel(kickoffAt: string): string {
  const date = artDate(kickoffAt);
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  return `${day}/${month}`;
}

function dayLabel(kickoffAt: string): string {
  const date = artDate(kickoffAt);
  return `${WEEKDAY_LABELS[date.getUTCDay()]} ${shortDateLabel(kickoffAt)}`;
}

export function groupMatchesByFecha(matches: MatchViewModel[]): FechaGroup[] {
  const regularPhase = matches
    .filter((match): match is MatchViewModel & { kickoffAt: string } => Boolean(match.groupLabel && match.kickoffAt))
    .sort((left, right) => left.kickoffAt.localeCompare(right.kickoffAt));

  const groups: FechaGroup[] = [];
  for (let start = 0; start < regularPhase.length; start += MATCHES_PER_FECHA) {
    const chunk = regularPhase.slice(start, start + MATCHES_PER_FECHA);
    if (!chunk.length) continue;
    groups.push({
      number: groups.length + 1,
      matches: chunk,
      startLabel: shortDateLabel(chunk[0].kickoffAt),
      endLabel: shortDateLabel(chunk[chunk.length - 1].kickoffAt),
    });
  }
  return groups;
}

export function groupMatchesByDay(matches: MatchViewModel[]): FechaDayGroup[] {
  const byDay = new Map<string, FechaDayGroup>();
  for (const match of matches) {
    if (!match.kickoffAt) continue;
    const key = artDate(match.kickoffAt).toISOString().slice(0, 10);
    const group = byDay.get(key);
    if (group) {
      group.matches.push(match);
    } else {
      byDay.set(key, { key, label: dayLabel(match.kickoffAt), matches: [match] });
    }
  }
  return [...byDay.values()].sort((left, right) => left.key.localeCompare(right.key));
}

export function findCurrentFechaIndex(fechas: FechaGroup[]): number {
  const firstUnfinished = fechas.findIndex((fecha) => fecha.matches.some((match) => match.status !== "finished"));
  return firstUnfinished === -1 ? Math.max(0, fechas.length - 1) : firstUnfinished;
}
