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

      {Array.from({ length: 2 }).map((_, groupIndex) => (
        <section key={`matches-loading-group-${groupIndex}`} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <div className="loading-block" style={{ width: 112, height: 18, borderRadius: 10 }} />
              <div className="loading-block" style={{ width: 92, height: 10 }} />
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <div className="loading-block" style={{ width: 76, height: 22, borderRadius: 999 }} />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: 3 }).map((__, cardIndex) => (
              <MatchCardSkeleton key={`matches-loading-card-${groupIndex}-${cardIndex}`} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
