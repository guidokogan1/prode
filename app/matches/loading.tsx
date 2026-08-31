import { MatchCardSkeleton } from "@/components/skeletons";

export default function MatchesLoading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 22 }}>
      <section style={{ display: "grid", gap: 8, paddingTop: 4 }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "grid", gap: 6, flex: 1 }}>
            <div className="loading-block" style={{ width: 96, height: 10 }} />
            <div className="loading-block" style={{ width: 168, height: 38, borderRadius: 14 }} />
            <div className="loading-block" style={{ width: 132, height: 12 }} />
          </div>
          <div className="loading-block" style={{ width: 78, height: 28, borderRadius: 999, marginTop: 4 }} />
        </div>
      </section>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="loading-block" style={{ width: 40, height: 40, borderRadius: 12 }} />
        <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
          <div className="loading-block" style={{ width: 64, height: 10 }} />
          <div className="loading-block" style={{ width: 96, height: 18, borderRadius: 8 }} />
          <div className="loading-block" style={{ width: 84, height: 10 }} />
        </div>
        <div className="loading-block" style={{ width: 40, height: 40, borderRadius: 12 }} />
      </div>

      {Array.from({ length: 2 }).map((_, dayIndex) => (
        <section key={`matches-loading-day-${dayIndex}`} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="loading-block" style={{ width: 80, height: 12 }} />
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: dayIndex === 0 ? 3 : 2 }).map((__, cardIndex) => (
              <MatchCardSkeleton key={`matches-loading-card-${dayIndex}-${cardIndex}`} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
