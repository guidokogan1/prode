"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { formatGross } from "@/lib/format";

type WinnerCelebrationOverlayProps = {
  userName: string;
  netAmount: number;
  grossAmount: number;
  winnerTeamName: string;
  winnerTeamFlag: string;
  storageKey: string;
};

const CONFETTI_SLOTS = Array.from({ length: 18 });

export function WinnerCelebrationOverlay({
  userName,
  netAmount: _netAmount,
  grossAmount,
  winnerTeamName,
  winnerTeamFlag,
  storageKey,
}: WinnerCelebrationOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(storageKey) === "celebrated") {
        return;
      }
    } catch {
      // ignore
    }
    setVisible(true);
  }, [storageKey]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey, "celebrated");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={dismiss}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(4, 7, 11, 0.82)",
            backdropFilter: "blur(8px)",
          }}
        >
          {CONFETTI_SLOTS.map((_, index) => (
            <span
              key={`confetti-${index}`}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: `${(index * 17) % 100}%`,
                top: `-${10 + (index % 5) * 4}%`,
                fontSize: `${0.9 + (index % 4) * 0.25}rem`,
                animation: `winner-confetti-fall ${4 + (index % 5)}s linear ${index * 0.18}s infinite`,
              }}
            >
              {index % 3 === 0 ? "🎉" : index % 3 === 1 ? "✨" : "⭐"}
            </span>
          ))}

          <motion.div
            initial={{ scale: 0.86, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 8 }}
            transition={{ type: "spring", stiffness: 230, damping: 22 }}
            onClick={(event) => event.stopPropagation()}
            className="surface-card-strong"
            style={{
              position: "relative",
              maxWidth: 360,
              width: "100%",
              padding: "26px 22px 22px",
              display: "grid",
              gap: 14,
              textAlign: "center",
              background: "linear-gradient(160deg, rgba(63,227,242,0.22) 0%, rgba(15,21,29,0.97) 70%)",
              borderColor: "rgba(63,227,242,0.36)",
              boxShadow: "0 18px 42px rgba(0,0,0,0.4), 0 0 0 1px rgba(63,227,242,0.16)",
            }}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Cerrar"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-secondary)",
              }}
            >
              <X size={14} />
            </button>

            <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
              <span style={{ fontSize: "2.6rem" }}>🏆</span>
              <p className="eyebrow" style={{ color: "var(--gold)" }}>Salís campeón del prode</p>
              <h2 className="display-title" style={{ fontSize: "clamp(1.8rem, 7vw, 2.3rem)", color: "var(--gold)" }}>
                {userName}
              </h2>
              <p className="muted-copy">
                Total final {formatGross(grossAmount)} · Campeón {winnerTeamFlag} {winnerTeamName}
              </p>
            </div>

            <button
              type="button"
              className="button-primary"
              onClick={dismiss}
              style={{ width: "100%" }}
            >
              Ver mi resumen
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
