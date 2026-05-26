"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  SkipForward,
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
  { id: "hard", label: "Fuerte", hint: "7.000 al pick", amount: 7000, icon: Zap },
  { id: "medium", label: "Media", hint: "5.500 al pick", amount: 5500, icon: Sparkles },
  { id: "soft", label: "Suave", hint: "4.000 al pick", amount: 4000, icon: ArrowRight },
];

const OUTCOME_COLORS: Record<SwipeOutcome, string> = {
  home: "#d4a64b",
  draw: "#5b8ff0",
  away: "#3d9b5f",
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
  const nextMatch = deck[index + 1] ?? null;
  const canDraw = match.allocation.length === 3;
  const progress = `${index + 1} / ${deck.length}`;
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

  const dragState: SwipeOutcome | null =
    y.get() < -90 && canDraw ? "draw" : x.get() > 90 ? "home" : x.get() < -90 ? "away" : null;

  return (
    <section
      style={{
        width: "100%",
        display: "grid",
        gap: 18,
        justifyItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          padding: "8px 0 16px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "18px 24px -8px",
            borderRadius: 34,
            background: "rgba(9, 20, 9, 0.28)",
            transform: "scale(.985)",
            zIndex: 0,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "32px 36px -16px",
            borderRadius: 34,
            background: "rgba(9, 20, 9, 0.16)",
            transform: "scale(.95)",
            zIndex: 0,
          }}
        />

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
                minHeight: 650,
                width: "100%",
                borderRadius: 34,
                overflow: "hidden",
                padding: 16,
                background:
                  "radial-gradient(circle at top center, rgba(255,226,155,.18), transparent 24%), radial-gradient(circle at bottom right, rgba(72,176,120,.22), transparent 34%), linear-gradient(180deg, #183727 0%, #12281d 38%, #0f2219 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 30px 70px rgba(8,16,12,.36), 0 12px 24px rgba(8,16,12,.24)",
                userSelect: "none",
                touchAction: "pan-y",
                display: "grid",
                gap: 18,
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
                  background: "linear-gradient(135deg, rgba(212,166,75,.26) 0%, transparent 55%)",
                  pointerEvents: "none",
                }}
              />
              <motion.div
                style={{
                  opacity: awayOpacity,
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(225deg, rgba(61,155,95,.22) 0%, transparent 55%)",
                  pointerEvents: "none",
                }}
              />
              {canDraw ? (
                <motion.div
                  style={{
                    opacity: drawOpacity,
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(91,143,240,.22) 0%, transparent 42%)",
                    pointerEvents: "none",
                  }}
                />
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr auto",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={moveNext}
                  style={topIconStyle}
                  aria-label="Saltar al siguiente partido"
                >
                  <SkipForward size={16} />
                </button>
                <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                  {deck.map((_, dotIndex) => (
                    <span
                      key={`dot-${dotIndex}`}
                      style={{
                        width: dotIndex === index ? 20 : 10,
                        height: 4,
                        borderRadius: 999,
                        background: dotIndex === index ? "#f3ca68" : "rgba(255,255,255,.14)",
                      }}
                    />
                  ))}
                </div>
                <span style={progressPillStyle}>{progress}</span>
              </div>

              <div
                style={{
                  position: "absolute",
                  inset: "66px 16px auto",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  pointerEvents: "none",
                }}
              >
                <GesturePill active={dragState === "home"} color={OUTCOME_COLORS.home} align="left">
                  <ArrowRight size={13} />
                  {homePick}
                </GesturePill>
                {canDraw ? (
                  <GesturePill active={dragState === "draw"} color={OUTCOME_COLORS.draw} align="center" offset>
                    <ArrowUp size={13} />
                    {drawPick}
                  </GesturePill>
                ) : <span />}
                <GesturePill active={dragState === "away"} color={OUTCOME_COLORS.away} align="right">
                  <ArrowLeft size={13} />
                  {awayPick}
                </GesturePill>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 18,
                  minHeight: 372,
                  padding: "18px 16px",
                  borderRadius: 28,
                  background:
                    "radial-gradient(circle at top center, rgba(255,255,255,.09), transparent 36%), linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))",
                  border: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <StatusPill label={match.statusLabel} live={match.status === "live"} />
                  <span style={{ color: "rgba(247,241,230,.74)", fontSize: ".82rem", fontWeight: 700 }}>
                    {match.kickoffLabel}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    gap: 10,
                    alignItems: "center",
                    paddingTop: 28,
                  }}
                >
                  <TeamColumn flag={match.home.flag} name={match.home.name} />
                  <div style={vsPillStyle}>vs</div>
                  <TeamColumn flag={match.away.flag} name={match.away.name} />
                </div>

                <div style={{ display: "grid", gap: 8, alignSelf: "end" }}>
                  <p style={eyebrowStyle}>Swipe</p>
                  <h2 style={titleStyle}>Elegí de una</h2>
                  <p style={subtitleStyle}>Derecha local. Izquierda visita. Arriba empate.</p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: canDraw ? "48px 1fr 1fr 1fr" : "48px 1fr 1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <button type="button" onClick={moveNext} style={iconDockButtonStyle} aria-label="Pasar">
                  <RotateCcw size={16} />
                </button>
                <button type="button" onClick={() => chooseOutcome("home")} style={{ ...pickDockButtonStyle, background: "linear-gradient(180deg,#f3ca68,#d9ab3d)", color: "#132116" }}>
                  <span style={{ fontSize: "1.1rem" }}>{match.home.flag}</span>
                </button>
                {canDraw ? (
                  <button type="button" onClick={() => chooseOutcome("draw")} style={{ ...pickDockButtonStyle, background: "rgba(255,255,255,.16)" }}>
                    X
                  </button>
                ) : null}
                <button type="button" onClick={() => chooseOutcome("away")} style={{ ...pickDockButtonStyle, background: "linear-gradient(180deg,#2d9f63,#227c4d)" }}>
                  <span style={{ fontSize: "1.1rem" }}>{match.away.flag}</span>
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={footerChipStyle}>{match.stage}</span>
                <span style={footerNoteStyle}>Tocá o arrastrá</span>
              </div>

              {nextMatch ? (
                <div style={{ display: "grid", gap: 2, padding: "0 4px" }}>
                  <p style={eyebrowStyle}>Después</p>
                  <strong style={{ color: "rgba(247,241,230,.86)", fontSize: ".92rem", letterSpacing: "-.03em" }}>
                    {nextMatch.home.name} vs {nextMatch.away.name}
                  </strong>
                </div>
              ) : null}
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
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", alignItems: "center", gap: 10 }}>
                <button type="button" onClick={resetCard} style={topIconStyle} aria-label="Volver">
                  <ArrowLeft size={16} />
                </button>
                <div />
                <span style={progressPillStyle}>{progress}</span>
              </div>

              <div style={heroShellStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <StatusPill label={match.statusLabel} live={match.status === "live"} />
                  <span style={{ color: "rgba(247,241,230,.74)", fontSize: ".82rem", fontWeight: 700 }}>
                    {match.kickoffLabel}
                  </span>
                </div>

                <div style={choiceBannerStyle}>
                  <p style={eyebrowStyle}>Tu pick</p>
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

              <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 10, alignItems: "center" }}>
                <button type="button" onClick={resetCard} style={iconDockButtonStyle} aria-label="Cambiar pick">
                  <ArrowLeft size={16} />
                </button>
                <button type="button" onClick={() => savePlay(7000)} style={jugarmelaButtonStyle}>
                  Jugármela
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={footerChipStyle}>Cierra al arranque</span>
                <span style={footerNoteStyle}>Guardá y seguí</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function TeamColumn({ flag, name }: { flag: string; name: string }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 10, textAlign: "center" }}>
      <span
        style={{
          width: 54,
          height: 54,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          background: "rgba(255,255,255,.08)",
          fontSize: "1.4rem",
        }}
      >
        {flag}
      </span>
      <strong
        style={{
          color: "#fff7ea",
          fontSize: "2rem",
          lineHeight: 0.96,
          letterSpacing: "-.05em",
          fontFamily: "var(--font-barlow-condensed), var(--font-barlow), sans-serif",
        }}
      >
        {name}
      </strong>
    </div>
  );
}

function StatusPill({ label, live }: { label: string; live: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,.08)",
        color: "rgba(247,241,230,.92)",
        fontSize: ".8rem",
        fontWeight: 800,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: live ? "#ff6d5c" : "#f3ca68",
          boxShadow: live ? "0 0 0 4px rgba(255,109,92,.18)" : "0 0 0 4px rgba(243,202,104,.12)",
        }}
      />
      {label}
    </span>
  );
}

function GesturePill({
  active,
  color,
  children,
  offset = false,
  align,
}: {
  active: boolean;
  color: string;
  children: ReactNode;
  offset?: boolean;
  align: "left" | "center" | "right";
}) {
  const justify =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <div style={{ display: "flex", justifyContent: justify, flex: 1 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          minHeight: 34,
          padding: "0 11px",
          marginTop: offset ? 10 : 0,
          borderRadius: 999,
          background: active ? `${color}30` : "rgba(255,255,255,.08)",
          color: active ? "#fff7ea" : "rgba(247,241,230,.72)",
          fontSize: ".7rem",
          fontWeight: 800,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          boxShadow: active ? `0 10px 22px ${color}22` : "none",
          transform:
            active && align === "left"
              ? "translateX(4px)"
              : active && align === "right"
                ? "translateX(-4px)"
                : active && align === "center"
                  ? "translateY(-4px)"
                  : "none",
          transition: "all 140ms ease",
        }}
      >
        {children}
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

const progressPillStyle: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,.08)",
  color: "rgba(247,241,230,.92)",
  fontSize: ".72rem",
  fontWeight: 800,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#fff7ea",
  fontSize: "clamp(2.2rem, 9vw, 3.2rem)",
  lineHeight: 0.92,
  letterSpacing: "-.06em",
  fontFamily: "var(--font-barlow-condensed), var(--font-barlow), sans-serif",
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: "rgba(247,241,230,.8)",
  fontSize: ".95rem",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "rgba(243,202,104,.92)",
  fontSize: ".74rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".16em",
};

const vsPillStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 16,
  background: "rgba(255,255,255,.08)",
  color: "rgba(247,241,230,.92)",
  fontSize: ".82rem",
  fontWeight: 800,
  letterSpacing: ".14em",
  textTransform: "uppercase",
};

const iconDockButtonStyle: CSSProperties = {
  minHeight: 52,
  border: 0,
  borderRadius: 999,
  background: "rgba(255,255,255,.1)",
  color: "#fff7ea",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)",
};

const pickDockButtonStyle: CSSProperties = {
  minHeight: 52,
  border: 0,
  borderRadius: 999,
  color: "#fff7ea",
  fontSize: "1rem",
  fontWeight: 900,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)",
};

const footerChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,.08)",
  color: "rgba(247,241,230,.92)",
  fontSize: ".8rem",
  fontWeight: 800,
};

const footerNoteStyle: CSSProperties = {
  color: "rgba(247,241,230,.7)",
  fontSize: ".78rem",
  fontWeight: 700,
};

const intensityCardStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  minHeight: 650,
  width: "100%",
  borderRadius: 34,
  overflow: "hidden",
  padding: 16,
  background:
    "radial-gradient(circle at top center, rgba(255,226,155,.2), transparent 26%), radial-gradient(circle at bottom right, rgba(243,202,104,.16), transparent 32%), linear-gradient(180deg, #183727 0%, #12281d 38%, #0f2219 100%)",
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 30px 70px rgba(8,16,12,.36), 0 12px 24px rgba(8,16,12,.24)",
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
