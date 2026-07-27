"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { RankingTimeline } from "@/lib/domain";
import { formatGross } from "@/lib/format";

type RankingTimelineDrawerProps = {
  timeline: RankingTimeline;
  selectedUserName: string | null;
  onClose: () => void;
};

export function RankingTimelineDrawer({ timeline, selectedUserName, onClose }: RankingTimelineDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedUserName) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [selectedUserName, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {selectedUserName ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(4, 7, 11, 0.72)",
            backdropFilter: "blur(6px)",
          }}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Evolución del jugador"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: "100%",
              width: "min(440px, 100%)",
              background: "var(--bg-elevated, #0f151d)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              overflowY: "auto",
              padding: "20px 22px calc(var(--bottom-nav-height, 0px) + var(--safe-bottom, 0px) + 32px)",
              display: "grid",
              gap: 20,
              alignContent: "start",
            }}
          >
            <DrawerContent timeline={timeline} selectedUserName={selectedUserName} onClose={onClose} />
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function DrawerContent({ timeline, selectedUserName, onClose }: { timeline: RankingTimeline; selectedUserName: string; onClose: () => void }) {
  const selected = timeline.entries.find((entry) => entry.userName === selectedUserName) ?? null;

  const stats = useMemo(() => {
    if (!selected) return null;
    const final = selected.points[selected.points.length - 1] ?? 0;
    const deltas = selected.points.map((p, i) => (i === 0 ? p : p - selected.points[i - 1]));
    const bestDelta = Math.max(0, ...deltas);
    const hits = deltas.filter((d) => d > 0).length;
    return { final, bestDelta, hits, total: deltas.length };
  }, [selected]);

  return (
    <>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="title-stack" style={{ gap: 4 }}>
          <p className="eyebrow">Evolución</p>
          <h2 className="display-title" style={{ fontSize: "1.4rem" }}>{selectedUserName}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
      </header>

      {!selected || selected.points.length === 0 ? (
        <p className="muted-copy">Todavía no hay partidos liquidados para mostrar la evolución.</p>
      ) : (
        <>
          <TimelineChart timeline={timeline} selectedUserName={selectedUserName} />
          {stats ? (
            <div className="compact-grid-2" style={{ gap: 10 }}>
              <StatBlock label="Total" value={formatGross(stats.final)} />
              <StatBlock label="Aciertos" value={`${stats.hits}/${stats.total}`} />
              <StatBlock label="Mejor jugada" value={formatGross(stats.bestDelta)} />
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

function TimelineChart({ timeline, selectedUserName }: { timeline: RankingTimeline; selectedUserName: string }) {
  const width = 380;
  const height = 220;
  const paddingX = 12;
  const paddingY = 16;
  const n = timeline.matchLabels.length;

  const allValues = timeline.entries.flatMap((e) => e.points);
  const maxY = Math.max(1, ...allValues);

  const x = (i: number) => paddingX + (i * (width - paddingX * 2)) / Math.max(1, n - 1);
  const y = (v: number) => height - paddingY - (v / maxY) * (height - paddingY * 2);

  const toPath = (points: number[]) => points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");

  const others = timeline.entries.filter((e) => e.userName !== selectedUserName);
  const selected = timeline.entries.find((e) => e.userName === selectedUserName);

  return (
    <div
      className="surface-card-soft"
      style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)" }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {others.map((entry) => (
          <path
            key={entry.userName}
            d={toPath(entry.points)}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1.2}
          />
        ))}
        {selected ? (
          <>
            <path
              d={toPath(selected.points)}
              fill="none"
              stroke="#3fe3f2"
              strokeWidth={2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {selected.points.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p)} r={2.4} fill="#3fe3f2" />
            ))}
          </>
        ) : null}
      </svg>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card-soft soft-panel-md" style={{ textAlign: "center", background: "rgba(255,255,255,0.035)", paddingBlock: 10, display: "grid", gap: 3 }}>
      <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.15rem", letterSpacing: "-0.04em" }}>{value}</strong>
      <span className="micro-copy" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}
