import { DaySectionSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
          <div style={{ display: "grid", gap: 8, flex: 1 }}>
            <div className="loading-block" style={{ width: 96, height: 10 }} />
            <div className="loading-block" style={{ width: 188, height: 38, borderRadius: 14 }} />
          </div>
          <div className="loading-block" style={{ width: 96, height: 64, borderRadius: 12 }} />
        </div>
      </section>

      <DaySectionSkeleton cardCount={3} />
    </main>
  );
}
