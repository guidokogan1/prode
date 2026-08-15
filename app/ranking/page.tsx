import Link from "next/link";
import { Trophy } from "lucide-react";
import { LeaderboardPodium } from "@/components/leaderboard-podium";
import { RankingList } from "@/components/ranking-list";
import { ShareByIdButton } from "@/components/share-by-id-button";
import { formatGross } from "@/lib/format";
import { getRanking } from "@/lib/repositories/ranking";
import { getRankingTimeline } from "@/lib/repositories/timeline";
import { getTournamentFinalState } from "@/lib/repositories/tournament";
import { requireSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  await requireSession();

  const [ranking, tournament, timeline] = await Promise.all([getRanking(), getTournamentFinalState(), getRankingTimeline()]);
  const currentUser = ranking.find((item) => item.isCurrentUser) ?? null;
  const leader = ranking[0] ?? null;
  const finished = tournament.finished;

  if (!ranking.length) {
    return (
      <main
        className="page-shell page-scroll"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 14,
          minHeight: "68vh",
          fontFamily: "var(--font-body)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Trophy size={25} strokeWidth={1.8} color="var(--text-tertiary)" />
        </div>
        <h1 className="display-title" style={{ margin: 0 }}>Todavía no hay tabla</h1>
        <p className="muted-copy" style={{ maxWidth: 320 }}>
          Se arma sola cuando se liquiden los primeros partidos. Mientras tanto, cargá tus jugadas.
        </p>
        <Link href="/matches" className="button-secondary" style={{ marginTop: 6, minHeight: 40 }}>
          Ir a Partidos
        </Link>
      </main>
    );
  }

  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18, fontFamily: "var(--font-body)" }} id="ranking-share-target">
      <section className="title-stack" style={{ paddingTop: 8, gap: 6 }}>
        <div className="split-row" style={{ alignItems: "start", gap: 12 }}>
          <div className="title-stack" style={{ gap: 6 }}>
            {finished ? <p className="eyebrow" style={{ color: "var(--gold)" }}>Torneo terminado</p> : null}
            <h1 className="display-title">{finished ? "Tabla final" : "Tabla actual"}</h1>
            {finished && tournament.winnerTeam ? (
              <p className="muted-copy">
                Campeón {tournament.winnerTeam.flag} {tournament.winnerTeam.name}
              </p>
            ) : null}
          </div>
          <ShareByIdButton
            targetId="ranking-share-target"
            fileName="prode-tabla.jpg"
            shareText={finished ? "Cómo terminó la tabla del prode" : "Así va la tabla del prode"}
            label="Compartir"
          />
        </div>
      </section>

      <section className="two-col-grid">
        {currentUser ? (
          <section className="surface-card-soft soft-panel section-stack" style={{ background: "rgba(255,255,255,0.05)" }}>
            <span className="micro-copy">Tu puesto</span>
            <div className="split-row">
              <strong style={{ fontSize: "1.05rem", textTransform: "uppercase" }}>#{currentUser.position} {currentUser.name}</strong>
              <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.4rem", letterSpacing: "-0.05em", color: currentUser.grossAmount > 0 ? "var(--gold)" : "var(--text-secondary)" }}>{formatGross(currentUser.grossAmount)}</strong>
            </div>
          </section>
        ) : null}
        {leader ? (
          <section className="surface-card-soft soft-panel section-stack" style={{ background: "rgba(63,227,242,0.06)", borderColor: "rgba(63,227,242,0.18)" }}>
            <span className="micro-copy">Líder</span>
            <div className="split-row">
              <strong style={{ fontSize: "1.05rem", textTransform: "uppercase" }}>#{leader.position} {leader.name}</strong>
              <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.4rem", letterSpacing: "-0.05em", color: leader.grossAmount > 0 ? "var(--gold)" : "var(--text-secondary)" }}>{formatGross(leader.grossAmount)}</strong>
            </div>
          </section>
        ) : null}
      </section>

      <LeaderboardPodium items={ranking} />

      <section className="section-stack" style={{ gap: 12 }}>
        <div className="split-row">
          <h2 className="section-title">General</h2>
          <span className="pill">{ranking.length}</span>
        </div>
        <RankingList items={ranking} timeline={timeline} />
      </section>
    </main>
  );
}
