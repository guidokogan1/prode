import Link from "next/link";
import type { MatchViewModel } from "@/lib/domain";

type MatchCardProps = {
  match: MatchViewModel;
};

export function MatchCard({ match }: MatchCardProps) {
  return (
    <Link className="card match-card" href={`/matches/${match.id}`}>
      <div className="match-top">
        <div className="pill-row">
          <span className={`pill ${match.status === "live" ? "pill-live" : ""}`}>
            {match.statusLabel}
          </span>
          <span className="pill">{match.marketTypeLabel}</span>
        </div>
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
        <span>{match.stage}</span>
        <span className="meta-row-end">
          <span>{match.userStateLabel}</span>
          <span aria-hidden="true">↗</span>
        </span>
      </div>
    </Link>
  );
}
