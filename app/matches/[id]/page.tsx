import { notFound } from "next/navigation";
import { AllocationCard } from "@/components/allocation-card";
import { getMatchById } from "@/lib/repositories/matches";
import { getRanking } from "@/lib/repositories/ranking";

type MatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  const [match, ranking] = await Promise.all([getMatchById(id), getRanking()]);

  if (!match) {
    notFound();
  }

  return (
    <main className="stack page-wide">
      <section className="card detail-hero">
        <div className="pill-row">
          <span className={`pill ${match.status === "live" ? "pill-live" : ""}`}>
            {match.statusLabel}
          </span>
          <span className="pill">{match.marketTypeLabel}</span>
          <span className="pill">{match.stage}</span>
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
          <span>{match.venue}</span>
        </div>
      </section>

      <section className="split-grid">
        <AllocationCard match={match} />

        <div className="stack">
          <section className="card card-grid">
            <div className="section-title">
              <div>
                <p className="eyebrow">
                  {match.revealedTickets.length ? "Reveal" : "Consenso"}
                </p>
                <h2>
                  {match.revealedTickets.length
                    ? "Asi jugo el grupo"
                    : "Como viene el grupo"}
                </h2>
              </div>
            </div>
            {match.revealedTickets.length ? (
              <div className="list">
                {match.revealedTickets.map((ticket) => (
                  <div className="ranking-row" key={ticket.userName}>
                    <div>
                      <strong>{ticket.userName}</strong>
                      <p className="subtle">
                        {ticket.allocations
                          .map((allocation) => `${allocation.label}: ${allocation.amount}`)
                          .join(" · ")}
                      </p>
                    </div>
                    {ticket.netLabel ? (
                      <strong
                        className={
                          ticket.netLabel.startsWith("-") ? "money-negative" : "money-positive"
                        }
                      >
                        {ticket.netLabel}
                      </strong>
                    ) : (
                      <span className="subtle">Sin liquidar</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              match.consensus.map((item) => (
                <div className="allocation-row" key={item.label}>
                  <div className="allocation-label">
                    <span>{item.label}</span>
                    <span>{item.percentage}%</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="card card-grid">
            <div className="section-title">
              <div>
                <p className="eyebrow">Impacto</p>
                <h2>Asi quedaria la tabla</h2>
              </div>
            </div>
            <div className="ranking-list">
                {ranking.slice(0, 3).map((item) => (
                  <div className="ranking-row" key={item.name}>
                    <div className="position-badge">{item.position}</div>
                    <div>
                      <strong>{item.name}</strong>
                      <p className="subtle">{item.positiveTickets} jugadas arriba</p>
                    </div>
                    <strong className={item.net >= 0 ? "money-positive" : "money-negative"}>
                      {item.netLabel}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section className="card card-grid">
            <div className="section-title">
              <div>
                <p className="eyebrow">Forma</p>
                <h2>Ultimos 5 partidos</h2>
              </div>
            </div>
            <div className="stat-grid">
              <div className="stat-cell">
                <strong>{match.form.home}</strong>
                <span>{match.home.name}</span>
              </div>
              <div className="stat-cell">
                <strong>{match.form.away}</strong>
                <span>{match.away.name}</span>
              </div>
              <div className="stat-cell">
                <strong>{match.form.homeGoals}</strong>
                <span>Goles a favor</span>
              </div>
              <div className="stat-cell">
                <strong>{match.form.awayGoals}</strong>
                <span>Goles a favor</span>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
