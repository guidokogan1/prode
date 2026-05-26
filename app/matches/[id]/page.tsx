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
  const leadingConsensus = [...match.consensus].sort((left, right) => right.percentage - left.percentage)[0] ?? null;

  return (
    <main className="stack page-narrow">
      <section className={`card detail-hero detail-hero-simple detail-hero-game${isRevealed ? " detail-hero-revealed" : ""}`}>
        <div className="match-top">
          <span className={`status-dot ${match.status === "live" ? "live" : ""}`}>
            {match.statusLabel}
          </span>
          <span className="game-clock">{isRevealed ? match.kickoffLabel : match.stage}</span>
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
          <span>{isRevealed ? "Se abrió la ronda" : match.kickoffLabel}</span>
          <span>{isRevealed ? "Ahora ves cómo entró cada uno" : match.userStateLabel}</span>
        </div>

        {!isRevealed ? (
          <div className="pre-reveal-strip">
            <div className="pre-reveal-pill">
              <strong>Cierra</strong>
              <span>al arranque</span>
            </div>
            <div className="pre-reveal-pill">
              <strong>{match.marketTypeLabel}</strong>
              <span>modo de ronda</span>
            </div>
            {leadingConsensus ? (
              <div className="pre-reveal-pill pre-reveal-pill-accent">
                <strong>{leadingConsensus.label}</strong>
                <span>{leadingConsensus.percentage}% del grupo</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <AllocationCard match={match} />

      <section className={`card card-grid${isRevealed ? "" : " card-pre-reveal"}`}>
        <div className="section-title section-title-compact">
          <div>
            <p className="eyebrow">{match.revealedTickets.length ? "Reveal" : "Consenso"}</p>
            <h2>{match.revealedTickets.length ? "Así entró el grupo" : "Dónde cae la ronda"}</h2>
          </div>
        </div>
        {match.revealedTickets.length ? (
          <>
            <div className="reveal-banner">
              <strong>Ya está todo sobre la mesa</strong>
              <span>Tu jugada y la del grupo ya se ven juntas.</span>
            </div>
            <RevealBoard tickets={match.revealedTickets} />
          </>
        ) : (
            <div className="list simple-consensus">
              {match.consensus.map((item) => (
                <div className="simple-consensus-row" key={item.label}>
                  <div className="simple-consensus-copy">
                    <span>{item.label}</span>
                    <small>{item.percentage >= 40 ? "muy cargado" : item.percentage >= 25 ? "parejo" : "tapado"}</small>
                  </div>
                  <strong>{item.percentage}%</strong>
                </div>
              ))}
            </div>
        )}
      </section>

      <section className="card compact-summary compact-summary-form">
        <div className="section-title section-title-compact">
          <div>
            <p className="eyebrow">Forma</p>
            <h2>Cómo llegan</h2>
          </div>
        </div>
        <div className="form-duel">
          <div className="form-team-card">
            <span className="flag">{match.home.flag}</span>
            <strong>{match.home.name}</strong>
            <span>{match.form.home}</span>
          </div>
          <div className="form-divider">vs</div>
          <div className="form-team-card">
            <span className="flag">{match.away.flag}</span>
            <strong>{match.away.name}</strong>
            <span>{match.form.away}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
