export default function HistoryLoading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section className="surface-card loading-shell" style={{ display: "grid", gap: 10, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
          <div className="title-stack" style={{ gap: 6 }}>
            <div className="loading-block" style={{ width: 56, height: 10 }} />
            <div className="loading-block" style={{ width: 168, height: 32, borderRadius: 12 }} />
          </div>
          <div className="loading-block" style={{ width: 36, height: 22, borderRadius: 999 }} />
        </div>
        <div className="loading-block" style={{ width: 224, height: 12 }} />
      </section>

      <div style={{ display: "grid", gap: 10 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={`history-loading-${index}`}
            className="surface-card-soft loading-shell"
            style={{ padding: 14, borderRadius: 14, display: "grid", gap: 10 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div className="loading-block" style={{ width: 158, height: 16 }} />
                <div className="loading-block" style={{ width: 96, height: 10 }} />
              </div>
              <div className="loading-block" style={{ width: 72, height: 20 }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div className="loading-block" style={{ width: 88, height: 22, borderRadius: 999 }} />
              <div className="loading-block" style={{ width: 132, height: 10 }} />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {Array.from({ length: 2 }).map((__, rowIndex) => (
                <div
                  key={`history-row-${index}-${rowIndex}`}
                  className="surface-card-soft"
                  style={{ padding: "9px 10px", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="loading-block" style={{ width: 96, height: 12 }} />
                  <div className="loading-block" style={{ width: 56, height: 14 }} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
