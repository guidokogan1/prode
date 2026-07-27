import Link from "next/link";
import { TeamCrest } from "@/components/team-crest";
import { getLigaPreviewDays, type PreviewMatch } from "@/lib/liga-preview";

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

export default async function PreviewPartidosPage() {
  const days = await getLigaPreviewDays();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 64px" }}>
      <p className="eyebrow">Preview · Torneo Clausura 2026</p>
      <h1 style={{ fontFamily: "var(--font-accent)", fontSize: "1.8rem", margin: "2px 0 4px" }}>Partidos</h1>
      <Link href="/preview/cruces" className="muted-copy" style={{ fontSize: ".85rem" }}>
        Ver cruces y zonas →
      </Link>

      {days.length === 0 ? (
        <p className="muted-copy" style={{ marginTop: 24 }}>No hay partidos en la ventana consultada.</p>
      ) : (
        days.map((day) => (
          <section key={day.label} style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--text-secondary)", marginBottom: 8 }}>
              {day.label}
            </h2>
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
              {day.matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
