import Link from "next/link";
import type { ReactNode } from "react";
import type { MatchViewModel } from "@/lib/domain";
import { getMatchStateLabel, getPickStateLabel } from "@/lib/match-ui";

type MatchSummaryCardProps = {
  match: MatchViewModel;
  href?: string;
  trailing?: ReactNode;
};

export function MatchSummaryCard({ match, href, trailing }: MatchSummaryCardProps) {
  const content = (
    <div className="surface-card-soft soft-panel section-stack">
      <div className="split-row" style={{ flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill">{getMatchStateLabel(match)}</span>
          <span className="pill">{getPickStateLabel(match)}</span>
        </div>
        {trailing ?? <span className="micro-copy">{match.stage}</span>}
      </div>

      <strong style={{ fontSize: "1rem", letterSpacing: "-0.02em" }}>
        {match.home.flag} {match.home.name} vs {match.away.flag} {match.away.name}
      </strong>

      <div className="split-row" style={{ flexWrap: "wrap" }}>
        <span className="micro-copy">{match.kickoffLabel}</span>
        <span className="micro-copy">{match.stage}</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
