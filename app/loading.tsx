export default function Loading() {
  return (
    <main className="page-shell" style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <div
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          border: "2px solid rgba(212,166,75,0.18)",
          borderTopColor: "#D4A64B",
          animation: "spin 700ms linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
