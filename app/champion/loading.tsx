export default function ChampionLoading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="loading-block" style={{ width: 92, height: 38, borderRadius: 999 }} />
      </div>

      <section className="section-stack" style={{ gap: 14 }}>
        <div className="title-stack" style={{ gap: 6 }}>
          <div className="loading-block" style={{ width: 64, height: 10 }} />
          <div className="loading-block" style={{ width: 232, height: 38, borderRadius: 14 }} />
          <div className="loading-block" style={{ width: 280, height: 12 }} />
        </div>

        <section
          className="surface-card-soft loading-shell"
          style={{ padding: 14, borderRadius: 18, display: "grid", gap: 8 }}
        >
          <div className="loading-block" style={{ width: 72, height: 10 }} />
          <div className="loading-block" style={{ width: 188, height: 22, borderRadius: 10 }} />
          <div className="loading-block" style={{ width: 244, height: 10 }} />
        </section>

        {Array.from({ length: 2 }).map((_, groupIndex) => (
          <section key={`champion-loading-group-${groupIndex}`} className="section-stack" style={{ gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="loading-block" style={{ width: 84, height: 10 }} />
              <div className="loading-block" style={{ width: 64, height: 10 }} />
            </div>
            <div className="compact-grid-2" style={{ gap: 10 }}>
              {Array.from({ length: 4 }).map((__, teamIndex) => (
                <div
                  key={`champion-loading-team-${groupIndex}-${teamIndex}`}
                  className="surface-card-soft loading-shell"
                  style={{
                    minHeight: 64,
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="loading-block" style={{ width: 22, height: 22, borderRadius: 6 }} />
                    <div className="loading-block" style={{ width: 92, height: 14 }} />
                  </div>
                  <div className="loading-block" style={{ width: 44, height: 10 }} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
