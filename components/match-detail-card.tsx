"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowLeft, Check, Droplets, Flame, Sparkles } from "lucide-react";
import { SessionContext } from "@/components/session-provider";
import { VoteFace } from "@/components/vote-face";
import { getMatchCardState } from "@/lib/match-card";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { formatCredits, formatNetAmount } from "@/lib/format";
import { buildPresetAllocation, type IntensityPreset } from "@/lib/game";
import { ALLOCATION_EVENT, buildAllocationScope, getStoredAllocation, saveStoredAllocation } from "@/lib/local-store";
import {
  deriveResolvedOutcome,
  formatCompactCredits,
  getOutcomeColor,
  getOutcomeFlag,
  getOutcomeHint,
  getQuickPlayOutcomeTargets,
  getQuickPlaySwipeOutcome,
} from "@/lib/match-ui";

type MatchDetailCardProps = {
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

export function MatchDetailCard({ match }: MatchDetailCardProps) {
  const router = useRouter();
  const session = useContext(SessionContext);
  const allocationScope = buildAllocationScope(session);
  const [effectiveMatch, setEffectiveMatch] = useState(match);
  const cardState = useMemo(() => getMatchCardState(effectiveMatch, "hero"), [effectiveMatch]);
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [isEditingSaved, setIsEditingSaved] = useState(false);
  const [chosenOutcome, setChosenOutcome] = useState<MatchOutcomeCode | null>(null);
  const [chosenIntensity, setChosenIntensity] = useState<IntensityOption | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"default" | "warning" | "loading">("default");
  const [isSaving, setIsSaving] = useState(false);
  const isChoosingRef = useRef(false);
  const saveResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const cardOpacity = useMotionValue(1);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const homeOpacity = useTransform(x, [-140, -36], [1, 0]);
  const awayOpacity = useTransform(x, [36, 140], [0, 1]);
  const drawOpacity = useTransform(y, [-136, -36], [1, 0]);

  useEffect(() => {
    const sync = () => {
      const storedDraft = getStoredAllocation(allocationScope, match.id);
      if (!storedDraft?.allocations?.length) {
        setEffectiveMatch(match);
        return;
      }

      const amountByLabel = new Map(storedDraft.allocations.map((item) => [item.label, item.amount]));
      setEffectiveMatch({
        ...match,
        draftState: storedDraft.status,
        allocation: match.allocation.map((item) => {
          const amount = amountByLabel.get(item.label) ?? item.amount;
          return {
            ...item,
            amount,
            percentage: Math.round((amount / 10000) * 100),
          };
        }),
      });
    };

    sync();
    window.addEventListener(ALLOCATION_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(ALLOCATION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [allocationScope, match]);

  useEffect(() => {
    setIsEditingSaved(false);
  }, [effectiveMatch.id]);

  useEffect(() => {
    return () => {
      if (saveResetTimeoutRef.current) {
        clearTimeout(saveResetTimeoutRef.current);
      }
    };
  }, []);

  const quickPlayTargets = useMemo(() => getQuickPlayOutcomeTargets(effectiveMatch), [effectiveMatch]);
  const resolvedOutcome = deriveResolvedOutcome(effectiveMatch);
  const groupBuckets = useMemo(() => buildGroupBuckets(effectiveMatch), [effectiveMatch]);
  const totalPot = useMemo(
    () =>
      effectiveMatch.revealedTickets.reduce(
        (sum, ticket) => sum + ticket.allocations.reduce((ticketTotal, item) => ticketTotal + item.amount, 0),
        0,
      ),
    [effectiveMatch.revealedTickets],
  );

  function resetPhase() {
    if (saveResetTimeoutRef.current) {
      clearTimeout(saveResetTimeoutRef.current);
      saveResetTimeoutRef.current = null;
    }
    setPhase("idle");
    setChosenOutcome(null);
    setChosenIntensity(null);
    setSaveMessage(null);
    setSaveTone("default");
    setIsSaving(false);
    setIsEditingSaved(false);
    x.set(0);
    y.set(0);
    cardOpacity.set(1);
  }

  async function chooseOutcome(code: MatchOutcomeCode) {
    if (!cardState.isInteractive || phase !== "idle" || isChoosingRef.current) {
      return;
    }

    isChoosingRef.current = true;
    setIsEditingSaved(true);
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
      effectiveMatch.allocation.map((item) => item.code),
      chosenOutcome,
      option.id,
    ).map((item) => ({
      code: item.outcomeCode as MatchViewModel["allocation"][number]["code"],
      label: effectiveMatch.allocation.find((allocation) => allocation.code === item.outcomeCode)?.label ?? item.outcomeCode,
      amount: item.amount,
    }));

    saveStoredAllocation(allocationScope, effectiveMatch.id, {
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
          matchId: effectiveMatch.id,
          allocations: payload,
        }),
      });

      if (!response.ok) {
        throw new Error("remote save failed");
      }

      saveStoredAllocation(allocationScope, effectiveMatch.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "saved_remote",
      });
      setSaveMessage("Guardado");
      setSaveTone("default");
      router.refresh();
    } catch {
      saveStoredAllocation(allocationScope, effectiveMatch.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "sync_error",
      });
      setSaveMessage(session?.kind === "remote" ? "Guardado local" : "Guardado local");
      setSaveTone("warning");
    } finally {
      setIsSaving(false);
      if (saveResetTimeoutRef.current) {
        clearTimeout(saveResetTimeoutRef.current);
      }
      saveResetTimeoutRef.current = setTimeout(() => {
        resetPhase();
      }, 900);
    }
  }

  const isInteractiveEditor =
    cardState.mode === "editable-empty" || (cardState.mode === "editable-saved" && (isEditingSaved || phase !== "idle"));
  const showMatchCenter =
    cardState.mode === "editable-empty" ||
    (cardState.mode === "editable-saved" && (isEditingSaved || phase !== "idle"));
  const showSavedSummaryHero = cardState.mode === "editable-saved" && !isEditingSaved && phase === "idle";
  const showLiveSummaryHero = cardState.mode === "live" && phase === "idle";
  const showSettledSummaryHero = cardState.mode === "settled" && phase === "idle";
  const compactHeroMinHeight = 176;
  const chosenColor = chosenOutcome ? getOutcomeColor(chosenOutcome) : null;

  const heroToneColor =
    cardState.heroTone === "positive"
      ? "#7EDC96"
      : cardState.heroTone === "negative"
        ? "#FF8B84"
        : cardState.heroTone === "live"
        ? "#FF8B84"
          : "#EDE8D9";

  async function snapCardBack() {
    await Promise.all([
      animate(x, 0, { type: "spring", stiffness: 540, damping: 34, mass: 0.72 }).finished,
      animate(y, 0, { type: "spring", stiffness: 540, damping: 34, mass: 0.72 }).finished,
      animate(cardOpacity, 1, { duration: 0.14, ease: "easeOut" }).finished,
    ]);
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/matches");
  }

  return (
    <section className="section-stack-lg">
      <div style={{ display: "grid", gap: 16 }}>
        <div className="split-row" style={{ alignItems: "start", flexWrap: "wrap", paddingInline: 4 }}>
          <button className="button-ghost" onClick={handleBack} type="button" style={{ minHeight: 42, borderRadius: 999, paddingInline: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>
          <span className="micro-copy">{effectiveMatch.stage}</span>
        </div>

        {showMatchCenter ? (
          <div
            className="surface-card"
            style={{
              position: "relative",
              padding: 12,
              background:
                phase === "chosen" && chosenColor
                  ? `linear-gradient(160deg, color-mix(in srgb, ${chosenColor} 22%, #1F3E28) 0%, #112015 38%, #0E1D13 100%)`
                  : undefined,
              border:
                phase === "chosen" && chosenColor
                  ? `1px solid ${chosenColor}30`
                  : undefined,
              boxShadow:
                phase === "chosen" && chosenColor
                  ? `0 32px 80px rgba(0,0,0,0.65), 0 0 50px ${chosenColor}15`
                  : undefined,
            }}
          >
            <AnimatePresence mode="wait">
              {phase === "idle" ? (
                <motion.div
                  key={`detail-idle-${effectiveMatch.id}`}
                  drag={isInteractiveEditor}
                  dragMomentum={false}
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.14}
                  onDragEnd={async (_, info) => {
                    const outcome = getQuickPlaySwipeOutcome(effectiveMatch, info.offset.x, info.offset.y);
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
                    minHeight: 302,
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 18,
                    background: "transparent",
                    willChange: "transform, opacity",
                  }}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 250, damping: 24 }}
                  whileDrag={isInteractiveEditor ? { scale: 1.008 } : undefined}
                >
                  {isInteractiveEditor ? (
                    <>
                      <motion.div style={{ opacity: homeOpacity, position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(135deg, rgba(61,155,95,0.55) 0%, transparent 55%)" }} />
                      <motion.div style={{ opacity: awayOpacity, position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(225deg, rgba(232,65,58,0.55) 0%, transparent 55%)" }} />
                      {cardState.showDrawGesture ? <motion.div style={{ opacity: drawOpacity, position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(0deg, rgba(91,143,240,0.5) 0%, transparent 50%)" }} /> : null}
                    </>
                  ) : null}
                  <VoteFace
                    match={effectiveMatch}
                    showDrawGesture={isInteractiveEditor && cardState.showDrawGesture}
                    centerMode={cardState.mode === "live" || cardState.mode === "settled" ? "score" : "vs"}
                    topRightLabel={cardState.centerTopLabel ?? undefined}
                    outcomeTargets={isInteractiveEditor ? quickPlayTargets : undefined}
                    onSelectOutcome={isInteractiveEditor ? (code) => void chooseOutcome(code) : undefined}
                  />
                </motion.div>
              ) : null}

              {phase === "idle" && isInteractiveEditor ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 12 }}>
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
                    type="button"
                  >
                    <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                      <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{effectiveMatch.home.flag}</span>
                      <span style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontSize: ".5rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>
                        {effectiveMatch.home.name.slice(0, 3)}
                      </span>
                    </div>
                  </motion.button>
                  {cardState.showDrawGesture && quickPlayTargets.draw ? (
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
                        boxShadow: "0 4px 20px rgba(91,143,240,0.16)",
                        display: "grid",
                        placeItems: "center",
                      }}
                      type="button"
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
                    type="button"
                  >
                    <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                      <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{effectiveMatch.away.flag}</span>
                      <span style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontSize: ".5rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>
                        {effectiveMatch.away.name.slice(0, 3)}
                      </span>
                    </div>
                  </motion.button>
                </div>
              ) : null}

              {phase === "chosen" && chosenOutcome ? (
                <motion.div
                  key={`detail-chosen-${effectiveMatch.id}-${chosenOutcome}`}
                  initial={{ scale: 0.94, opacity: 0, y: 14 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: -14 }}
                  transition={{ type: "spring", stiffness: 250, damping: 24 }}
                  style={{
                    minHeight: 302,
                    display: "grid",
                    gap: 16,
                    alignContent: "start",
                    padding: 18,
                  }}
                >
                  <div className="split-row" style={{ alignItems: "center", gap: 12 }}>
                    <span className="eyebrow">{effectiveMatch.stage}</span>
                    <span className="micro-copy">{effectiveMatch.kickoffLabel}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: chosenColor ?? "#EDE8D9" }} />
                    <p className="eyebrow">Vas con</p>
                  </div>

                  <div className="title-stack">
                    <h2 className="section-title">{effectiveMatch.allocation.find((item) => item.code === chosenOutcome)?.label ?? "Pick"}</h2>
                    <p className="muted-copy" style={{ color: getOutcomeColor(chosenOutcome) }}>{getOutcomeHint(chosenOutcome, effectiveMatch.marketType)}</p>
                  </div>

                  <p className="eyebrow">¿Cómo la querés jugar?</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    {INTENSITIES.map((option) => {
                      const Icon = option.icon;
                      return (
                        <motion.button
                          key={option.id}
                          whileTap={{ scale: 0.94 }}
                          whileHover={{ scale: 1.03 }}
                          onClick={() => void handleIntensityPick(option)}
                          style={{
                            minHeight: 108,
                            borderRadius: 16,
                            border: "1px solid rgba(255,255,255,0.09)",
                            background: "rgba(255,255,255,0.04)",
                            display: "grid",
                            placeItems: "center",
                            gap: 8,
                            padding: 14,
                            color: "#EDE8D9",
                          }}
                        >
                          <Icon size={24} />
                          <span style={{ fontFamily: "var(--font-display)", fontSize: ".94rem", fontWeight: 700 }}>{option.label}</span>
                          <span className="micro-copy">{getIntensityCopy(option.id)}</span>
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
                  key={`detail-saved-${effectiveMatch.id}-${chosenOutcome}-${chosenIntensity}`}
                  initial={{ scale: 0.96, opacity: 0, y: 16 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: -24 }}
                  transition={{ type: "spring", stiffness: 250, damping: 24 }}
                  style={{ minHeight: 302, display: "grid", placeItems: "center", textAlign: "center", padding: 18 }}
                >
                  <div className="section-stack" style={{ justifyItems: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(61,155,95,0.18)", border: "2px solid #3D9B5F", boxShadow: isSaving ? "0 0 0 12px rgba(61,155,95,0.08)" : "0 0 0 0 rgba(61,155,95,0)" }}>
                      <Check size={28} style={{ color: "#3D9B5F" }} />
                    </div>
                    <p className="section-title">Guardado</p>
                    <p className="muted-copy">
                      {getOutcomeFlag(chosenOutcome, effectiveMatch)} {effectiveMatch.allocation.find((item) => item.code === chosenOutcome)?.label}
                      {" · "}
                      {getIntensityCopy(chosenIntensity)}
                    </p>
                    {saveMessage ? <span className="micro-copy" style={{ color: saveTone === "warning" ? "#D4A64B" : saveTone === "loading" ? "#EDE8D9" : "#7A9A81" }}>{saveMessage}</span> : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : showSavedSummaryHero ? (
          <div className="surface-card" style={{ position: "relative", padding: 18 }}>
            <div
              style={{
                minHeight: compactHeroMinHeight,
                display: "grid",
                alignContent: "start",
                justifyItems: "start",
                gap: 12,
              }}
            >
              <div className="title-stack">
                <p className="eyebrow">Esta es tu jugada</p>
                <h2 className="display-title" style={{ fontSize: "clamp(2rem, 7vw, 2.7rem)", lineHeight: 0.98 }}>
                  {cardState.heroValue}
                </h2>
                <p className="muted-copy" style={{ color: cardState.leadingUserOutcome ? getOutcomeColor(cardState.leadingUserOutcome.code) : undefined }}>
                  {cardState.heroDescription}
                </p>
              </div>

              <button className="button-secondary" style={{ minHeight: 44, borderRadius: 999, paddingInline: 16 }} onClick={() => setIsEditingSaved(true)} type="button">
                Cambiar jugada
              </button>
            </div>
          </div>
        ) : showLiveSummaryHero ? (
          <div className="surface-card" style={{ position: "relative", padding: 18 }}>
            <div
              style={{
                minHeight: compactHeroMinHeight,
                display: "grid",
                alignContent: "start",
                justifyItems: "start",
                gap: 12,
              }}
            >
              <div className="title-stack">
                <p className="eyebrow">Esta es tu jugada</p>
                <h2 className="display-title" style={{ fontSize: "clamp(2rem, 7vw, 2.7rem)", lineHeight: 0.98 }}>
                  {cardState.heroValue}
                </h2>
                <p className="muted-copy" style={{ color: cardState.leadingUserOutcome ? getOutcomeColor(cardState.leadingUserOutcome.code) : undefined }}>
                  {cardState.heroDescription}
                </p>
              </div>

              <div className="split-row" style={{ width: "100%", alignItems: "end" }}>
                <div className="title-stack">
                  <span className="micro-copy">Marcador</span>
                  <strong style={{ fontFamily: "var(--font-accent)", fontSize: "2rem", letterSpacing: "-0.06em" }}>{cardState.scoreOrKickoffLabel}</strong>
                </div>
                <span className="micro-copy">
                  {effectiveMatch.home.flag} {effectiveMatch.home.name} vs {effectiveMatch.away.flag} {effectiveMatch.away.name}
                </span>
              </div>
            </div>
          </div>
        ) : showSettledSummaryHero ? (
          <div className="surface-card" style={{ position: "relative", padding: 18 }}>
            <div
              style={{
                minHeight: compactHeroMinHeight,
                display: "grid",
                alignContent: "start",
                justifyItems: "start",
                gap: 12,
              }}
            >
              <div className="title-stack">
                <p className="eyebrow">Resultado final</p>
                <h2 className="display-title" style={{ fontSize: "clamp(2rem, 7vw, 2.7rem)", lineHeight: 0.98, color: heroToneColor }}>
                  {cardState.heroValue}
                </h2>
                <p className="muted-copy">{cardState.heroDescription}</p>
              </div>

              <div className="split-row" style={{ width: "100%", alignItems: "end" }}>
                <div className="title-stack">
                  <span className="micro-copy">Ganó</span>
                  <strong style={{ color: cardState.winningOutcome ? getOutcomeColor(cardState.winningOutcome) : undefined }}>
                    {cardState.winningOutcome ? `${getOutcomeFlag(cardState.winningOutcome, effectiveMatch)} ${effectiveMatch.consensus.find((item) => item.code === cardState.winningOutcome)?.label ?? "Resultado"}` : "Final"}
                  </strong>
                </div>
                <div className="title-stack text-right">
                  <span className="micro-copy">Marcador</span>
                  <strong style={{ fontFamily: "var(--font-accent)", fontSize: "2rem", letterSpacing: "-0.06em" }}>{cardState.scoreOrKickoffLabel}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 12, paddingInline: 4 }}>
          {phase === "idle" && cardState.mode === "editable-empty" ? <span className="micro-copy">Elegí un lado desde la cancha de arriba.</span> : null}
          {phase === "idle" && cardState.mode === "editable-saved" && isEditingSaved ? (
            <span className="micro-copy">Elegí el nuevo lado desde la cancha de arriba.</span>
          ) : null}
          {phase === "saved" && saveMessage ? <span className="micro-copy" style={{ color: saveTone === "warning" ? "#D4A64B" : "#7A9A81" }}>{saveMessage}</span> : null}

          <div style={{ display: "grid", gap: 12 }}>
            {cardState.leadingConsensus ? (
              <div style={{ display: "grid", gap: 4 }}>
                <span className="micro-copy">Grupo</span>
                <strong style={{ color: getOutcomeColor(cardState.leadingConsensus.code) }}>
                  {cardState.leadingConsensus.label} {cardState.leadingConsensus.percentage}%
                </strong>
              </div>
            ) : (
              <span className="micro-copy">Todavía sin lectura del grupo.</span>
            )}
            {groupBuckets.map((bucket) => {
              const isWinning = resolvedOutcome === bucket.outcome.code;
              const pickCount = effectiveMatch.pickCountByCode[bucket.outcome.code] ?? bucket.tickets.length;
              const isRevealed = effectiveMatch.marketStatus === "revealed" || effectiveMatch.marketStatus === "settled";

              return (
                <article key={bucket.outcome.code} style={{ display: "grid", gap: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="split-row">
                    <strong style={{ color: isWinning ? getOutcomeColor(bucket.outcome.code) : "#EDE8D9", fontSize: "1rem" }}>
                      {getOutcomeFlag(bucket.outcome.code, effectiveMatch)} {bucket.outcome.label}
                    </strong>
                    <span className="micro-copy">{pickCount} picks</span>
                  </div>
                  {isRevealed && bucket.tickets.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {bucket.tickets.map((ticket) => (
                        <div key={`${bucket.outcome.code}-${ticket.userName}`} className="split-row">
                          <div style={{ display: "grid", gap: 2 }}>
                            <strong style={{ fontSize: ".92rem" }}>{ticket.userName}</strong>
                            {ticket.netAmount != null ? <span className="micro-copy">{formatNetAmount(ticket.netAmount)}</span> : null}
                          </div>
                          <strong style={{ color: isWinning ? getOutcomeColor(bucket.outcome.code) : "#97AD99", fontFamily: "var(--font-accent)", letterSpacing: "-0.04em" }}>
                            {formatCredits(ticket.amount)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : pickCount === 0 ? (
                    <span className="micro-copy">Sin jugadas</span>
                  ) : null}
                </article>
              );
            })}
            {totalPot > 0 ? (
              <div className="split-row" style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="muted-copy">Pozo</span>
                <strong style={{ color: "#D8B56A", fontFamily: "var(--font-accent)", fontSize: "1.18rem", letterSpacing: "-0.05em" }}>
                  {formatCompactCredits(totalPot)} cr
                </strong>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function buildGroupBuckets(match: MatchViewModel) {
  const grouped = new Map<
    MatchOutcomeCode,
    {
      outcome: MatchViewModel["allocation"][number];
      tickets: {
        userName: string;
        amount: number;
        netAmount?: number;
      }[];
    }
  >();

  for (const outcome of match.allocation) {
    grouped.set(outcome.code, { outcome, tickets: [] });
  }

  for (const ticket of match.revealedTickets) {
    const dominant = [...ticket.allocations].sort((left, right) => right.amount - left.amount)[0];

    if (!dominant) {
      continue;
    }

    const bucket = grouped.get(dominant.code);
    if (!bucket) {
      continue;
    }

    bucket.tickets.push({
      userName: ticket.userName,
      amount: dominant.amount,
      netAmount: ticket.netAmount,
    });
  }

  const winningOutcome = deriveResolvedOutcome(match);

  return [...grouped.values()].sort((left, right) => {
    const leftRank = winningOutcome === left.outcome.code ? 0 : 1;
    const rightRank = winningOutcome === right.outcome.code ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return right.tickets.length - left.tickets.length;
  });
}
