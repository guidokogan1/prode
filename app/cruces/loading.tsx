export default function CrucesLoading() {
  return (
    <div className="cruces-takeover">
      <div className="cruces-inner">
        <div className="cruces-hdr">
          <div className="cruces-hdr-top">
            <div className="loading-block" style={{ width: 40, height: 40, borderRadius: 999 }} />
          </div>
          <div className="loading-block" style={{ width: 110, height: 12, marginBottom: 6 }} />
          <div className="loading-block" style={{ width: 150, height: 36, borderRadius: 12 }} />
        </div>
        <div style={{ padding: "8px 16px", display: "grid", gap: 9 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`cruces-load-${index}`} className="loading-block" style={{ width: "100%", height: 120, borderRadius: 14 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
