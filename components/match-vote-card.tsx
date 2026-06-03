"use client";

import { useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check, Droplets, Flame, Sparkles } from "lucide-react";
import { SessionContext } from "@/components/session-provider";
import { VoteFace } from "@/components/vote-face";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { buildPresetAllocation, type IntensityPreset } from "@/lib/game";
import {
  getOutcomeColor,
  getOutcomeFlag,
  getOutcomeHint,
  getQuickPlayOutcomeTargets,
  getQuickPlaySwipeOutcome,
} from "@/lib/match-ui";
import { buildAllocationScope, saveStoredAllocation } from "@/lib/local-store";

type MatchVoteCardProps = {
  match: MatchViewModel;
};

type CardPhase = "idle" | "chosen" | "saved";
type IntensityOption = "soft" | "medium" | "hard";

const INTENSITIES: { id: IntensityOption; label: string; icon: typeof Droplets }[] = [
  { id: "soft", label: "Suave", icon: Droplets },
  { id: "medium", label: "Media", icon: Sparkles },
  { id: "hard", label: "Fuerte", icon: Flame },
];

function getIntensityCopy(intensity: IntensityPreset) {
  if (intensity === "soft") return "Más cubierto";
  if (intensity === "medium") return "Más decidido";
  return "A fondo";
}

export function MatchVoteCard({ match }: MatchVoteCardProps) {
  const session = useContext(SessionContext);
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [chosenOutcome, setChosenOutcome] = useState<MatchOutcomeCode | null>(null);
  const [chosenIntensity, setChosenIntensity] = useState<IntensityOption | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"default" | "warning" | "loading">("default");
  const [isSaving, setIsSaving] = useState(false);
  const isChoosingRef = useRef(false);
  const allocationScope = buildAllocationScope(session);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const cardOpacity = useMotionValue(1);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const homeOpacity = useTransform(x, [-140, -36], [1, 0]);
  const awayOpacity = useTransform(x, [36, 140], [0, 1]);
  const drawOpacity = useTransform(y, [-136, -36], [1, 0]);

  const quickPlayTargets = useMemo(() => getQuickPlayOutcomeTargets(match), [match]);
  const showDrawGesture = quickPlayTargets.draw != null;

  async function snapCardBack() {
    await Promise.all([
      animate(x, 0, { type: "spring", stiffness: 540, damping: 34, mass: 0.72 }).finished,
      animate(y, 0, { type: "spring", stiffness: 540, damping: 34, mass: 0.72 }).finished,
      animate(cardOpacity, 1, { duration: 0.14, ease: "easeOut" }).finished,
    ]);
  }

  function resetPhase() {
    setPhase("idle");
    setChosenOutcome(null);
    setChosenIntensity(null);
    setSaveMessage(null);
    setSaveTone("default");
    setIsSaving(false);
    x.set(0);
    y.set(0);
    cardOpacity.set(1);
  }

  async function chooseOutcome(code: MatchOutcomeCode) {
    if (phase !== "idle" || isChoosingRef.current) {
      return;
    }

    isChoosingRef.current = true;
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
    if (!chosenOutcome) {
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

    saveStoredAllocation(allocationScope, match.id, {
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

      saveStoredAllocation(allocationScope, match.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "saved_remote",
      });
      setSaveMessage("Guardado");
      setSaveTone("default");
    } catch {
      saveStoredAllocation(allocationScope, match.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "sync_error",
      });
      setSaveMessage(session?.kind === "remote" ? "Guardado local" : "Guardado local");
      setSaveTone("warning");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="section-stack">
      <div className="title-stack">
        <p className="eyebrow">Tu jugada</p>
        <h2 className="section-title">Elegí y guardá</h2>
      </div>

      <div style={{ position: "relative" }}>
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
                const outcome = getQuickPlaySwipeOutcome(match, info.offset.x, info.offset.y);
                if (outcome) {
                  await chooseOutcome(outcome);
                  return;
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
              />

              <motion.div
                style={{
                  opacity: awayOpacity,
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: "linear-gradient(225deg, rgba(232,65,58,0.55) 0%, transparent 55%)",
                }}
              />

              {showDrawGesture ? (
                <motion.div
                  style={{
                    opacity: drawOpacity,
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: "linear-gradient(0deg, rgba(91,143,240,0.5) 0%, transparent 50%)",
                  }}
                />
              ) : null}

              <VoteFace
                match={match}
                showDrawGesture={showDrawGesture}
                outcomeTargets={quickPlayTargets}
                onSelectOutcome={(code) => {
                  void chooseOutcome(code);
                }}
              />
            </motion.div>
          ) : null}

          {phase === "chosen" && chosenOutcome ? (
            <motion.div
              key={`chosen-${match.id}-${chosenOutcome}`}
              initial={{ scale: 0.94, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: -14 }}
              transition={{ type: "spring", stiffness: 250, damping: 24 }}
              className="surface-card"
              style={{
                minHeight: 332,
                padding: 16,
                background: `linear-gradient(160deg, color-mix(in srgb, ${getOutcomeColor(chosenOutcome)} 22%, #1F3E28) 0%, #112015 38%, #0E1D13 100%)`,
                border: `1px solid ${getOutcomeColor(chosenOutcome)}30`,
                boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 50px ${getOutcomeColor(chosenOutcome)}15`,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div className="split-row">
                <span className="eyebrow">{match.stage}</span>
                <span className="micro-copy">{match.kickoffLabel}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "2.4rem", lineHeight: 1 }}>{getOutcomeFlag(chosenOutcome, match)}</span>
                <div className="title-stack">
                  <p className="eyebrow">Vas con</p>
                  <strong style={{ fontSize: "1.15rem" }}>
                    {match.allocation.find((item) => item.code === chosenOutcome)?.label ?? "Pick"}
                  </strong>
                  <span className="micro-copy" style={{ color: getOutcomeColor(chosenOutcome) }}>
                    {getOutcomeHint(chosenOutcome, match.marketType)}
                  </span>
                </div>
              </div>

              <p className="eyebrow">¿Cómo la querés jugar?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: "auto" }}>
                {INTENSITIES.map((option) => {
                  const Icon = option.icon;
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
                      <Icon size={26} />
                      <span style={{ fontFamily: "var(--font-display)", fontSize: ".98rem", fontWeight: 700 }}>{option.label}</span>
                      <span className="micro-copy" style={{ color: "#7A9A81" }}>{getIntensityCopy(option.id)}</span>
                    </motion.button>
                  );
                })}
              </div>

              <button className="button-ghost" onClick={resetPhase}>
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
              }}
            >
              <div className="section-stack" style={{ justifyItems: "center" }}>
                <div
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
                </div>
                <p className="section-title">Guardado</p>
                <p className="muted-copy">
                  {getOutcomeFlag(chosenOutcome, match)} {match.allocation.find((item) => item.code === chosenOutcome)?.label}
                </p>
                {saveMessage ? (
                  <span className="micro-copy" style={{ color: saveTone === "warning" ? "#D4A64B" : "#7A9A81" }}>
                    {saveMessage}
                  </span>
                ) : null}
                <button className="button-ghost" onClick={resetPhase}>
                  Cambiar
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {phase === "idle" ? (
        <div className="actions-row" style={{ justifyContent: "center" }}>
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
              display: "grid",
              placeItems: "center",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>{match.home.flag}</span>
          </motion.button>
          {quickPlayTargets.draw ? (
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => void chooseOutcome(quickPlayTargets.draw!)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                border: "1.5px solid rgba(91,143,240,0.35)",
                background: "rgba(91,143,240,0.12)",
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
              display: "grid",
              placeItems: "center",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>{match.away.flag}</span>
          </motion.button>
        </div>
      ) : null}
    </section>
  );
}
