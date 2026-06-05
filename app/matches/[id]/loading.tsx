export default function MatchLoading() {
  return (
    <main className="page-shell page-scroll section-stack-lg">
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ paddingInline: 4 }}>
          <div className="loading-block" style={{ width: 92, height: 38, borderRadius: 999 }} />
        </div>

        <div className="surface-card loading-shell" style={{ padding: 12, position: "relative", overflow: "visible" }}>
          <div style={{ minHeight: 250, display: "grid", gap: 14, padding: 14, borderRadius: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div className="loading-block" style={{ width: 132, height: 12 }} />
              <div className="loading-block" style={{ width: 84, height: 22, borderRadius: 999 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: 12, alignItems: "center" }}>
              {[0, 1, 2].map((slot) => (
                <div key={`match-loading-team-${slot}`} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
                  {slot === 1 ? (
                    <div className="loading-block" style={{ width: 28, height: 18 }} />
                  ) : (
                    <>
                      <div className="loading-block" style={{ width: 56, height: 56, borderRadius: 999 }} />
                      <div className="loading-block" style={{ width: 92, height: 16 }} />
                      <div className="loading-block" style={{ width: 56, height: 10 }} />
                    </>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="loading-block" style={{ width: 92, height: 12 }} />
              <div className="loading-block" style={{ width: 56, height: 12, justifySelf: "center" }} />
              <div className="loading-block" style={{ width: 92, height: 12, justifySelf: "end" }} />
            </div>
          </div>
        </div>
      </div>

      <section className="surface-card-soft loading-shell" style={{ borderRadius: 22, padding: 18, display: "grid", gap: 12 }}>
        <div className="loading-block" style={{ width: 96, height: 10 }} />
        <div className="loading-block" style={{ width: 168, height: 24, borderRadius: 12 }} />
        <div style={{ display: "grid", gap: 8 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`match-loading-row-${index}`}
              className="surface-card-soft"
              style={{ padding: "10px 12px", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="loading-block" style={{ width: 20, height: 20, borderRadius: 999 }} />
                <div className="loading-block" style={{ width: 88, height: 14 }} />
              </div>
              <div className="loading-block" style={{ width: 64, height: 14 }} />
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card-soft loading-shell" style={{ borderRadius: 22, padding: 18, display: "grid", gap: 12 }}>
        <div className="loading-block" style={{ width: 84, height: 10 }} />
        <div className="loading-block" style={{ width: 188, height: 22, borderRadius: 12 }} />
        <div className="loading-block" style={{ width: "100%", height: 96, borderRadius: 14 }} />
      </section>
    </main>
  );
}
