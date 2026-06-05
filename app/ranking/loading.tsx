export default function RankingLoading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section className="title-stack" style={{ paddingTop: 8, gap: 6 }}>
        <div className="loading-block" style={{ width: 196, height: 38, borderRadius: 14 }} />
      </section>

      <div className="two-col-grid">
        {Array.from({ length: 2 }).map((_, index) => (
          <section
            key={`ranking-summary-loading-${index}`}
            className="surface-card-soft loading-shell"
            style={{ minHeight: 76, borderRadius: 16, padding: "14px 16px", display: "grid", gap: 8 }}
          >
            <div className="loading-block" style={{ width: 64, height: 10 }} />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div className="loading-block" style={{ width: 132, height: 16 }} />
              <div className="loading-block" style={{ width: 64, height: 20 }} />
            </div>
          </section>
        ))}
      </div>

      <section className="surface-card-strong loading-shell" style={{ padding: 18, borderRadius: 22 }}>
        <div style={{ display: "grid", gap: 4, marginBottom: 14 }}>
          <div className="loading-block" style={{ width: 48, height: 10 }} />
          <div className="loading-block" style={{ width: 142, height: 22, borderRadius: 10 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, alignItems: "end" }}>
          {[80, 104, 64].map((height, index) => (
            <div key={`ranking-podium-loading-${index}`} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
              <div className="loading-block" style={{ width: 22, height: 22, borderRadius: 999 }} />
              <div className="loading-block" style={{ width: 42, height: 42, borderRadius: 999 }} />
              <div className="loading-block" style={{ width: "100%", height, borderRadius: 14 }} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <article
            key={`ranking-row-loading-${index}`}
            className="surface-card-soft loading-shell"
            style={{
              padding: "15px 16px",
              borderRadius: 16,
              display: "grid",
              gridTemplateColumns: "24px 38px minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div className="loading-block" style={{ width: 18, height: 18 }} />
            <div className="loading-block" style={{ width: 38, height: 38, borderRadius: 999 }} />
            <div style={{ display: "grid", gap: 6 }}>
              <div className="loading-block" style={{ width: 132, height: 14 }} />
              <div className="loading-block" style={{ width: 96, height: 10 }} />
            </div>
            <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
              <div className="loading-block" style={{ width: 64, height: 18 }} />
              <div className="loading-block" style={{ width: 48, height: 10 }} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
