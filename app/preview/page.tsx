import Link from "next/link";
import { TeamCrest } from "@/components/team-crest";
import { getLigaPreviewHome, type PreviewMatch } from "@/lib/liga-preview";

export const revalidate = 120;

const timeFormatter = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

function MatchRow({ match }: { match: PreviewMatch }) {
  const center =
    match.state === "pre"
      ? timeFormatter.format(new Date(match.kickoff))
      : `${match.home.score ?? "-"} - ${match.away.score ?? "-"}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "0.5px solid var(--line)" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", fontWeight: match.home.winner ? 700 : 500 }}>
        <span style={{ textAlign: "right" }}>{match.home.name}</span>
        <TeamCrest url={match.home.logo} alt={match.home.name} size={22} />
      </div>
      <div style={{ minWidth: 84, textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-accent)", fontVariantNumeric: "tabular-nums", fontSize: "1.05rem" }}>{center}</div>
        <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".04em", color: match.state === "in" ? "var(--accent, #b6ff3a)" : "var(--text-tertiary)" }}>
          {match.clock ?? match.statusLabel}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontWeight: match.away.winner ? 700 : 500 }}>
        <TeamCrest url={match.away.logo} alt={match.away.name} size={22} />
        <span>{match.away.name}</span>
      </div>
    </div>
  );
}

function MatchGroup({ matches }: { matches: PreviewMatch[] }) {
  return (
    <div style={{ background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
      {matches.map((match) => (
        <MatchRow key={match.id} match={match} />
      ))}
    </div>
  );
}

export default async function PreviewHomePage() {
  const home = await getLigaPreviewHome();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 64px" }}>
      <p className="eyebrow">Preview · sin base de datos · datos de ESPN</p>
      <h1 style={{ fontFamily: "var(--font-accent)", fontSize: "1.9rem", margin: "4px 0 16px" }}>Torneo Clausura 2026</h1>

      {home?.live.length ? (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--accent, #b6ff3a)", marginBottom: 8 }}>
            En vivo
          </h2>
          <MatchGroup matches={home.live} />
        </section>
      ) : null}

      {home ? (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)", marginBottom: 8 }}>
            {home.focusIsUpcoming ? "Próxima fecha" : "Última fecha"} · {home.focusLabel}
          </h2>
          <MatchGroup matches={home.focusMatches} />
        </section>
      ) : null}

      <div style={{ display: "flex", gap: 12 }}>
        <Link href="/preview/partidos" style={{ flex: 1, padding: "14px 16px", background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: 14, fontFamily: "var(--font-accent)" }}>
          Todos los partidos →
        </Link>
        <Link href="/preview/cruces" style={{ flex: 1, padding: "14px 16px", background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: 14, fontFamily: "var(--font-accent)" }}>
          Zonas y cruces →
        </Link>
      </div>
    </div>
  );
}
