"use client";

import { TeamCrest } from "@/components/team-crest";
import { VoteFace } from "@/components/vote-face";
import type { MatchViewModel } from "@/lib/domain";
import { getOutcomeColor } from "@/lib/match-ui";

type QualifiesVoteCardProps = {
  match: MatchViewModel;
  credit: number;
  onPick: (homeAmount: number) => void;
  topRightLabel?: string;
  saving?: boolean;
  errorMessage?: string | null;
};

function QualifiesPickFooter({ match, credit, onPick, saving = false, errorMessage = null }: Omit<QualifiesVoteCardProps, "topRightLabel">) {
  const pickColor = getOutcomeColor("home_qualifies");

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className="eyebrow">¿Quién clasifica?</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button
          type="button"
          className="button-secondary"
          style={{ minHeight: 92, display: "grid", placeItems: "center", gap: 8, borderColor: `${pickColor}55` }}
          onClick={() => onPick(credit)}
          disabled={saving || !match.isEditable}
        >
          <TeamCrest url={match.home.logo} alt={match.home.name} size={30} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: ".9rem", fontWeight: 700 }}>{match.home.name}</span>
        </button>
        <button
          type="button"
          className="button-secondary"
          style={{ minHeight: 92, display: "grid", placeItems: "center", gap: 8, borderColor: `${pickColor}55` }}
          onClick={() => onPick(0)}
          disabled={saving || !match.isEditable}
        >
          <TeamCrest url={match.away.logo} alt={match.away.name} size={30} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: ".9rem", fontWeight: 700 }}>{match.away.name}</span>
        </button>
      </div>
      {saving ? <span className="micro-copy" style={{ textAlign: "center" }}>Guardando…</span> : null}
      {errorMessage ? <span className="micro-copy" style={{ color: "var(--live)" }}>{errorMessage}</span> : null}
    </div>
  );
}

export function QualifiesVoteCard({ match, topRightLabel, ...footerProps }: QualifiesVoteCardProps) {
  return (
    <div className="surface-card">
      <VoteFace
        match={match}
        showDrawGesture={false}
        centerMode="vs"
        topRightLabel={topRightLabel ?? match.statusLabel}
        footerSlot={<QualifiesPickFooter match={match} {...footerProps} />}
      />
    </div>
  );
}
