"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import type { MatchViewModel } from "@/lib/domain";
import { buildWeightedAllocation } from "@/lib/game";
import { saveStoredAllocation } from "@/lib/local-store";

type QuickPlayDeckProps = {
  matches: MatchViewModel[];
};

type PlayStep = "pick" | "intensity";
type SwipeOutcome = "home" | "draw" | "away";

const INTENSITY_OPTIONS = [
  { id: "soft", label: "Suave", hint: "4.000 cr", amount: 4000, icon: ArrowRight },
  { id: "medium", label: "Media", hint: "5.500 cr", amount: 5500, icon: Sparkles },
  { id: "hard", label: "Fuerte", hint: "7.000 cr", amount: 7000, icon: Zap },
];

const OUTCOME_COLORS: Record<SwipeOutcome, string> = {
  home: "#3d9b5f",
  draw: "#5b8ff0",
  away: "#e8413a",
};

export function QuickPlayDeck({ matches }: QuickPlayDeckProps) {
  const playableMatches = useMemo(() => matches.filter((match) => match.isEditable), [matches]);
  const deck = playableMatches.length ? playableMatches : matches;
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<PlayStep>("pick");
  const [selectedOutcome, setSelectedOutcome] = useState<SwipeOutcome | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const homeOpacity = useTransform(x, [10, 110], [0, 1]);
  const awayOpacity = useTransform(x, [-110, -10], [1, 0]);
  const drawOpacity = useTransform(y, [-110, -10], [1, 0]);

  if (!deck.length) {
    return null;
  }

  const match = deck[index] ?? deck[0];
  const canDraw = match.allocation.length === 3;
  const homePick = match.allocation[0]?.label ?? "";
  const drawPick = canDraw ? match.allocation[1]?.label ?? "" : "";
  const awayPick = match.allocation[match.allocation.length - 1]?.label ?? "";
  const chosenLabel =
    selectedOutcome === "home" ? homePick : selectedOutcome === "away" ? awayPick : drawPick;

  function resetCard() {
    setStep("pick");
    setSelectedOutcome(null);
    x.set(0);
    y.set(0);
  }

  function moveNext() {
    setIndex((current) => (current + 1) % deck.length);
    resetCard();
  }

  function chooseOutcome(outcome: SwipeOutcome) {
    setSelectedOutcome(outcome);
    setStep("intensity");
    x.set(0);
    y.set(0);
  }

  function savePlay(focusedAmount: number) {
    const focusedLabel =
      selectedOutcome === "home" ? homePick : selectedOutcome === "away" ? awayPick : drawPick;

    if (!focusedLabel) {
      return;
    }

    const preset = buildWeightedAllocation(
      match.allocation.map((item) => item.label),
      focusedLabel,
      focusedAmount,
    ).map((item) => ({
      label: item.outcomeCode,
      amount: item.amount,
    }));

    saveStoredAllocation(match.id, preset);
    moveNext();
  }

  function pickByGesture(outcome: SwipeOutcome) {
    if (outcome === "draw" && !canDraw) {
      return;
    }
    chooseOutcome(outcome);
  }

  return (
    <section
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          minHeight: 12,
        }}
      >
        {deck.map((_, dotIndex) => (
          <span
            key={`dot-${dotIndex}`}
            style={{
              width: dotIndex === index ? 20 : 6,
              height: 6,
              borderRadius: 999,
              background:
                dotIndex < index
                  ? "#3d9b5f"
                  : dotIndex === index
                    ? "#d4a64b"
                    : "rgba(255,255,255,.12)",
              transition: "all 220ms ease",
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          minHeight: 720,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "16px 22px 84px",
            borderRadius: 34,
            background: "rgba(255,255,255,.08)",
            transform: "scale(.986)",
            zIndex: 0,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "28px 34px 96px",
            borderRadius: 34,
            background: "rgba(255,255,255,.04)",
            transform: "scale(.955)",
            zIndex: 0,
          }}
        />

        <div style={{ position: "relative", flex: 1 }}>
          <AnimatePresence mode="wait">
            {step === "pick" ? (
            <motion.div
              key={`pick-${match.id}`}
              drag
              dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
              dragElastic={0.22}
              onDragEnd={(_, info) => {
                const { x: dx, y: dy } = info.offset;
                if (dx > 90) {
                  pickByGesture("home");
                  return;
                }
                if (dx < -90) {
                  pickByGesture("away");
                  return;
                }
                if (dy < -90) {
                  pickByGesture("draw");
                }
              }}
              style={{
                x,
                y,
                rotate,
                position: "relative",
                zIndex: 2,
                minHeight: 620,
                width: "100%",
                borderRadius: 34,
                overflow: "hidden",
                background: "linear-gradient(160deg, #1f3e28 0%, #0e1d13 100%)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 32px 80px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.04)",
                userSelect: "none",
                touchAction: "pan-y",
                display: "flex",
                flexDirection: "column",
              }}
              initial={{ opacity: 0, scale: 0.94, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -18 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              whileDrag={{ scale: 1.012 }}
            >
              <motion.div
                style={{
                  opacity: homeOpacity,
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(135deg, rgba(61,155,95,.55) 0%, transparent 55%)",
                  pointerEvents: "none",
                }}
              >
                <div style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", display: "grid", gap: 8, justifyItems: "center" }}>
                  <span style={{ fontSize: "3rem", lineHeight: 1 }}>{match.home.flag}</span>
                  <span style={{ color: "#3d9b5f", fontSize: ".72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em" }}>
                    gana local
                  </span>
                </div>
              </motion.div>
              <motion.div
                style={{
                  opacity: awayOpacity,
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(225deg, rgba(232,65,58,.55) 0%, transparent 55%)",
                  pointerEvents: "none",
                }}
              >
                <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", display: "grid", gap: 8, justifyItems: "center" }}>
                  <span style={{ fontSize: "3rem", lineHeight: 1 }}>{match.away.flag}</span>
                  <span style={{ color: "#e8413a", fontSize: ".72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em" }}>
                    visitante
                  </span>
                </div>
              </motion.div>
              {canDraw ? (
                <motion.div
                  style={{
                    opacity: drawOpacity,
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(0deg, rgba(91,143,240,.5) 0%, transparent 50%)",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", display: "grid", gap: 6, justifyItems: "center" }}>
                    <span style={{ fontSize: "2.25rem", lineHeight: 1 }}>🤝</span>
                    <span style={{ color: "#5b8ff0", fontSize: ".72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em" }}>
                      empate
                    </span>
                  </div>
                </motion.div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  padding: 24,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10 }}>
                  <span style={{ color: "#7a9a81", fontSize: ".72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".16em" }}>
                    {match.stage}
                  </span>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "rgba(0,0,0,.3)",
                      border: "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <span style={{ color: "#d4a64b", fontSize: ".74rem", fontWeight: 700 }}>{match.kickoffLabel}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 48px 1fr",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                  }}
                >
                  <TeamColumn flag={match.home.flag} name={match.home.name} sideLabel="Local" />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <span style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "var(--font-barlow-condensed), var(--font-barlow), sans-serif", color: "rgba(255,255,255,.14)" }}>
                      VS
                    </span>
                  </div>
                  <TeamColumn flag={match.away.flag} name={match.away.name} sideLabel="Visitante" />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    paddingTop: 18,
                    borderTop: "1px solid rgba(255,255,255,.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#e8413a", fontSize: ".92rem", fontWeight: 700 }}>←</span>
                    <span style={{ color: "#e8413a", fontSize: ".74rem", fontWeight: 700 }}>visita</span>
                  </div>
                  {canDraw ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#5b8ff0", fontSize: ".74rem", fontWeight: 700 }}>empate</span>
                      <span style={{ color: "#5b8ff0", fontSize: ".92rem", fontWeight: 700 }}>↑</span>
                    </div>
                  ) : <span />}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#3d9b5f", fontSize: ".74rem", fontWeight: 700 }}>local</span>
                    <span style={{ color: "#3d9b5f", fontSize: ".92rem", fontWeight: 700 }}>→</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`intensity-${match.id}-${selectedOutcome}`}
              style={intensityCardStyle}
              initial={{ opacity: 0, scale: 0.98, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -12 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr", alignItems: "center", gap: 10 }}>
                <button type="button" onClick={resetCard} style={topIconStyle} aria-label="Volver">
                  <ArrowLeft size={16} />
                </button>
                <span style={{ color: "rgba(247,241,230,.72)", fontSize: ".74rem", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>
                  Tu pick
                </span>
              </div>

              <div style={heroShellStyle}>
                <div style={choiceBannerStyle}>
                  <p style={{ ...eyebrowStyle, color: selectedOutcome ? OUTCOME_COLORS[selectedOutcome] : "#d4a64b" }}>Tu pick</p>
                  <strong
                    style={{
                      fontFamily: "var(--font-barlow-condensed), var(--font-barlow), sans-serif",
                      fontSize: "2rem",
                      lineHeight: 0.92,
                      letterSpacing: "-0.05em",
                      color: "#fff7ea",
                    }}
                  >
                    {chosenLabel}
                  </strong>
                  <small style={{ color: "rgba(247,241,230,.72)", fontSize: ".8rem" }}>
                    Ahora decí qué tan fuerte entrás.
                  </small>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {INTENSITY_OPTIONS.map((option) => {
                    const Icon = option.icon;

                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        onClick={() => savePlay(option.amount)}
                        whileTap={{ scale: 0.985 }}
                        style={intensityButtonStyle}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 999,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(19,33,22,.08)",
                              color: "#132116",
                            }}
                          >
                            <Icon size={17} />
                          </span>
                          <div style={{ display: "grid", gap: 2, justifyItems: "start" }}>
                            <strong style={{ fontSize: "1.08rem", letterSpacing: "-.04em" }}>{option.label}</strong>
                            <span style={{ color: "#5d695f", fontSize: ".8rem" }}>{option.hint}</span>
                          </div>
                        </div>
                        <span style={{ fontWeight: 900, color: "#132116" }}>{option.amount / 1000}k</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button type="button" onClick={resetCard} style={{ color: "#4a6a4d", fontSize: ".78rem", fontWeight: 700, background: "transparent", border: 0 }}>
                  ← cambiar pick
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {step === "pick" ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                marginTop: 18,
                minHeight: 72,
              }}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => chooseOutcome("away")}
                style={awayDockButtonStyle}
              >
                <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{match.away.flag}</span>
                <span style={dockCodeStyle}>VIS</span>
              </motion.button>
              {canDraw ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => chooseOutcome("draw")}
                  style={drawDockButtonStyle}
                >
                  🤝
                </motion.button>
              ) : null}
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => chooseOutcome("home")}
                style={homeDockButtonStyle}
              >
                <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{match.home.flag}</span>
                <span style={dockCodeStyle}>LOC</span>
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

function TeamColumn({ flag, name, sideLabel }: { flag: string; name: string; sideLabel: string }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 10, textAlign: "center" }}>
      <span style={{ fontSize: "5rem", lineHeight: 1 }}>{flag}</span>
      <strong
        style={{
          color: "#fff7ea",
          fontSize: "1.5rem",
          lineHeight: 0.94,
          letterSpacing: "-.05em",
          fontFamily: "var(--font-barlow-condensed), var(--font-barlow), sans-serif",
          textTransform: "uppercase",
        }}
      >
        {name}
      </strong>
      <span
        style={{
          color: "rgba(122,154,129,.72)",
          fontSize: ".66rem",
          fontWeight: 800,
          letterSpacing: ".16em",
          textTransform: "uppercase",
        }}
      >
        {sideLabel}
      </span>
    </div>
  );
}

const topIconStyle: CSSProperties = {
  width: 40,
  height: 40,
  border: 0,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255,255,255,.08)",
  color: "#f7f1e6",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "rgba(122,154,129,.92)",
  fontSize: ".74rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".16em",
};

const intensityCardStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  minHeight: 620,
  width: "100%",
  borderRadius: 34,
  overflow: "hidden",
  padding: 16,
  background: "linear-gradient(160deg, rgba(61,155,95,.08) 0%, #0e1d13 45%)",
  border: "1px solid rgba(61,155,95,.18)",
  boxShadow: "0 32px 80px rgba(0,0,0,.65), 0 0 50px rgba(61,155,95,.12)",
  display: "grid",
  gap: 18,
};

const heroShellStyle: CSSProperties = {
  display: "grid",
  gap: 18,
  minHeight: 450,
  padding: "18px 16px",
  borderRadius: 28,
  background:
    "radial-gradient(circle at top center, rgba(255,255,255,.09), transparent 36%), linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))",
  border: "1px solid rgba(255,255,255,.08)",
};

const choiceBannerStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  padding: "14px 15px",
  borderRadius: 22,
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.08)",
};

const intensityButtonStyle: CSSProperties = {
  minHeight: 86,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 16px",
  border: 0,
  borderRadius: 24,
  background: "rgba(255,255,255,.92)",
  color: "#132116",
  boxShadow: "inset 0 0 0 1px rgba(20,32,20,.06), 0 12px 24px rgba(17,34,23,.08)",
  textAlign: "left",
};

const jugarmelaButtonStyle: CSSProperties = {
  minHeight: 52,
  border: 0,
  borderRadius: 999,
  background: "linear-gradient(180deg,#f3ca68,#d9ab3d)",
  color: "#132116",
  fontSize: ".98rem",
  fontWeight: 900,
};

const dockCodeStyle: CSSProperties = {
  fontSize: ".5rem",
  fontWeight: 800,
  letterSpacing: ".16em",
  textTransform: "uppercase",
};

const homeDockButtonStyle: CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 999,
  border: "1.5px solid rgba(61,155,95,.35)",
  background: "rgba(61,155,95,.12)",
  boxShadow: "0 4px 20px rgba(61,155,95,.18)",
  color: "#3d9b5f",
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
};

const awayDockButtonStyle: CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 999,
  border: "1.5px solid rgba(232,65,58,.35)",
  background: "rgba(232,65,58,.12)",
  boxShadow: "0 4px 20px rgba(232,65,58,.18)",
  color: "#e8413a",
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
};

const drawDockButtonStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 999,
  border: "1.5px solid rgba(91,143,240,.35)",
  background: "rgba(91,143,240,.12)",
  boxShadow: "0 4px 20px rgba(91,143,240,.16)",
  color: "#5b8ff0",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
