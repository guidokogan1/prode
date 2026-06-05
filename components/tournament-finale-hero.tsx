import Link from "next/link";
import { ShareByIdButton } from "@/components/share-by-id-button";
import { formatNetAmount } from "@/lib/format";
import type { RankingEntry } from "@/lib/domain";
import type { TournamentFinalState } from "@/lib/repositories/tournament";

type TournamentFinaleHeroProps = {
  tournament: TournamentFinalState;
  ranking: RankingEntry[];
  currentUserName: string;
  currentUserChampionPick: string | null;
};

const PODIUM_EMOJIS = ["🥇", "🥈", "🥉"];

export function TournamentFinaleHero({ tournament, ranking, currentUserName, currentUserChampionPick }: TournamentFinaleHeroProps) {
  const userInRanking = ranking.find((entry) => entry.name === currentUserName) ?? null;
  const userPickedWinner =
    currentUserChampionPick != null &&
    currentUserChampionPick !== "Sin elegir" &&
    tournament.winnerTeam != null &&
    currentUserChampionPick.toLowerCase() === tournament.winnerTeam.name.toLowerCase();
  const userIsLeader = userInRanking?.position === 1;

  return (
    <>
      <section
        id="finale-share-target"
        className={userIsLeader ? "surface-card-strong finale-hero-celebrate" : "surface-card-strong"}
        style={{
          padding: 22,
          display: "grid",
          gap: 16,
          background: "linear-gradient(160deg, rgba(216,255,86,0.16) 0%, rgba(15,21,29,0.97) 60%)",
          borderColor: "rgba(216,255,86,0.28)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {userIsLeader ? (
          <>
            <span className="finale-sparkle" style={{ top: 12, left: 18, fontSize: "1.1rem", animationDelay: "0s" }} aria-hidden="true">✨</span>
            <span className="finale-sparkle" style={{ top: 28, right: 22, fontSize: "0.9rem", animationDelay: "0.7s" }} aria-hidden="true">✨</span>
            <span className="finale-sparkle" style={{ bottom: 18, left: 28, fontSize: "0.8rem", animationDelay: "1.4s" }} aria-hidden="true">⭐</span>
            <span className="finale-sparkle" style={{ bottom: 30, right: 16, fontSize: "1rem", animationDelay: "0.3s" }} aria-hidden="true">✨</span>
          </>
        ) : null}
        <div className="title-stack" style={{ gap: 4, textAlign: "center", justifyItems: "center" }}>
          <p className="eyebrow" style={{ color: "var(--gold)" }}>Mundial terminado</p>
          <h1 className="display-title" style={{ fontSize: "clamp(2rem, 7vw, 2.6rem)", color: "var(--gold)" }}>
            Campeón
          </h1>
          {tournament.winnerTeam ? (
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", letterSpacing: "-0.03em" }}>
              {tournament.winnerTeam.flag} {tournament.winnerTeam.name}
            </p>
          ) : null}
        </div>

        {userIsLeader ? (
          <div
            className="surface-card-soft"
            style={{
              padding: 14,
              borderRadius: 14,
              background: "rgba(216,255,86,0.12)",
              borderColor: "rgba(216,255,86,0.34)",
              display: "grid",
              gap: 4,
              textAlign: "center",
            }}
          >
            <p className="eyebrow" style={{ color: "var(--gold)" }}>🏆 Campeón del prode</p>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--gold)" }}>
              {currentUserName}
            </strong>
            <span className="micro-copy">Salís primero con {formatNetAmount(userInRanking?.netAmount ?? 0)}</span>
          </div>
        ) : userInRanking ? (
          <div
            className="surface-card-soft"
            style={{
              padding: 14,
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.1)",
              display: "grid",
              gap: 4,
              textAlign: "center",
            }}
          >
            <p className="eyebrow">Tu lugar</p>
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>#{userInRanking.position}</strong>
            <span className="micro-copy">{formatNetAmount(userInRanking.netAmount)}</span>
            {userPickedWinner ? (
              <span className="micro-copy" style={{ color: "var(--gold)" }}>Acertaste el campeón</span>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="surface-card-soft" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div className="split-row" style={{ alignItems: "center" }}>
          <div className="title-stack" style={{ gap: 2 }}>
            <p className="eyebrow">Podio final</p>
            <strong className="section-title">Top 5</strong>
          </div>
          <Link className="button-ghost" href="/ranking" style={{ minHeight: 36, paddingInline: 12 }}>
            Ver tabla
          </Link>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {ranking.map((entry) => (
            <div
              key={`finale-podium-${entry.position}`}
              className="surface-card-soft"
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: entry.position === 1 ? "rgba(216,255,86,0.08)" : "rgba(255,255,255,0.035)",
                borderColor: entry.position === 1 ? "rgba(216,255,86,0.28)" : "rgba(255,255,255,0.08)",
                display: "grid",
                gridTemplateColumns: "32px minmax(0, 1fr) auto",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: "1.1rem",
                  color: entry.position <= 3 ? "var(--gold)" : "var(--text-secondary)",
                }}
              >
                {PODIUM_EMOJIS[entry.position - 1] ?? `#${entry.position}`}
              </span>
              <strong style={{ fontSize: "1rem" }}>{entry.name}</strong>
              <strong
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: "1.05rem",
                  letterSpacing: "-0.04em",
                  color: entry.netAmount > 0 ? "var(--gold)" : entry.netAmount < 0 ? "var(--live)" : undefined,
                }}
              >
                {formatNetAmount(entry.netAmount)}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 10, paddingInline: 4 }}>
        <ShareByIdButton
          targetId="finale-share-target"
          fileName="prode-mundial-final.jpg"
          shareText={
            userIsLeader
              ? `Salí campeón del prode con ${formatNetAmount(userInRanking?.netAmount ?? 0)} 🏆`
              : "Así terminó el prode del Mundial"
          }
          label="Compartir resultado"
          className="button-primary"
          style={{ justifyContent: "center" }}
        />
        <Link className="button-secondary" href="/profile" style={{ justifyContent: "space-between" }}>
          <span>Tu resumen</span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link className="button-ghost" href="/matches" style={{ justifyContent: "space-between" }}>
          <span>Ver historial de partidos</span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </>
  );
}
