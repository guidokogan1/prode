"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowLeft, Check } from "lucide-react";
import { SessionContext } from "@/components/session-provider";
import { ShareImageButton } from "@/components/share-image-button";
import { VoteFace } from "@/components/vote-face";
import { TeamCrest } from "@/components/team-crest";
import { getMatchCardState } from "@/lib/match-card";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { formatCredits, formatGross } from "@/lib/format";
import { buildSinglePickAllocation, creditForMarketType } from "@/lib/game";
import { ALLOCATION_EVENT, buildAllocationScope, getStoredAllocation, saveStoredAllocation } from "@/lib/local-store";
import {
  deriveResolvedOutcome,
  formatCompactCredits,
  getOutcomeColor,
  getOutcomeFlag,
  getQuickPlayOutcomeTargets,
  getQuickPlaySwipeOutcome,
} from "@/lib/match-ui";

type MatchDetailCardProps = {
  match: MatchViewModel;
};

type CardPhase = "idle" | "saved";

export function MatchDetailCard({ match }: MatchDetailCardProps) {
  const router = useRouter();
  const session = useContext(SessionContext);
  const allocationScope = buildAllocationScope(session);
  const [effectiveMatch, setEffectiveMatch] = useState(match);
  const cardState = useMemo(() => getMatchCardState(effectiveMatch, "hero"), [effectiveMatch]);
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [isEditingSaved, setIsEditingSaved] = useState(false);
  const [chosenOutcome, setChosenOutcome] = useState<MatchOutcomeCode | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"default" | "warning" | "loading">("default");
  const [isSaving, setIsSaving] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(false);
  const isChoosingRef = useRef(false);
  const saveResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTargetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsFinePointer(mq.matches);
    const handler = (event: MediaQueryListEvent) => setIsFinePointer(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const cardOpacity = useMotionValue(1);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const homeOpacity = useTransform(x, [-140, -36], [1, 0]);
  const awayOpacity = useTransform(x, [36, 140], [0, 1]);
  const drawOpacity = useTransform(y, [-136, -36], [1, 0]);

  useEffect(() => {
    const sync = () => {
      if (!match.isEditable) {
        setEffectiveMatch(match);
        return;
      }

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
  const liquidationRows = useMemo(() => {
    const isSettled = effectiveMatch.marketStatus === "settled" || effectiveMatch.statusVariant === "settled";
    if (!isSettled) return [];
    return effectiveMatch.revealedTickets
      .filter((ticket): ticket is typeof ticket & { netAmount: number } => typeof ticket.netAmount === "number")
      .map((ticket) => ({
        userName: ticket.userName,
        netAmount: ticket.netAmount,
        grossAmount: ticket.grossAmount ?? ticket.netAmount + 10000,
      }))
      .sort((left, right) => right.grossAmount - left.grossAmount);
  }, [effectiveMatch.marketStatus, effectiveMatch.statusVariant, effectiveMatch.revealedTickets]);

  const settlementBreakdown = useMemo(() => {
    const isSettled = effectiveMatch.marketStatus === "settled" || effectiveMatch.statusVariant === "settled";
    if (!isSettled || !resolvedOutcome || totalPot <= 0) return null;

    const userAllocations = effectiveMatch.allocation.filter((item) => item.amount > 0);
    const winningBucket = groupBuckets.find((bucket) => bucket.outcome.code === resolvedOutcome);
    const winningLabel = winningBucket?.outcome.label ?? "el ganador";
    const winningPool = winningBucket?.tickets.reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const userStakeOnWinner = userAllocations.find((item) => item.code === resolvedOutcome)?.amount ?? 0;
    const userDominant = [...userAllocations].sort((a, b) => b.amount - a.amount)[0];
    const dominantHit = userDominant?.code === resolvedOutcome;
    const userGross = winningPool > 0 ? totalPot * (userStakeOnWinner / winningPool) : 0;
    const userSharePct = winningPool > 0 ? (userStakeOnWinner / winningPool) * 100 : 0;

    return {
      hasPlayed: userAllocations.length > 0,
      winningLabel,
      winningPool,
      userStakeOnWinner,
      userDominantLabel: userDominant?.label ?? null,
      dominantHit,
      userGross,
      userSharePct,
      totalPot,
    };
  }, [effectiveMatch.marketStatus, effectiveMatch.statusVariant, effectiveMatch.allocation, resolvedOutcome, groupBuckets, totalPot]);

  function resetPhase() {
    if (saveResetTimeoutRef.current) {
      clearTimeout(saveResetTimeoutRef.current);
      saveResetTimeoutRef.current = null;
    }
    setPhase("idle");
    setChosenOutcome(null);
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

    const payload = buildSinglePickAllocation(
      effectiveMatch.allocation.map((item) => item.code),
      code,
      creditForMarketType(effectiveMatch.marketType),
    ).map((item) => ({
      code: item.outcomeCode as MatchViewModel["allocation"][number]["code"],
      label: effectiveMatch.allocation.find((allocation) => allocation.code === item.outcomeCode)?.label ?? item.outcomeCode,
      amount: item.amount,
    }));

    await Promise.all([
      animate(x, targetX, { duration: 0.2, ease: "easeOut" }).finished,
      animate(y, targetY, { duration: 0.2, ease: "easeOut" }).finished,
      animate(cardOpacity, 0, { duration: 0.18, ease: "easeOut" }).finished,
    ]);

    saveStoredAllocation(allocationScope, effectiveMatch.id, {
      allocations: payload,
      savedAt: new Date().toISOString(),
      status: "draft",
    });

    setChosenOutcome(code);
    setPhase("saved");
    x.set(0);
    y.set(0);
    cardOpacity.set(1);
    isChoosingRef.current = false;
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
  const showDrawGesture = quickPlayTargets.draw != null;

  useEffect(() => {
    if (!isFinePointer || !isInteractiveEditor || phase !== "idle") {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void chooseOutcome(quickPlayTargets.left);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void chooseOutcome(quickPlayTargets.right);
      } else if (event.key === "ArrowUp" && showDrawGesture && quickPlayTargets.draw) {
        event.preventDefault();
        void chooseOutcome(quickPlayTargets.draw);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFinePointer, isInteractiveEditor, phase, quickPlayTargets, showDrawGesture]);

  const showMatchCenter =
    cardState.mode === "editable-empty" ||
    (cardState.mode === "editable-saved" && (isEditingSaved || phase !== "idle"));
  const showSavedSummaryHero = cardState.mode === "editable-saved" && !isEditingSaved && phase === "idle";
  const showLiveSummaryHero = cardState.mode === "live" && phase === "idle";
  const showSettledSummaryHero = cardState.mode === "settled" && phase === "idle";
  const compactHeroMinHeight = 176;
  const heroPanelBackground = "rgba(12, 17, 24, 0.96)";
  const heroPanelBorder = "rgba(255,255,255,0.1)";

  const heroToneColor =
    cardState.heroTone === "positive"
      ? "var(--gold)"
      : cardState.heroTone === "negative"
        ? "var(--negative)"
        : cardState.heroTone === "live"
        ? "var(--live)"
          : "#EDE8D9";

  async function snapCardBack() {
    const spring = isFinePointer
      ? { type: "spring" as const, stiffness: 320, damping: 44, mass: 0.8 }
      : { type: "spring" as const, stiffness: 540, damping: 34, mass: 0.72 };
    await Promise.all([
      animate(x, 0, spring).finished,
      animate(y, 0, spring).finished,
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
    <section className="section-stack-lg" ref={shareTargetRef}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingInline: 4 }}>
          <button className="button-secondary" onClick={handleBack} type="button" style={{ minHeight: 42, borderRadius: 999, paddingInline: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>
          {cardState.mode === "settled" ? (
            <ShareImageButton
              targetRef={shareTargetRef}
              fileName={`prode-${effectiveMatch.home.name.toLowerCase()}-${effectiveMatch.away.name.toLowerCase()}.jpg`}
              shareText={`Cómo quedó ${effectiveMatch.home.name} vs ${effectiveMatch.away.name}`}
              label="Compartir"
              className="button-ghost"
              style={{ minHeight: 42 }}
            />
          ) : null}
        </div>

        {showMatchCenter ? (
          <div
            className={phase === "idle" ? "surface-card" : undefined}
            style={{
              position: "relative",
              padding: phase === "idle" ? 12 : 0,
              minHeight: phase === "idle" ? undefined : 250,
              background: phase === "idle" ? undefined : "transparent",
              border: phase === "idle" ? undefined : "0",
              boxShadow: phase === "idle" ? undefined : "none",
              overflow: "visible",
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
                    minHeight: 250,
                    display: "grid",
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
                      <motion.div style={{ opacity: homeOpacity, position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(135deg, rgba(63,227,242,0.55) 0%, transparent 55%)" }} />
                      <motion.div style={{ opacity: awayOpacity, position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(225deg, rgba(244,166,60,0.55) 0%, transparent 55%)" }} />
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

              {phase === "saved" && chosenOutcome ? (
                <motion.div
                  key={`detail-saved-${effectiveMatch.id}-${chosenOutcome}`}
                  initial={{ scale: 0.96, opacity: 0, y: 16 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: -24 }}
                  transition={{ type: "spring", stiffness: 250, damping: 24 }}
                  className="surface-card"
                  style={{
                    minHeight: 270,
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                    padding: 16,
                    background: heroPanelBackground,
                    borderColor: heroPanelBorder,
                  }}
                >
                  <div className="section-stack" style={{ justifyItems: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(63,227,242,0.14)", border: "2px solid rgba(63,227,242,0.48)", boxShadow: isSaving ? "0 0 0 10px rgba(63,227,242,0.08)" : "0 0 0 0 rgba(63,227,242,0)" }}>
                      <Check size={24} style={{ color: "var(--gold)" }} />
                    </div>
                    <p className="section-title">Guardado</p>
                    <p className="muted-copy">
                      {getOutcomeFlag(chosenOutcome, effectiveMatch)} {effectiveMatch.allocation.find((item) => item.code === chosenOutcome)?.label}
                    </p>
                    {saveMessage ? <span className="micro-copy" style={{ color: saveTone === "warning" ? "var(--live)" : saveTone === "loading" ? "#EDE8D9" : "var(--gold)" }}>{saveMessage}</span> : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {phase === "idle" && isInteractiveEditor ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 12 }}>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => void chooseOutcome(quickPlayTargets.left)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    border: "1.5px solid rgba(63,227,242,0.3)",
                    background: "rgba(63,227,242,0.12)",
                    boxShadow: "0 4px 20px rgba(63,227,242,0.16)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--gold)",
                  }}
                  type="button"
                >
                  <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                    <TeamCrest url={effectiveMatch.home.logo} alt={effectiveMatch.home.name} size={20} />
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
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      border: "1.5px solid rgba(142,162,201,0.35)",
                      background: "rgba(142,162,201,0.12)",
                      boxShadow: "0 4px 20px rgba(142,162,201,0.16)",
                      display: "grid",
                      placeItems: "center",
                    }}
                    type="button"
                  >
                    <span style={{ fontSize: "1rem" }}>🤝</span>
                  </motion.button>
                ) : null}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => void chooseOutcome(quickPlayTargets.right)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    border: "1.5px solid rgba(244,166,60,0.35)",
                    background: "rgba(244,166,60,0.12)",
                    boxShadow: "0 4px 20px rgba(244,166,60,0.18)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--live)",
                  }}
                  type="button"
                >
                  <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                    <TeamCrest url={effectiveMatch.away.logo} alt={effectiveMatch.away.name} size={20} />
                    <span style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontSize: ".5rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>
                      {effectiveMatch.away.name.slice(0, 3)}
                    </span>
                  </div>
                </motion.button>
              </div>
            ) : null}
            {isFinePointer && isInteractiveEditor && phase === "idle" ? (
              <p
                className="micro-copy"
                style={{
                  textAlign: "center",
                  marginTop: 8,
                  color: "var(--text-tertiary)",
                  letterSpacing: ".06em",
                }}
              >
                Atajos: <kbd>←</kbd>{cardState.showDrawGesture ? <> <kbd>↑</kbd></> : null} <kbd>→</kbd>
              </p>
            ) : null}
          </div>
        ) : showSavedSummaryHero ? (
          <div className="surface-card" style={{ position: "relative", padding: 16, background: heroPanelBackground, borderColor: heroPanelBorder }}>
            <div
              style={{
                minHeight: 220,
                height: "100%",
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                justifyItems: "center",
                gap: 14,
                textAlign: "center",
              }}
            >
              <div
                className="title-stack"
                style={{
                  justifyItems: "center",
                  alignContent: "center",
                  alignSelf: "stretch",
                  gap: 6,
                  minHeight: 0,
                }}
              >
                <p className="eyebrow">Esta es tu jugada</p>
                {cardState.leadingUserOutcome ? <span style={{ fontSize: "2.8rem", lineHeight: 1 }}>{getOutcomeFlag(cardState.leadingUserOutcome.code, effectiveMatch)}</span> : null}
                <h2 className="display-title" style={{ fontSize: "clamp(1.9rem, 8vw, 2.3rem)", lineHeight: 0.94 }}>
                  {cardState.heroValue}
                </h2>
                <p className="muted-copy" style={{ color: cardState.leadingUserOutcome ? getOutcomeColor(cardState.leadingUserOutcome.code) : undefined }}>
                  {cardState.heroDescription}
                </p>
              </div>

              <div />

              <button className="button-secondary" style={{ minHeight: 42, width: "100%", borderRadius: 999, paddingInline: 14 }} onClick={() => setIsEditingSaved(true)} type="button">
                Cambiar jugada
              </button>
            </div>
          </div>
        ) : showLiveSummaryHero ? (
          <div className="surface-card" style={{ position: "relative", padding: 16, background: heroPanelBackground, borderColor: heroPanelBorder }}>
            <div
              style={{
                minHeight: 220,
                height: "100%",
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                justifyItems: "center",
                gap: 14,
                textAlign: "center",
              }}
            >
              <div className="title-stack" style={{ justifyItems: "center", gap: 6 }}>
                <p className="eyebrow">Esta es tu jugada</p>
                <h2 className="display-title" style={{ fontSize: "clamp(2rem, 7vw, 2.7rem)", lineHeight: 0.98 }}>
                  {cardState.heroValue}
                </h2>
                <p className="muted-copy" style={{ color: cardState.leadingUserOutcome ? getOutcomeColor(cardState.leadingUserOutcome.code) : undefined }}>
                  {cardState.heroDescription}
                </p>
              </div>

              <div />

              <div className="split-row" style={{ width: "100%", alignItems: "end" }}>
                <div className="title-stack" style={{ textAlign: "left" }}>
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
          <div className="surface-card" style={{ position: "relative", padding: 16, background: heroPanelBackground, borderColor: heroPanelBorder }}>
            <div
              style={{
                display: "grid",
                gap: 14,
                textAlign: "center",
              }}
            >
              <div className="title-stack" style={{ justifyItems: "center", gap: 6 }}>
                <p className="eyebrow">Resultado final</p>
                <h2 className="display-title" style={{ fontSize: "clamp(2rem, 7vw, 2.7rem)", lineHeight: 0.98, color: heroToneColor }}>
                  {cardState.heroValue}
                </h2>
                <p className="muted-copy">{cardState.heroDescription}</p>
              </div>

              <div className="split-row" style={{ width: "100%", alignItems: "end", paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="title-stack" style={{ textAlign: "left", gap: 2 }}>
                  <span className="micro-copy">Ganó</span>
                  <strong style={{ color: "var(--gold)" }}>
                    {cardState.winningOutcome ? `${getOutcomeFlag(cardState.winningOutcome, effectiveMatch)} ${effectiveMatch.consensus.find((item) => item.code === cardState.winningOutcome)?.label ?? "Resultado"}` : "Final"}
                  </strong>
                </div>
                <div className="title-stack text-right" style={{ gap: 2 }}>
                  <span className="micro-copy">Marcador</span>
                  <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1.8rem", letterSpacing: "-0.06em" }}>{cardState.scoreOrKickoffLabel}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 12, paddingInline: 4, marginTop: 14 }}>
          {phase === "idle" && cardState.mode === "editable-empty" ? <span className="micro-copy">Elegí un lado desde la cancha de arriba.</span> : null}
          {phase === "idle" && cardState.mode === "editable-saved" && isEditingSaved ? (
            <span className="micro-copy">Elegí el nuevo lado desde la cancha de arriba.</span>
          ) : null}
          {phase === "saved" && saveMessage ? <span className="micro-copy" style={{ color: saveTone === "warning" ? "#D4A64B" : "#7A9A81" }}>{saveMessage}</span> : null}

          <div style={{ display: "grid", gap: 18 }}>
            {groupBuckets.map((bucket) => {
              const isWinning = resolvedOutcome === bucket.outcome.code;
              const isRevealed = effectiveMatch.marketStatus === "revealed" || effectiveMatch.marketStatus === "settled";
              const totalOnOutcome = bucket.tickets.reduce((sum, ticket) => sum + ticket.amount, 0);
              const poolForOutcome = effectiveMatch.poolByCode[bucket.outcome.code] ?? 0;
              const totalPoolPreLock = Object.values(effectiveMatch.poolByCode).reduce<number>((sum, value) => sum + (value ?? 0), 0);
              const oddsMultiplier = poolForOutcome > 0 ? totalPoolPreLock / poolForOutcome : 0;
              const summaryLabel = isRevealed
                ? totalOnOutcome > 0
                  ? formatCredits(totalOnOutcome)
                  : "sin apuestas"
                : oddsMultiplier > 0
                  ? `paga x${oddsMultiplier.toFixed(2)}`
                  : "sin apuestas";
              const headerColor = !resolvedOutcome
                ? "#EDE8D9"
                : isWinning
                  ? "var(--gold)"
                  : "var(--text-tertiary)";

              return (
                <article key={bucket.outcome.code} style={{ display: "grid", gap: 12, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="split-row" style={{ gap: 16 }}>
                    <strong style={{ color: headerColor, fontSize: "1rem", textTransform: "uppercase" }}>
                      {getOutcomeFlag(bucket.outcome.code, effectiveMatch)} {bucket.outcome.label}
                    </strong>
                    <span className="micro-copy" style={{ whiteSpace: "nowrap" }}>
                      {summaryLabel}
                    </span>
                  </div>
                  {isRevealed && bucket.tickets.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {bucket.tickets.map((ticket, index) => (
                        <div key={`${bucket.outcome.code}-${ticket.userName}-${index}`} className="split-row">
                          <strong style={{ fontSize: ".92rem" }}>{ticket.userName}</strong>
                          <strong
                            style={{
                              color: isWinning ? "var(--gold)" : "var(--text-tertiary)",
                              fontFamily: "var(--font-accent)",
                              letterSpacing: "-0.04em",
                            }}
                          >
                            {formatCredits(ticket.amount)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}

            {liquidationRows.length ? (
              <section style={{ display: "grid", gap: 12, paddingTop: 12 }}>
                <div className="split-row" style={{ gap: 16 }}>
                  <strong style={{ fontSize: "1rem", textTransform: "uppercase", color: "#EDE8D9" }}>Liquidación</strong>
                  <span className="micro-copy" style={{ whiteSpace: "nowrap" }}>Cobrado por jugador</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {liquidationRows.map((row) => {
                    const grossColor = row.grossAmount > 0 ? "var(--gold)" : "var(--text-tertiary)";
                    return (
                      <div key={`liquidation-${row.userName}`} className="split-row">
                        <strong style={{ fontSize: ".92rem" }}>{row.userName}</strong>
                        <strong
                          style={{
                            color: grossColor,
                            fontFamily: "var(--font-accent)",
                            letterSpacing: "-0.04em",
                          }}
                        >
                          {formatGross(row.grossAmount)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {settlementBreakdown ? (
              <section
                className="surface-card-soft"
                style={{
                  marginTop: 4,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <strong style={{ fontSize: ".95rem", textTransform: "uppercase" }}>Cómo se calcula tu cobro</strong>
                {!settlementBreakdown.hasPlayed ? (
                  <p className="muted-copy" style={{ margin: 0 }}>
                    No jugaste este partido. Por eso cobraste {formatGross(0)}.
                  </p>
                ) : settlementBreakdown.userStakeOnWinner === 0 ? (
                  <p className="muted-copy" style={{ margin: 0, lineHeight: 1.55 }}>
                    Fuiste con <strong>{settlementBreakdown.userDominantLabel}</strong>. Ganó <strong>{settlementBreakdown.winningLabel}</strong>. No pusiste nada al ganador, por eso cobraste {formatGross(0)}.
                  </p>
                ) : (
                  <p className="muted-copy" style={{ margin: 0, lineHeight: 1.55 }}>
                    {settlementBreakdown.dominantHit ? (
                      <>
                        Pusiste <strong>{formatGross(settlementBreakdown.userStakeOnWinner)}</strong> a <strong>{settlementBreakdown.winningLabel}</strong>.
                      </>
                    ) : (
                      <>
                        Tu pick principal era <strong>{settlementBreakdown.userDominantLabel}</strong>, pero pusiste <strong>{formatGross(settlementBreakdown.userStakeOnWinner)}</strong> a <strong>{settlementBreakdown.winningLabel}</strong>, que ganó.
                      </>
                    )}
                    {" "}El pozo de {settlementBreakdown.winningLabel} fue <strong>{formatGross(settlementBreakdown.winningPool)}</strong>, así que tu parte es <strong>{Math.round(settlementBreakdown.userSharePct)}%</strong>. El pozo total fue <strong>{formatGross(settlementBreakdown.totalPot)}</strong>, por eso cobraste <strong style={{ color: "var(--gold)" }}>{formatGross(settlementBreakdown.userGross)}</strong>.
                  </p>
                )}
              </section>
            ) : null}

            {totalPot > 0 ? (
              <div className="split-row" style={{ paddingTop: 14, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="muted-copy">Pozo</span>
                <strong style={{ color: "var(--gold)", fontFamily: "var(--font-accent)", fontSize: "1.18rem", letterSpacing: "-0.05em" }}>
                  {formatCompactCredits(totalPot)}
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
    for (const allocation of ticket.allocations) {
      if (allocation.amount <= 0) continue;
      const bucket = grouped.get(allocation.code);
      if (!bucket) continue;
      bucket.tickets.push({
        userName: ticket.userName,
        amount: allocation.amount,
        netAmount: ticket.netAmount,
      });
    }
  }

  for (const bucket of grouped.values()) {
    bucket.tickets.sort((left, right) => right.amount - left.amount);
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
