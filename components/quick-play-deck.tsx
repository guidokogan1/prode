"use client";

import { useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { Check, Droplets, Flame, Sparkles, Zap } from "lucide-react";
import { SessionContext } from "@/components/session-provider";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { buildWeightedAllocation } from "@/lib/game";
import { getOutcomeColor, getOutcomeFlag, getOutcomeHint } from "@/lib/match-ui";
import { saveStoredAllocation } from "@/lib/local-store";

type QuickPlayDeckProps = {
  matches: MatchViewModel[];
};

type CardPhase = "idle" | "chosen" | "saved";
type IntensityOption = "soft" | "medium" | "hard";

const INTENSITIES: { id: IntensityOption; label: string; hint: string; amount: number; icon: typeof Droplets }[] = [
  { id: "soft", label: "Suave", hint: "4.000 cr", amount: 4000, icon: Droplets },
  { id: "medium", label: "Media", hint: "5.500 cr", amount: 5500, icon: Sparkles },
  { id: "hard", label: "Fuerte", hint: "7.000 cr", amount: 7000, icon: Flame },
];

function isDrawCode(code: MatchOutcomeCode) {
  return code === "draw";
}

export function QuickPlayDeck({ matches }: QuickPlayDeckProps) {
  const router = useRouter();
  const session = useContext(SessionContext);
  const deck = useMemo(() => {
    const playable = matches.filter((match) => match.isEditable);
    return playable.length ? playable : matches;
  }, [matches]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [chosenOutcome, setChosenOutcome] = useState<MatchOutcomeCode | null>(null);
  const [chosenIntensity, setChosenIntensity] = useState<IntensityOption | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"default" | "warning">("default");
  const [exitDir, setExitDir] = useState<MatchOutcomeCode>("home");

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const homeOpacity = useTransform(x, [20, 100], [0, 1]);
  const awayOpacity = useTransform(x, [-100, -20], [1, 0]);
  const drawOpacity = useTransform(y, [-100, -20], [1, 0]);

  if (!deck.length) {
    return null;
  }

  const match = deck[Math.min(currentIndex, deck.length - 1)];
  const done = currentIndex >= deck.length;
  const liveMatch = matches.find((item) => item.status === "live") ?? null;

  const resetPhase = () => {
    setPhase("idle");
    setChosenOutcome(null);
    setChosenIntensity(null);
    setSaveMessage(null);
    setSaveTone("default");
    x.set(0);
    y.set(0);
  };

  function moveNext() {
    setCurrentIndex((value) => value + 1);
    resetPhase();
  }

  function chooseOutcome(code: MatchOutcomeCode) {
    setExitDir(code);
    setChosenOutcome(code);
    setPhase("chosen");
    x.set(0);
    y.set(0);
  }

  async function handleIntensityPick(option: (typeof INTENSITIES)[number]) {
    if (!match || !chosenOutcome) {
      return;
    }

    const chosenAllocation = match.allocation.find((item) => item.code === chosenOutcome);
    if (!chosenAllocation) {
      return;
    }

    const payload = buildWeightedAllocation(
      match.allocation.map((item) => item.label),
      chosenAllocation.label,
      option.amount,
    ).map((item) => ({
      label: item.outcomeCode,
      amount: item.amount,
    }));

    saveStoredAllocation(match.id, payload);

    setChosenIntensity(option.id);
    setPhase("saved");

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId: match.id,
          allocations: payload,
        }),
      });

      if (!response.ok) {
        throw new Error("remote save failed");
      }

      setSaveMessage("Jugada guardada.");
      setSaveTone("default");
    } catch {
      setSaveMessage(session?.mode === "remote" ? "Guardado local mientras reconecta." : "Guardado en este dispositivo.");
      setSaveTone("warning");
    }

    setTimeout(() => {
      moveNext();
    }, 1100);
  }

  const idleExit =
    exitDir === "home" || exitDir === "home_qualifies"
      ? { x: 380, opacity: 0, rotate: 14, transition: { duration: 0.28 } }
      : exitDir === "away" || exitDir === "away_qualifies"
        ? { x: -380, opacity: 0, rotate: -14, transition: { duration: 0.28 } }
        : { y: -380, opacity: 0, transition: { duration: 0.24 } };

  const showDrawGesture = match?.allocation.some((item) => item.code === "draw");

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!done ? (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, minHeight: 12 }}>
          {deck.map((_, dotIndex) => (
            <span
              key={`deck-dot-${dotIndex}`}
              style={{
                width: dotIndex === currentIndex ? 20 : 6,
                height: 6,
                borderRadius: 999,
                background:
                  dotIndex < currentIndex ? "#3D9B5F" : dotIndex === currentIndex ? "#D4A64B" : "rgba(255,255,255,0.12)",
                transition: "all 220ms ease",
              }}
            />
          ))}
        </div>
      ) : null}

      <div style={{ minHeight: 560, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {done ? (
          <motion.div
            className="surface-card"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              minHeight: 470,
              padding: 28,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              gap: 18,
            }}
          >
            <span style={{ fontSize: "4rem" }}>🎯</span>
            <div style={{ display: "grid", gap: 8 }}>
              <h2 className="section-title">Todo jugado</h2>
              <p className="muted-copy">Subiste las rondas rápidas de esta vuelta.</p>
            </div>
            <button className="button-primary" onClick={() => router.push("/matches")}>
              Cargá grupos
            </button>
          </motion.div>
        ) : (
          <>
            <div style={{ position: "relative", flex: 1 }}>
              {currentIndex < deck.length - 1 ? (
                <>
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 24,
                      right: 24,
                      top: 12,
                      bottom: -4,
                      borderRadius: 24,
                      background: "linear-gradient(160deg, #1F3E28 0%, #0E1D13 100%)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
                      opacity: 0.28,
                    }}
                  />
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 40,
                      right: 40,
                      top: 22,
                      bottom: -8,
                      borderRadius: 24,
                      background: "linear-gradient(160deg, #1F3E28 0%, #0E1D13 100%)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
                      opacity: 0.14,
                    }}
                  />
                </>
              ) : null}

              <AnimatePresence mode="wait">
                {phase === "idle" ? (
                  <motion.div
                    key={`idle-${match.id}`}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.25}
                    onDragEnd={(_, info) => {
                      const { x: offsetX, y: offsetY } = info.offset;
                      if (offsetX > 75) {
                        chooseOutcome(match.allocation[0]?.code ?? "home");
                        return;
                      }
                      if (offsetX < -75) {
                        chooseOutcome(match.allocation[match.allocation.length - 1]?.code ?? "away");
                        return;
                      }
                      if (offsetY < -75 && showDrawGesture) {
                        const drawOutcome = match.allocation.find((item) => isDrawCode(item.code));
                        if (drawOutcome) {
                          chooseOutcome(drawOutcome.code);
                        }
                      }
                    }}
                    style={{
                      x,
                      y,
                      rotate,
                      position: "relative",
                      zIndex: 2,
                      minHeight: 470,
                    }}
                    className="surface-card"
                    initial={{ scale: 0.92, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={idleExit}
                    transition={{ type: "spring", stiffness: 280, damping: 26 }}
                    whileDrag={{ scale: 1.02 }}
                  >
                    <motion.div
                      style={{
                        opacity: homeOpacity,
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: "linear-gradient(135deg, rgba(61,155,95,0.55) 0%, transparent 55%)",
                      }}
                    >
                      <div style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", display: "grid", gap: 8, justifyItems: "center" }}>
                        <span style={{ fontSize: "3rem", lineHeight: 1 }}>{match.home.flag}</span>
                        <span style={{ color: "#3D9B5F", fontSize: ".72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em" }}>
                          {match.marketType === "qualifies" ? "clasifica local" : "gana local"}
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      style={{
                        opacity: awayOpacity,
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: "linear-gradient(225deg, rgba(232,65,58,0.55) 0%, transparent 55%)",
                      }}
                    >
                      <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", display: "grid", gap: 8, justifyItems: "center" }}>
                        <span style={{ fontSize: "3rem", lineHeight: 1 }}>{match.away.flag}</span>
                        <span style={{ color: "#E8413A", fontSize: ".72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em" }}>
                          {match.marketType === "qualifies" ? "clasifica visita" : "visitante"}
                        </span>
                      </div>
                    </motion.div>

                    {showDrawGesture ? (
                      <motion.div
                        style={{
                          opacity: drawOpacity,
                          position: "absolute",
                          inset: 0,
                          pointerEvents: "none",
                          background: "linear-gradient(0deg, rgba(91,143,240,0.5) 0%, transparent 50%)",
                        }}
                      >
                        <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", display: "grid", gap: 8, justifyItems: "center" }}>
                          <span style={{ fontSize: "2.6rem", lineHeight: 1 }}>🤝</span>
                          <span style={{ color: "#5B8FF0", fontSize: ".72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em" }}>
                            empate
                          </span>
                        </div>
                      </motion.div>
                    ) : null}

                    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 22, position: "relative", zIndex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                        <span className="eyebrow">{match.stage}</span>
                        <div className="status-pill status-pill-gold">
                          <span>{match.kickoffLabel}</span>
                        </div>
                      </div>

                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingBlock: 4 }}>
                        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 38px 1fr", gap: 8, alignItems: "center" }}>
                          <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
                            <span style={{ fontSize: "4.1rem", lineHeight: 1 }}>{match.home.flag}</span>
                            <span className="team-display" style={{ textAlign: "center" }}>{match.home.name}</span>
                            <span className="micro-copy" style={{ letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(122,154,129,0.7)" }}>Local</span>
                          </div>
                          <div style={{ display: "grid", placeItems: "center" }}>
                            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.55rem", fontWeight: 900, color: "rgba(255,255,255,0.12)" }}>VS</span>
                          </div>
                          <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
                            <span style={{ fontSize: "4.1rem", lineHeight: 1 }}>{match.away.flag}</span>
                            <span className="team-display" style={{ textAlign: "center" }}>{match.away.name}</span>
                            <span className="micro-copy" style={{ letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(122,154,129,0.7)" }}>Visitante</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span>←</span>
                          <span style={{ color: "#E8413A", fontSize: ".78rem", fontWeight: 700 }}>{match.marketType === "qualifies" ? "clasifica visita" : "visitante"}</span>
                        </div>
                        {showDrawGesture ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "#5B8FF0", fontSize: ".78rem", fontWeight: 700 }}>empate</span>
                            <span>↑</span>
                          </div>
                        ) : <span className="micro-copy">{match.userStateLabel}</span>}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: "#3D9B5F", fontSize: ".78rem", fontWeight: 700 }}>{match.marketType === "qualifies" ? "clasifica local" : "local"}</span>
                          <span>→</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                {phase === "chosen" && chosenOutcome ? (
                  <motion.div
                    key={`chosen-${match.id}-${chosenOutcome}`}
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.88, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 26 }}
                    style={{
                      minHeight: 470,
                      padding: 22,
                      background: `linear-gradient(160deg, ${getOutcomeColor(chosenOutcome)}18 0%, #0E1D13 45%)`,
                      border: `1px solid ${getOutcomeColor(chosenOutcome)}30`,
                      boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 50px ${getOutcomeColor(chosenOutcome)}15`,
                      borderRadius: 24,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: getOutcomeColor(chosenOutcome) }} />
                      <span className="eyebrow">Tu pick</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize: "3.2rem", lineHeight: 1 }}>{getOutcomeFlag(chosenOutcome, match)}</span>
                      <div style={{ display: "grid", gap: 4 }}>
                        <p className="section-title">{match.allocation.find((item) => item.code === chosenOutcome)?.label ?? "Pick"}</p>
                        <p className="muted-copy" style={{ color: getOutcomeColor(chosenOutcome) }}>
                          {getOutcomeHint(chosenOutcome, match.marketType)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 14, marginTop: "auto", marginBottom: "auto" }}>
                      <p className="eyebrow">¿Con cuánta fuerza?</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                        {INTENSITIES.map((option) => {
                          const Icon = option.icon;
                          const iconColor = option.id === "hard" ? "#D4A64B" : option.id === "medium" ? "#EDE8D9" : "#7A9A81";

                          return (
                            <motion.button
                              key={option.id}
                              whileTap={{ scale: 0.94 }}
                              whileHover={{ scale: 1.03 }}
                              onClick={() => void handleIntensityPick(option)}
                              style={{
                                minHeight: 132,
                                borderRadius: 16,
                                border: "1px solid rgba(255,255,255,0.09)",
                                background: "rgba(255,255,255,0.04)",
                                display: "grid",
                                placeItems: "center",
                                gap: 8,
                                padding: 16,
                                color: "#EDE8D9",
                              }}
                            >
                              <Icon size={26} style={{ color: iconColor }} />
                              <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 900 }}>{option.label}</span>
                              <span className="micro-copy" style={{ color: "#7A9A81" }}>{option.hint}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <button className="button-ghost" onClick={resetPhase} style={{ marginTop: 18 }}>
                      ← cambiar pick
                    </button>
                  </motion.div>
                ) : null}

                {phase === "saved" && chosenOutcome && chosenIntensity ? (
                  <motion.div
                    key={`saved-${match.id}-${chosenOutcome}-${chosenIntensity}`}
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.88, opacity: 0, y: -40 }}
                    transition={{ type: "spring", stiffness: 300, damping: 26 }}
                    className="surface-card"
                    style={{
                      minHeight: 470,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      padding: 28,
                    }}
                  >
                    <div style={{ display: "grid", gap: 16, justifyItems: "center" }}>
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.08 }}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(61,155,95,0.18)",
                          border: "2px solid #3D9B5F",
                        }}
                      >
                        <Check size={28} style={{ color: "#3D9B5F" }} />
                      </motion.div>
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ display: "grid", gap: 6 }}>
                        <p className="section-title">¡Jugada guardada!</p>
                        <p className="muted-copy">
                          {getOutcomeFlag(chosenOutcome, match)} {match.allocation.find((item) => item.code === chosenOutcome)?.label}
                          {" · "}
                          <span style={{ color: "#D4A64B" }}>{INTENSITIES.find((item) => item.id === chosenIntensity)?.hint}</span>
                        </p>
                        {saveMessage ? (
                          <span className="micro-copy" style={{ color: saveTone === "warning" ? "#D4A64B" : "#7A9A81" }}>
                            {saveMessage}
                          </span>
                        ) : null}
                      </motion.div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {phase === "idle" ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 16 }}>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => chooseOutcome(match.allocation[match.allocation.length - 1]?.code ?? "away")}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      border: "1.5px solid rgba(232,65,58,0.35)",
                      background: "rgba(232,65,58,0.12)",
                      boxShadow: "0 4px 20px rgba(232,65,58,0.18)",
                      display: "grid",
                      placeItems: "center",
                      color: "#E8413A",
                    }}
                  >
                    <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                      <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{match.away.flag}</span>
                      <span style={{ fontSize: ".5rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>{match.away.name.slice(0, 3)}</span>
                    </div>
                  </motion.button>
                  {showDrawGesture ? (
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => {
                        const drawOutcome = match.allocation.find((item) => item.code === "draw");
                        if (drawOutcome) {
                          chooseOutcome(drawOutcome.code);
                        }
                      }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 999,
                        border: "1.5px solid rgba(91,143,240,0.35)",
                        background: "rgba(91,143,240,0.12)",
                        boxShadow: "0 4px 20px rgba(91,143,240,0.16)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>🤝</span>
                    </motion.button>
                  ) : null}
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => chooseOutcome(match.allocation[0]?.code ?? "home")}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      border: "1.5px solid rgba(61,155,95,0.35)",
                      background: "rgba(61,155,95,0.12)",
                      boxShadow: "0 4px 20px rgba(61,155,95,0.18)",
                      display: "grid",
                      placeItems: "center",
                      color: "#3D9B5F",
                    }}
                  >
                    <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                      <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{match.home.flag}</span>
                      <span style={{ fontSize: ".5rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>{match.home.name.slice(0, 3)}</span>
                    </div>
                  </motion.button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        )}
      </div>

      <AnimatePresence initial={false}>
        {(phase === "idle" || done) ? (
          <motion.div
            key="home-shortcuts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{ display: "grid", gap: 8 }}
          >
            <button className="button-secondary" onClick={() => router.push("/matches")} style={{ justifyContent: "space-between", width: "100%" }}>
              <span>Cargá grupos de una</span>
              <span aria-hidden="true">→</span>
            </button>
            {liveMatch ? (
              <button
                className="button-secondary"
                onClick={() => router.push(`/matches/${liveMatch.id}`)}
                style={{
                  justifyContent: "space-between",
                  width: "100%",
                  background: "rgba(255,59,48,0.08)",
                  borderColor: "rgba(255,59,48,0.2)",
                  color: "#EDE8D9",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "#FF3B30", boxShadow: "0 0 12px rgba(255,59,48,.6)" }} />
                  <span>LIVE {liveMatch.home.flag} {liveMatch.home.score} - {liveMatch.away.score} {liveMatch.away.flag}</span>
                </span>
                <span style={{ color: "#FF3B30", fontWeight: 800 }}>ver →</span>
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
