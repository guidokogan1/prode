export default function ProfileLoading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section className="surface-card-strong loading-shell" style={{ padding: 22, borderRadius: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div className="loading-block" style={{ width: 64, height: 64, borderRadius: 999 }} />
            <div className="loading-block" style={{ width: 44, height: 12 }} />
            <div className="loading-block" style={{ width: 176, height: 48, borderRadius: 16 }} />
            <div className="loading-block" style={{ width: 240, height: 14, borderRadius: 10 }} />
          </div>
          <div className="surface-card-soft loading-shell" style={{ width: 138, height: 84, borderRadius: 16 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`profile-stat-loading-${index}`} className="surface-card-soft loading-shell" style={{ minHeight: 110, borderRadius: 16, padding: "14px 12px" }}>
              <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                <div className="loading-block" style={{ width: 18, height: 18, borderRadius: 999 }} />
                <div className="loading-block" style={{ width: 82, height: 16 }} />
                <div className="loading-block" style={{ width: 58, height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {Array.from({ length: 3 }).map((_, index) => (
        <section key={`profile-section-loading-${index}`} className="surface-card-soft loading-shell" style={{ minHeight: 110, borderRadius: 24, padding: 18 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="loading-block" style={{ width: 116, height: 12 }} />
            <div className="loading-block" style={{ width: 186, height: 34, borderRadius: 14 }} />
            <div className="loading-block" style={{ width: "100%", height: 52, borderRadius: 16 }} />
          </div>
        </section>
      ))}
    </main>
  );
}
