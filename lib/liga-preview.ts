import { LIGA_2026_TOURNAMENT } from "@/lib/liga-2026";

const crestUrl = (espnId: string | undefined) =>
  espnId ? `https://a.espncdn.com/i/teamlogos/soccer/500/${espnId}.png` : "";

function espnDate(offsetDays: number): string {
  const base = Date.now() + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(base).toISOString().slice(0, 10).replace(/-/g, "");
}

export type PreviewSide = { name: string; logo: string; score: number | null; winner: boolean };
export type PreviewMatch = {
  id: string;
  kickoff: string;
  state: "pre" | "in" | "post";
  statusLabel: string;
  clock: string | null;
  home: PreviewSide;
  away: PreviewSide;
};
export type PreviewDay = { label: string; matches: PreviewMatch[] };

type EspnCompetitor = {
  homeAway: "home" | "away";
  score: string | null;
  winner?: boolean;
  team: { id?: string; displayName?: string; shortDisplayName?: string };
};
type EspnEvent = {
  id: string;
  date: string;
  season?: { slug?: string };
  status: { displayClock?: string; type: { state: "pre" | "in" | "post"; shortDetail?: string } };
  competitions: { competitors: EspnCompetitor[] }[];
};

const STATE_LABEL: Record<string, string> = { pre: "Por jugar", in: "En vivo", post: "Finalizado" };

const dayFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long" });

function side(competitor: EspnCompetitor | undefined): PreviewSide {
  const score = competitor?.score == null || competitor.score === "" ? null : Number(competitor.score);
  return {
    name: competitor?.team?.shortDisplayName || competitor?.team?.displayName || "?",
    logo: crestUrl(competitor?.team?.id),
    score: Number.isFinite(score as number) ? (score as number) : null,
    winner: Boolean(competitor?.winner),
  };
}

export async function getLigaPreviewDays(): Promise<PreviewDay[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LIGA_2026_TOURNAMENT.leagueCode}/scoreboard?dates=${espnDate(-7)}-${espnDate(10)}&limit=100`;
  const response = await fetch(url, { next: { revalidate: 120 } });
  if (!response.ok) return [];

  const payload = (await response.json()) as { events?: EspnEvent[] };
  const events = (payload.events ?? []).filter(
    (event) => !event.season?.slug || event.season.slug === LIGA_2026_TOURNAMENT.seasonSlug,
  );

  const byDay = new Map<string, PreviewMatch[]>();
  for (const event of events.sort((a, b) => a.date.localeCompare(b.date))) {
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const dayKey = event.date.slice(0, 10);
    const match: PreviewMatch = {
      id: event.id,
      kickoff: event.date,
      state: event.status.type.state,
      statusLabel: STATE_LABEL[event.status.type.state] ?? event.status.type.shortDetail ?? "",
      clock: event.status.type.state === "in" ? event.status.displayClock ?? null : null,
      home: side(competitors.find((c) => c.homeAway === "home")),
      away: side(competitors.find((c) => c.homeAway === "away")),
    };
    const list = byDay.get(dayKey) ?? [];
    list.push(match);
    byDay.set(dayKey, list);
  }

  return [...byDay.entries()].map(([dayKey, matches]) => ({
    label: dayFormatter.format(new Date(`${dayKey}T12:00:00`)),
    matches,
  }));
}
