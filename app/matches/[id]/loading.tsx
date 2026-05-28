export default function MatchLoading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section className="surface-card-strong loading-shell" style={{ padding: 22, display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div className="loading-block" style={{ width: 164, height: 28, borderRadius: 999 }} />
            <div className="loading-block" style={{ width: 176, height: 14, borderRadius: 10 }} />
          </div>
          <div className="loading-block" style={{ width: 88, height: 32, borderRadius: 999 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 18 }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
            <div className="loading-block" style={{ width: 58, height: 58, borderRadius: 999 }} />
            <div className="loading-block" style={{ width: 118, height: 24, borderRadius: 12 }} />
          </div>
          <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
            <div className="loading-block" style={{ width: 102, height: 54, borderRadius: 18 }} />
            <div className="loading-block" style={{ width: 96, height: 14, borderRadius: 10 }} />
          </div>
          <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
            <div className="loading-block" style={{ width: 58, height: 58, borderRadius: 999 }} />
            <div className="loading-block" style={{ width: 118, height: 24, borderRadius: 12 }} />
          </div>
        </div>

        <div className="surface-card-soft" style={{ padding: "14px 16px", borderRadius: 16 }}>
          <div className="loading-block" style={{ width: "100%", height: 54, borderRadius: 14 }} />
        </div>
      </section>

      <section className="surface-card-soft loading-shell" style={{ minHeight: 250, borderRadius: 24, padding: 18 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div className="loading-block" style={{ width: 112, height: 12 }} />
          <div className="loading-block" style={{ width: 192, height: 42, borderRadius: 16 }} />
          <div className="loading-block" style={{ width: "100%", height: 132, borderRadius: 18 }} />
        </div>
      </section>

      <section className="surface-card-soft loading-shell" style={{ minHeight: 210, borderRadius: 24, padding: 18 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div className="loading-block" style={{ width: 94, height: 12 }} />
          <div className="loading-block" style={{ width: 240, height: 40, borderRadius: 16 }} />
          <div className="loading-block" style={{ width: "100%", height: 118, borderRadius: 18 }} />
        </div>
      </section>
    </main>
  );
}
