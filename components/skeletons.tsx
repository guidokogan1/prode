export function MatchCardSkeleton() {
  return (
    <div
      className="surface-card-soft loading-shell"
      style={{
        padding: "16px 16px 14px",
        borderRadius: 18,
        display: "grid",
        gap: 13,
        minHeight: 132,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="loading-block" style={{ width: 64, height: 22, borderRadius: 999 }} />
          <div className="loading-block" style={{ width: 52, height: 10 }} />
        </div>
        <div className="loading-block" style={{ width: 84, height: 12 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="loading-block" style={{ width: 24, height: 24, borderRadius: 999 }} />
          <div className="loading-block" style={{ width: 88, height: 14 }} />
        </div>
        <div className="loading-block" style={{ width: 22, height: 14 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <div className="loading-block" style={{ width: 88, height: 14 }} />
          <div className="loading-block" style={{ width: 24, height: 24, borderRadius: 999 }} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 11,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div className="loading-block" style={{ width: 56, height: 10 }} />
          <div className="loading-block" style={{ width: 96, height: 14 }} />
        </div>
        <div className="loading-block" style={{ width: 76, height: 12 }} />
      </div>
    </div>
  );
}

type DaySectionSkeletonProps = {
  cardCount?: number;
};

export function DaySectionSkeleton({ cardCount = 3 }: DaySectionSkeletonProps) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="loading-block" style={{ width: 168, height: 22, borderRadius: 12 }} />
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        <div className="loading-block" style={{ width: 68, height: 22, borderRadius: 999 }} />
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {Array.from({ length: cardCount }).map((_, index) => (
          <MatchCardSkeleton key={`day-card-skeleton-${index}`} />
        ))}
      </div>
    </section>
  );
}
