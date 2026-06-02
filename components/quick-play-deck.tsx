"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check, Droplets, Flame, Sparkles, Zap } from "lucide-react";
import { SessionContext } from "@/components/session-provider";
import { VoteFace } from "@/components/vote-face";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { buildPresetAllocation, type IntensityPreset } from "@/lib/game";
import { formatCredits } from "@/lib/format";
import { getOutcomeColor, getOutcomeFlag, getOutcomeHint, getQuickPlayOutcomeTargets, getQuickPlaySwipeOutcome } from "@/lib/match-ui";
import { saveStoredAllocation } from "@/lib/local-store";

type QuickPlayDeckProps = {
  matches: MatchViewModel[];
};

type CardPhase = "idle" | "chosen" | "saved";
type IntensityOption = "soft" | "medium" | "hard";

const INTENSITIES: { id: IntensityOption; label: string; icon: typeof Droplets }[] = [
  { id: "soft", label: "Suave", icon: Droplets },
  { id: "medium", label: "Media", icon: Sparkles },
  { id: "hard", label: "Fuerte", icon: Flame },
];

function isDrawCode(code: MatchOutcomeCode) {
  return code === "draw";
}

function buildPresetHint(match: MatchViewModel, selectedOutcome: MatchOutcomeCode, intensity: IntensityPreset) {
  const preset = buildPresetAllocation(
    match.allocation.map((item) => item.code),
    selectedOutcome,
    intensity,
  );

  return preset.map((item) => formatCredits(item.amount)).join(" · ");
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
  const [saveTone, setSaveTone] = useState<"default" | "warning" | "loading">("default");
  const [exitDir, setExitDir] = useState<MatchOutcomeCode>("home");
  const [isSaving, setIsSaving] = useState(false);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isChoosingRef = useRef(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const cardOpacity = useMotionValue(1);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const homeOpacity = useTransform(x, [-140, -36], [1, 0]);
  const awayOpacity = useTransform(x, [36, 140], [0, 1]);
  const drawOpacity = useTransform(y, [-136, -36], [1, 0]);

  useEffect(() => {
    return () => {
      if (nextTimerRef.current) {
        clearTimeout(nextTimerRef.current);
      }
    };
  }, []);

  if (!deck.length) {
    return null;
  }

  const match = deck[Math.min(currentIndex, deck.length - 1)];
  const done = currentIndex >= deck.length;
  const liveMatch = matches.find((item) => item.status === "live") ?? null;
  const quickPlayTargets = getQuickPlayOutcomeTargets(match);

  const resetPhase = () => {
    setPhase("idle");
    setChosenOutcome(null);
    setChosenIntensity(null);
    setSaveMessage(null);
    setSaveTone("default");
    setIsSaving(false);
    x.set(0);
    y.set(0);
    cardOpacity.set(1);
  };

  function moveNext() {
    setCurrentIndex((value) => value + 1);
    resetPhase();
  }

  async function chooseOutcome(code: MatchOutcomeCode) {
    if (phase !== "idle" || isChoosingRef.current) {
      return;
    }

    isChoosingRef.current = true;
    setExitDir(code);
    const currentX = x.get();
    const currentY = y.get();
    const targetX =
      code === "home" || code === "home_qualifies"
        ? -Math.max(320, Math.abs(currentX) + 180)
        : code === "away" || code === "away_qualifies"
          ? Math.max(320, Math.abs(currentX) + 180)
          : 0;
    const targetY = code === "draw" ? -Math.max(260, Math.abs(currentY) + 160) : currentY * 0.2;

    await Promise.all([
      animate(x, targetX, { duration: 0.2, ease: "easeOut" }).finished,
      animate(y, targetY, { duration: 0.2, ease: "easeOut" }).finished,
      animate(cardOpacity, 0, { duration: 0.18, ease: "easeOut" }).finished,
    ]);

    setChosenOutcome(code);
    setPhase("chosen");
    x.set(0);
    y.set(0);
    cardOpacity.set(1);
    isChoosingRef.current = false;
  }

  async function handleIntensityPick(option: (typeof INTENSITIES)[number]) {
    if (!match || !chosenOutcome) {
      return;
    }

    const payload = buildPresetAllocation(
      match.allocation.map((item) => item.code),
      chosenOutcome,
      option.id,
    ).map((item) => ({
      label: match.allocation.find((allocation) => allocation.code === item.outcomeCode)?.label ?? item.outcomeCode,
      amount: item.amount,
    }));

    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
    }

    saveStoredAllocation(match.id, {
      allocations: payload,
      savedAt: new Date().toISOString(),
      status: "draft",
    });
    setChosenIntensity(option.id);
    setPhase("saved");
    setIsSaving(true);
    setSaveMessage("Guardando");
    setSaveTone("loading");

    try {
      const [, response] = await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 760)),
        fetch("/api/tickets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId: match.id,
            allocations: payload,
          }),
        }),
      ]);

      if (!response.ok) {
        throw new Error("remote save failed");
      }

      saveStoredAllocation(match.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "saved_remote",
      });
      setSaveMessage("Guardado");
      setSaveTone("default");
    } catch {
      saveStoredAllocation(match.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "sync_error",
      });
      setSaveMessage(session?.kind === "remote" ? "Guardado local" : "Guardado local");
      setSaveTone("warning");
    } finally {
      setIsSaving(false);
    }

    nextTimerRef.current = setTimeout(() => {
      moveNext();
    }, 760);
  }

  const idleExit =
    exitDir === "home" || exitDir === "home_qualifies"
      ? { x: -380, opacity: 0, rotate: -14, transition: { duration: 0.28 } }
      : exitDir === "away" || exitDir === "away_qualifies"
        ? { x: 380, opacity: 0, rotate: 14, transition: { duration: 0.28 } }
        : { y: -380, opacity: 0, transition: { duration: 0.24 } };

  const showDrawGesture = match?.allocation.some((item) => item.code === "draw");

  async function snapCardBack() {
    await Promise.all([
      animate(x, 0, { type: "spring", stiffness: 540, damping: 34, mass: 0.72 }).finished,
      animate(y, 0, { type: "spring", stiffness: 540, damping: 34, mass: 0.72 }).finished,
      animate(cardOpacity, 1, { duration: 0.14, ease: "easeOut" }).finished,
    ]);
  }

  return (
    <div style={{ display: "grid", gap: 10, minHeight: 0 }}>
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

      <div style={{ minHeight: 0, display: "grid", gap: 10, alignContent: "start" }}>
        {done ? (
          <motion.div
            className="surface-card"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              minHeight: 360,
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
            <div style={{ display: "grid", gap: 4 }}>
              <h2 className="section-title">Todo jugado</h2>
            </div>
            <button className="button-primary" onClick={() => router.push("/matches")}>
              Ver fixture
            </button>
          </motion.div>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              {phase === "idle" && currentIndex < deck.length - 1 ? (
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
                    dragMomentum={false}
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.14}
                    onDragEnd={async (_, info) => {
                      const { x: offsetX, y: offsetY } = info.offset;
                      const outcome = getQuickPlaySwipeOutcome(match, offsetX, offsetY);
                      if (outcome) {
                        await chooseOutcome(outcome);
                        return;
                      }
                      if (offsetY < -68 && showDrawGesture) {
                        if (quickPlayTargets.draw) {
                          await chooseOutcome(quickPlayTargets.draw);
                          return;
                        }
                      }
                      await snapCardBack();
                    }}
                    style={{
                      x,
                      y,
                      rotate,
                      opacity: cardOpacity,
                      position: "relative",
                      zIndex: 2,
                      minHeight: 332,
                      fontFamily: "var(--font-barlow), system-ui, sans-serif",
                      willChange: "transform, opacity",
                    }}
                    className="surface-card"
                    initial={{ scale: 0.92, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={idleExit}
                    transition={{ type: "spring", stiffness: 250, damping: 24 }}
                    whileDrag={{ scale: 1.008 }}
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
                        <span style={{ color: "#3D9B5F", fontFamily: "var(--font-body)", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em" }}>
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
                        <span style={{ color: "#E8413A", fontFamily: "var(--font-body)", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em" }}>
                          {match.marketType === "qualifies" ? "clasifica visita" : "gana visita"}
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
                          <span style={{ color: "#5B8FF0", fontFamily: "var(--font-body)", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em" }}>
                            empate
                          </span>
                        </div>
                      </motion.div>
                    ) : null}

                    <VoteFace match={match} showDrawGesture={Boolean(showDrawGesture)} />
                  </motion.div>
                ) : null}

                {phase === "chosen" && chosenOutcome ? (
                  <motion.div
                    key={`chosen-${match.id}-${chosenOutcome}`}
                    initial={{ scale: 0.94, opacity: 0, y: 14 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: -14 }}
                    transition={{ type: "spring", stiffness: 250, damping: 24 }}
                    style={{
                      minHeight: 332,
                      padding: 16,
                      background: `linear-gradient(160deg, color-mix(in srgb, ${getOutcomeColor(chosenOutcome)} 22%, #1F3E28) 0%, #112015 38%, #0E1D13 100%)`,
                      border: `1px solid ${getOutcomeColor(chosenOutcome)}30`,
                      boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 50px ${getOutcomeColor(chosenOutcome)}15`,
                      borderRadius: 24,
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      zIndex: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.07), transparent 42%)",
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, position: "relative", zIndex: 1 }}>
                      <span className="eyebrow">{match.stage}</span>
                      <span className="micro-copy">{match.kickoffLabel}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, position: "relative", zIndex: 1 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: getOutcomeColor(chosenOutcome) }} />
                      <span className="eyebrow">Elegiste</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 1 }}>
                      <span style={{ fontSize: "2.8rem", lineHeight: 1 }}>{getOutcomeFlag(chosenOutcome, match)}</span>
                      <div style={{ display: "grid", gap: 4 }}>
                        <p className="section-title">{match.allocation.find((item) => item.code === chosenOutcome)?.label ?? "Pick"}</p>
                        <p className="muted-copy" style={{ color: getOutcomeColor(chosenOutcome) }}>
                          {getOutcomeHint(chosenOutcome, match.marketType)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 12, marginTop: "auto", marginBottom: "auto", position: "relative", zIndex: 1 }}>
                      <p className="eyebrow">Fuerza</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
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
                                minHeight: 112,
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
                              <span style={{ fontFamily: "var(--font-display)", fontSize: ".98rem", fontWeight: 700 }}>{option.label}</span>
                              <span className="micro-copy" style={{ color: "#7A9A81" }}>{buildPresetHint(match, chosenOutcome, option.id)}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <button className="button-ghost" onClick={resetPhase} style={{ marginTop: 14, position: "relative", zIndex: 1 }}>
                      Cambiar
                    </button>
                  </motion.div>
                ) : null}

                {phase === "saved" && chosenOutcome && chosenIntensity ? (
                  <motion.div
                    key={`saved-${match.id}-${chosenOutcome}-${chosenIntensity}`}
                    initial={{ scale: 0.96, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: -24 }}
                    transition={{ type: "spring", stiffness: 250, damping: 24 }}
                    className="surface-card"
                    style={{
                      minHeight: 332,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      padding: 28,
                      position: "relative",
                      zIndex: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
                      }}
                    />
                    <div style={{ display: "grid", gap: 16, justifyItems: "center", position: "relative", zIndex: 1 }}>
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0, boxShadow: isSaving ? "0 0 0 12px rgba(61,155,95,0.08)" : "0 0 0 0 rgba(61,155,95,0)" }}
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
                        <p className="section-title">Guardado</p>
                        <p className="muted-copy">
                          {getOutcomeFlag(chosenOutcome, match)} {match.allocation.find((item) => item.code === chosenOutcome)?.label}
                          {" · "}
                          <span style={{ color: "#D4A64B" }}>{buildPresetHint(match, chosenOutcome, chosenIntensity)}</span>
                        </p>
                        {saveMessage ? (
                          <span
                            className="micro-copy"
                            style={{
                              color: saveTone === "warning" ? "#D4A64B" : saveTone === "loading" ? "#EDE8D9" : "#7A9A81",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            {isSaving ? <span style={{ width: 7, height: 7, borderRadius: 999, background: "#D4A64B", boxShadow: "0 0 16px rgba(212,166,75,.55)" }} /> : null}
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
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 240, damping: 22 }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 10 }}>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => void chooseOutcome(quickPlayTargets.left)}
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
                      <span style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontSize: ".5rem", fontStyle: "normal", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>{match.home.name.slice(0, 3)}</span>
                    </div>
                  </motion.button>
                  {showDrawGesture ? (
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => {
                        if (quickPlayTargets.draw) {
                          void chooseOutcome(quickPlayTargets.draw);
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
                    whileHover={{ scale: 1.03 }}
                    onClick={() => void chooseOutcome(quickPlayTargets.right)}
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
                      <span style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontSize: ".5rem", fontStyle: "normal", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>{match.away.name.slice(0, 3)}</span>
                    </div>
                  </motion.button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        )}
      </div>

      <AnimatePresence initial={false}>
        {(phase === "idle" || done) && !liveMatch ? (
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
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {phase === "idle" && liveMatch ? (
          <motion.button
            key="home-live-cta"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
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
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
