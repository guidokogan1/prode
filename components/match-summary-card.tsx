import Link from "next/link";
import type { ReactNode } from "react";
import type { MatchViewModel } from "@/lib/domain";
import { getMatchActionLabel, getMatchStateLabel, getPickStateLabel } from "@/lib/match-ui";

type MatchSummaryCardProps = {
  match: MatchViewModel;
  href?: string;
  trailing?: ReactNode;
  footer?: ReactNode;
};

export function MatchSummaryCard({ match, href, trailing, footer }: MatchSummaryCardProps) {
  const actionLabel = getMatchActionLabel(match);
  const pickState = getPickStateLabel(match);
  const showPickState = match.isEditable && pickState !== "Sin jugar";

  const content = (
    <div className="surface-card-soft soft-panel section-stack" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
      <div className="split-row" style={{ flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill">{actionLabel}</span>
          {showPickState ? <span className="pill">{pickState}</span> : <span className="micro-copy">{getMatchStateLabel(match)}</span>}
        </div>
        {trailing ?? <span className="micro-copy">{match.stage}</span>}
      </div>

      <strong style={{ fontSize: "1rem", letterSpacing: "-0.02em", textTransform: "uppercase" }}>
        {match.home.flag} {match.home.name} vs {match.away.flag} {match.away.name}
      </strong>

      <div className="split-row" style={{ flexWrap: "wrap" }}>
        <span className="micro-copy">{match.kickoffLabel}</span>
        {trailing ? null : <span className="micro-copy">{match.stage}</span>}
      </div>

      {footer ? <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.09)" }}>{footer}</div> : null}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
