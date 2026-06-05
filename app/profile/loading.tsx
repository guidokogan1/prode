export default function ProfileLoading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section style={{ display: "grid", gap: 16 }}>
        <div className="title-stack" style={{ gap: 6, paddingTop: 8 }}>
          <div className="loading-block" style={{ width: 196, height: 38, borderRadius: 14 }} />
          <div className="loading-block" style={{ width: 96, height: 12 }} />
        </div>

        <div className="compact-grid-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`profile-stat-loading-${index}`}
              className="surface-card-soft loading-shell"
              style={{ minHeight: 95, borderRadius: 16, padding: "14px 12px", display: "grid", placeItems: "center" }}
            >
              <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                <div className="loading-block" style={{ width: 22, height: 22, borderRadius: 999 }} />
                <div className="loading-block" style={{ width: 64, height: 18 }} />
                <div className="loading-block" style={{ width: 74, height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="surface-card-soft loading-shell"
        style={{ borderRadius: 18, padding: 14, display: "grid", gap: 10 }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div className="loading-block" style={{ width: 72, height: 10 }} />
          <div className="loading-block" style={{ width: 188, height: 26, borderRadius: 12 }} />
          <div className="loading-block" style={{ width: 232, height: 12 }} />
        </div>
        <div className="loading-block" style={{ width: "100%", height: 52, borderRadius: 12 }} />
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <div className="stack-sm" style={{ display: "grid", gap: 6 }}>
          <div className="loading-block" style={{ width: 64, height: 10 }} />
          <div className="loading-block" style={{ width: 168, height: 22, borderRadius: 10 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10 }}>
          <div className="loading-block" style={{ width: "100%", height: 52, borderRadius: 12 }} />
          <div className="loading-block" style={{ width: 52, height: 52, borderRadius: 12 }} />
        </div>
      </section>
    </main>
  );
}
