import { notFound } from "next/navigation";
import { AllocationCard } from "@/components/allocation-card";
import { RevealBoard } from "@/components/reveal-board";
import { getMatchById } from "@/lib/repositories/matches";

type MatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  const match = await getMatchById(id);

  if (!match) {
    notFound();
  }

  const isRevealed = match.revealedTickets.length > 0;

  return (
    <main className="stack page-narrow">
      <section className="card detail-hero detail-hero-simple detail-hero-game">
        <div className="match-top">
          <span className={`status-dot ${match.status === "live" ? "live" : ""}`}>
            {match.statusLabel}
          </span>
          <span className="game-clock">{match.stage}</span>
        </div>

        <div className="headline-score">
          <div className="team-side">
            <div className="flag">{match.home.flag}</div>
            <h1>{match.home.name}</h1>
          </div>
          <div className="big-score">
            {match.home.score} - {match.away.score}
          </div>
          <div className="team-side">
            <div className="flag">{match.away.flag}</div>
            <h1>{match.away.name}</h1>
          </div>
        </div>

        <div className="meta-row">
          <span>{match.kickoffLabel}</span>
          <span>{isRevealed ? "Grupo revelado" : match.userStateLabel}</span>
        </div>
      </section>

      <AllocationCard match={match} />

      <section className="card card-grid">
        <div className="section-title section-title-compact">
          <div>
            <p className="eyebrow">{match.revealedTickets.length ? "Grupo" : "Consenso"}</p>
            <h2>{match.revealedTickets.length ? "Cómo entraron" : "Dónde cae la ronda"}</h2>
          </div>
        </div>
        {match.revealedTickets.length ? (
          <>
            <div className="reveal-banner">
              <strong>Se abrió la ronda</strong>
              <span>Ahora ves lo tuyo y lo de todos.</span>
            </div>
            <RevealBoard tickets={match.revealedTickets} />
          </>
        ) : (
          <div className="list simple-consensus">
            {match.consensus.map((item) => (
              <div className="simple-consensus-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.percentage}%</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card compact-summary">
        <strong>{match.form.home} · {match.form.away}</strong>
        <span className="subtle">Forma reciente.</span>
      </section>
    </main>
  );
}
