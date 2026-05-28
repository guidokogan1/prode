export default function MatchesLoading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 22 }}>
      <section style={{ display: "grid", gap: 10, paddingTop: 8 }}>
        <div className="loading-block" style={{ width: 112, height: 12 }} />
        <div className="loading-block" style={{ width: 240, height: 58, borderRadius: 20 }} />
        <div className="loading-block" style={{ width: 296, height: 16, borderRadius: 10 }} />
      </section>

      {Array.from({ length: 2 }).map((_, groupIndex) => (
        <section key={`matches-loading-group-${groupIndex}`} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div className="loading-block" style={{ width: 132, height: 12 }} />
              <div className="loading-block" style={{ width: 186, height: 34, borderRadius: 14 }} />
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
            <div className="loading-block" style={{ width: 58, height: 12 }} />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: 3 }).map((__, cardIndex) => (
              <div
                key={`matches-loading-card-${groupIndex}-${cardIndex}`}
                className="surface-card-soft loading-shell"
                style={{
                  minHeight: 82,
                  borderRadius: 18,
                  padding: "14px 16px",
                  display: "grid",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="loading-block" style={{ width: 10, height: 10 }} />
                  <div className="loading-block" style={{ width: 156, height: 22, borderRadius: 12 }} />
                  <div style={{ flex: 1 }} />
                  <div className="loading-block" style={{ width: 88, height: 14, borderRadius: 10 }} />
                  <div className="loading-block" style={{ width: 64, height: 28, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
