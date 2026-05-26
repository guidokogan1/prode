import Link from "next/link";
import type { MatchViewModel } from "@/lib/domain";

type MatchCardProps = {
  match: MatchViewModel;
};

export function MatchCard({ match }: MatchCardProps) {
  const stateLabel = match.isEditable ? "Entrar ahora" : match.userStateLabel;

  return (
    <Link className="card match-card" href={`/matches/${match.id}`}>
      <div className="match-top">
        <span className={`status-dot ${match.status === "live" ? "live" : ""}`}>
          {match.statusLabel}
        </span>
        <span className="subtle">{match.kickoffLabel}</span>
      </div>

      <div className="match-teams">
        <div className="team-row">
          <div className="team-name">
            <span className="flag">{match.home.flag}</span>
            <span>{match.home.name}</span>
          </div>
          <span className="score">{match.home.score}</span>
        </div>
        <div className="team-row">
          <div className="team-name">
            <span className="flag">{match.away.flag}</span>
            <span>{match.away.name}</span>
          </div>
          <span className="score">{match.away.score}</span>
        </div>
      </div>

      <div className="meta-row">
        <span>{stateLabel}</span>
        <span className="meta-row-end">
          <span>{match.marketTypeLabel}</span>
          <span aria-hidden="true">↗</span>
        </span>
      </div>
    </Link>
  );
}
