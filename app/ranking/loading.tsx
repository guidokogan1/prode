export default function RankingLoading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section style={{ display: "grid", gap: 8 }}>
        <div className="loading-block" style={{ width: 62, height: 12 }} />
        <div className="loading-block" style={{ width: 228, height: 54, borderRadius: 18 }} />
        <div className="loading-block" style={{ width: 264, height: 15, borderRadius: 10 }} />
      </section>

      <section className="surface-card-soft loading-shell" style={{ minHeight: 188, borderRadius: 24, padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "end", height: "100%" }}>
          {["18%", "34%", "14%"].map((height, index) => (
            <div key={`ranking-podium-loading-${index}`} style={{ display: "grid", gap: 8, justifyItems: "center" }}>
              <div className="loading-block" style={{ width: 42, height: 42, borderRadius: 999 }} />
              <div className="loading-block" style={{ width: 72, height: 12 }} />
              <div className="loading-block" style={{ width: "100%", height, borderRadius: 20 }} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div className="loading-block" style={{ width: 142, height: 34, borderRadius: 14 }} />
          <div className="loading-block" style={{ width: 70, height: 28, borderRadius: 999 }} />
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`ranking-row-loading-${index}`} className="surface-card-soft loading-shell" style={{ minHeight: 72, borderRadius: 18, padding: "14px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 38px minmax(0, 1fr) 72px", gap: 12, alignItems: "center" }}>
                <div className="loading-block" style={{ width: 18, height: 18 }} />
                <div className="loading-block" style={{ width: 38, height: 38, borderRadius: 999 }} />
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="loading-block" style={{ width: 118, height: 16 }} />
                  <div className="loading-block" style={{ width: 156, height: 12 }} />
                </div>
                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                  <div className="loading-block" style={{ width: 64, height: 20 }} />
                  <div className="loading-block" style={{ width: 48, height: 12 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
