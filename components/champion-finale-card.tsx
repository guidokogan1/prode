import { ShareByIdButton } from "@/components/share-by-id-button";
import type { TournamentFinalState } from "@/lib/repositories/tournament";

type ChampionFinaleCardProps = {
  tournament: TournamentFinalState;
  userPick: string | null;
};

export function ChampionFinaleCard({ tournament, userPick }: ChampionFinaleCardProps) {
  if (!tournament.winnerTeam) return null;

  const pickedWinner =
    userPick != null && userPick.toLowerCase() === tournament.winnerTeam.name.toLowerCase();
  const hasPick = userPick != null;

  const tone = pickedWinner ? "positive" : "neutral";
  const accent = tone === "positive" ? "var(--gold)" : "var(--text-secondary)";
  const headline = pickedWinner ? "Acertaste el campeón" : hasPick ? "No entró el campeón" : "Sin pick";

  return (
    <section
      id="champion-finale-share-target"
      className="surface-card-soft"
      style={{
        padding: 16,
        display: "grid",
        gap: 12,
        background: pickedWinner
          ? "linear-gradient(160deg, rgba(216,255,86,0.1) 0%, rgba(15,21,29,0.96) 60%)"
          : "rgba(255,255,255,0.035)",
        borderColor: pickedWinner ? "rgba(216,255,86,0.28)" : "rgba(255,255,255,0.1)",
      }}
    >
      <div className="title-stack" style={{ gap: 4 }}>
        <p className="eyebrow">Campeón del Mundial</p>
        <strong className="section-title" style={{ color: accent }}>
          {tournament.winnerTeam.flag} {tournament.winnerTeam.name}
        </strong>
      </div>
      <div className="split-row" style={{ alignItems: "center" }}>
        <div className="title-stack" style={{ gap: 2 }}>
          <span className="micro-copy">Tu pick</span>
          <strong style={{ fontSize: "1rem" }}>{userPick ?? "Sin elegir"}</strong>
        </div>
        <strong style={{ color: accent, fontFamily: "var(--font-display)", fontSize: "1rem", textTransform: "uppercase" }}>
          {headline}
        </strong>
      </div>
      <ShareByIdButton
        targetId="champion-finale-share-target"
        fileName="prode-campeon.jpg"
        shareText={
          pickedWinner
            ? `Acerté el campeón del Mundial: ${tournament.winnerTeam.flag} ${tournament.winnerTeam.name}`
            : `Pegamos el prode del Mundial. Campeón ${tournament.winnerTeam.flag} ${tournament.winnerTeam.name}`
        }
        label="Compartir"
        className="button-ghost"
        style={{ marginTop: 4 }}
      />
    </section>
  );
}
