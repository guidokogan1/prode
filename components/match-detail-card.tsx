"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check, Droplets, Flame, Sparkles } from "lucide-react";
import { SessionContext } from "@/components/session-provider";
import { VoteFace } from "@/components/vote-face";
import type { MatchCardTab } from "@/lib/match-card";
import { getMatchCardState } from "@/lib/match-card";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { formatCredits, formatNetAmount } from "@/lib/format";
import { buildWeightedAllocation } from "@/lib/game";
import { ALLOCATION_EVENT, getStoredAllocation, saveStoredAllocation } from "@/lib/local-store";
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

const INTENSITIES: { id: IntensityOption; label: string; hint: string; amount: number; icon: typeof Droplets }[] = [
  { id: "soft", label: "Suave", hint: "4.000 cr", amount: 4000, icon: Droplets },
  { id: "medium", label: "Media", hint: "5.500 cr", amount: 5500, icon: Sparkles },
  { id: "hard", label: "Fuerte", hint: "7.000 cr", amount: 7000, icon: Flame },
];

export function MatchDetailCard({ match }: MatchDetailCardProps) {
  const router = useRouter();
  const session = useContext(SessionContext);
  const [effectiveMatch, setEffectiveMatch] = useState(match);
  const cardState = useMemo(() => getMatchCardState(effectiveMatch, "hero"), [effectiveMatch]);
  const [activeTab, setActiveTab] = useState<MatchCardTab>(cardState.defaultTab);
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [isEditingSaved, setIsEditingSaved] = useState(false);
  const [chosenOutcome, setChosenOutcome] = useState<MatchOutcomeCode | null>(null);
  const [chosenIntensity, setChosenIntensity] = useState<IntensityOption | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"default" | "warning" | "loading">("default");
  const [isSaving, setIsSaving] = useState(false);
  const [exitDir, setExitDir] = useState<MatchOutcomeCode>("home");
  const isChoosingRef = useRef(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const cardOpacity = useMotionValue(1);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const homeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const awayOpacity = useTransform(x, [20, 100], [0, 1]);
  const drawOpacity = useTransform(y, [-100, -20], [1, 0]);

  useEffect(() => {
    const sync = () => {
      const storedDraft = getStoredAllocation(match.id);
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
  }, [match]);

  useEffect(() => {
    setActiveTab(cardState.defaultTab);
    setIsEditingSaved(false);
  }, [cardState.defaultTab, effectiveMatch.id]);

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
    setExitDir(code);
    setActiveTab("play");
    setIsEditingSaved(true);
    const targetX = code === "home" || code === "home_qualifies" ? -168 : code === "away" || code === "away_qualifies" ? 168 : 0;
    const targetY = code === "draw" ? -148 : 0;

    await Promise.all([
      animate(x, targetX, { type: "spring", stiffness: 235, damping: 24 }).finished,
      animate(y, targetY, { type: "spring", stiffness: 235, damping: 24 }).finished,
      animate(cardOpacity, 0.16, { duration: 0.18, ease: "easeOut" }).finished,
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

    const chosenAllocation = effectiveMatch.allocation.find((item) => item.code === chosenOutcome);
    if (!chosenAllocation) {
      return;
    }

    const payload = buildWeightedAllocation(
      effectiveMatch.allocation.map((item) => item.label),
      chosenAllocation.label,
      option.amount,
    ).map((item) => ({
      label: item.outcomeCode,
      amount: item.amount,
    }));

    saveStoredAllocation(effectiveMatch.id, {
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

      saveStoredAllocation(effectiveMatch.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "saved_remote",
      });
      setSaveMessage("Guardado");
      setSaveTone("default");
    } catch {
      saveStoredAllocation(effectiveMatch.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "sync_error",
      });
      setSaveMessage(session?.kind === "remote" ? "Guardado local" : "Guardado local");
      setSaveTone("warning");
    } finally {
      setIsSaving(false);
      router.refresh();
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

  const idleExit =
    exitDir === "home" || exitDir === "home_qualifies"
      ? { x: -380, opacity: 0, rotate: -14, transition: { duration: 0.28 } }
      : exitDir === "away" || exitDir === "away_qualifies"
        ? { x: 380, opacity: 0, rotate: 14, transition: { duration: 0.28 } }
        : { y: -380, opacity: 0, transition: { duration: 0.24 } };

  const heroToneColor =
    cardState.heroTone === "positive"
      ? "#7EDC96"
      : cardState.heroTone === "negative"
        ? "#FF8B84"
        : cardState.heroTone === "live"
          ? "#FF8B84"
          : "#EDE8D9";

  return (
    <section className="section-stack-lg">
      <div className="surface-card" style={{ padding: 18, display: "grid", gap: 18 }}>
        <div className="split-row" style={{ alignItems: "start", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill">{cardState.primaryStatusLabel}</span>
            {cardState.secondaryStatusLabel ? <span className="pill">{cardState.secondaryStatusLabel}</span> : null}
          </div>
          <span className="micro-copy">{effectiveMatch.stage}</span>
        </div>

        {showMatchCenter ? (
          <div style={{ position: "relative", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBlock: 8 }}>
            <AnimatePresence mode="wait">
              {phase === "idle" ? (
                <motion.div
                  key={`detail-idle-${effectiveMatch.id}`}
                  drag={isInteractiveEditor}
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.3}
                  onDragEnd={async (_, info) => {
                    const outcome = getQuickPlaySwipeOutcome(effectiveMatch, info.offset.x, info.offset.y);
                    if (outcome) {
                      await chooseOutcome(outcome);
                    }
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
                  }}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={idleExit}
                  transition={{ type: "spring", stiffness: 250, damping: 24 }}
                  whileDrag={isInteractiveEditor ? { scale: 1.018 } : undefined}
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

              {phase === "chosen" && chosenOutcome ? (
                <motion.div
                  key={`detail-chosen-${effectiveMatch.id}-${chosenOutcome}`}
                  initial={{ scale: 0.94, opacity: 0, y: 14 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: -14 }}
                  transition={{ type: "spring", stiffness: 250, damping: 24 }}
                  className="surface-card-soft soft-panel"
                  style={{
                    minHeight: 302,
                    background: `linear-gradient(160deg, color-mix(in srgb, ${getOutcomeColor(chosenOutcome)} 22%, #1F3E28) 0%, #112015 38%, #0E1D13 100%)`,
                    border: `1px solid ${getOutcomeColor(chosenOutcome)}30`,
                    display: "grid",
                    gap: 16,
                    alignContent: "start",
                  }}
                >
                  <div className="title-stack">
                    <p className="eyebrow">Elegiste</p>
                    <h2 className="section-title">{effectiveMatch.allocation.find((item) => item.code === chosenOutcome)?.label ?? "Pick"}</h2>
                    <p className="muted-copy" style={{ color: getOutcomeColor(chosenOutcome) }}>{getOutcomeHint(chosenOutcome, effectiveMatch.marketType)}</p>
                  </div>

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
                          <span className="micro-copy">{option.hint}</span>
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
                  className="surface-card-soft soft-panel"
                  style={{ minHeight: 302, display: "grid", placeItems: "center", textAlign: "center" }}
                >
                  <div className="section-stack" style={{ justifyItems: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(61,155,95,0.18)", border: "2px solid #3D9B5F" }}>
                      <Check size={28} style={{ color: "#3D9B5F" }} />
                    </div>
                    <p className="section-title">Guardado</p>
                    <p className="muted-copy">
                      {getOutcomeFlag(chosenOutcome, effectiveMatch)} {effectiveMatch.allocation.find((item) => item.code === chosenOutcome)?.label}
                      {" · "}
                      {INTENSITIES.find((item) => item.id === chosenIntensity)?.hint}
                    </p>
                    {saveMessage ? <span className="micro-copy" style={{ color: saveTone === "warning" ? "#D4A64B" : saveTone === "loading" ? "#EDE8D9" : "#7A9A81" }}>{saveMessage}</span> : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : showSavedSummaryHero ? (
          <div style={{ position: "relative", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBlock: 8 }}>
            <div
              style={{
                minHeight: compactHeroMinHeight,
                borderRadius: 18,
                display: "grid",
                alignContent: "start",
                justifyItems: "start",
                gap: 12,
                padding: 18,
                background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
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
          <div style={{ position: "relative", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBlock: 8 }}>
            <div
              style={{
                minHeight: compactHeroMinHeight,
                borderRadius: 18,
                display: "grid",
                alignContent: "start",
                justifyItems: "start",
                gap: 12,
                padding: 18,
                background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
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
          <div style={{ position: "relative", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBlock: 8 }}>
            <div
              style={{
                minHeight: compactHeroMinHeight,
                borderRadius: 18,
                display: "grid",
                alignContent: "start",
                justifyItems: "start",
                gap: 12,
                padding: 18,
                background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
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

        <div style={{ display: "grid", gap: 12 }}>
          {!showSavedSummaryHero && !showLiveSummaryHero && !showSettledSummaryHero ? (
            <>
              <div className="split-row" style={{ alignItems: "start", gap: 12 }}>
                <div className="title-stack">
                  <p className="eyebrow">{activeTab === "play" ? "Jugada" : "Grupo"}</p>
                  <h2 className="section-title" style={{ color: heroToneColor }}>{cardState.heroValue}</h2>
                </div>
                {cardState.secondaryStatusLabel && activeTab === "play" ? <span className="pill">{cardState.secondaryStatusLabel}</span> : null}
              </div>
              <p className="muted-copy">{cardState.heroDescription}</p>
            </>
          ) : (
            <p className="eyebrow">{activeTab === "play" ? "Jugada" : "Grupo"}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className={activeTab === "play" ? "button-secondary" : "button-ghost"} style={{ minHeight: 38, borderRadius: 999, paddingInline: 14 }} onClick={() => setActiveTab("play")} type="button">
              Jugada
            </button>
            <button className={activeTab === "group" ? "button-secondary" : "button-ghost"} style={{ minHeight: 38, borderRadius: 999, paddingInline: 14 }} onClick={() => setActiveTab("group")} type="button">
              Grupo
            </button>
          </div>

          {activeTab === "play" ? (
            cardState.mode === "editable-empty" || cardState.mode === "editable-saved" ? (
              <div style={{ display: "grid", gap: 10 }}>
                {phase === "idle" && cardState.mode === "editable-empty" ? (
                  <span className="micro-copy">Elegí un lado desde la cancha de arriba.</span>
                ) : null}
                {phase === "idle" && cardState.mode === "editable-saved" && isEditingSaved ? (
                  <span className="micro-copy">Elegí el nuevo lado desde la cancha de arriba.</span>
                ) : null}
                {phase === "saved" && saveMessage ? <span className="micro-copy" style={{ color: saveTone === "warning" ? "#D4A64B" : "#7A9A81" }}>{saveMessage}</span> : null}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {[...effectiveMatch.allocation].sort((left, right) => right.amount - left.amount).map((item) => (
                  <div
                    key={item.code}
                    className="surface-card-soft soft-panel-md"
                    style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", borderColor: cardState.leadingUserOutcome?.code === item.code && item.amount > 0 ? `${getOutcomeColor(item.code)}30` : "rgba(255,255,255,0.08)" }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong style={{ color: cardState.leadingUserOutcome?.code === item.code ? getOutcomeColor(item.code) : undefined }}>{item.label}</strong>
                      <span className="micro-copy">{item.percentage}%</span>
                    </div>
                    <strong style={{ color: getOutcomeColor(item.code), fontFamily: "var(--font-accent)", fontSize: "1.12rem", letterSpacing: "-0.04em" }}>
                      {formatCredits(item.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {cardState.mode === "editable-empty" || cardState.mode === "editable-saved" ? (
                cardState.leadingConsensus ? (
                  <div style={{ display: "grid", gap: 4 }}>
                    <span className="micro-copy">Grupo</span>
                    <strong style={{ color: getOutcomeColor(cardState.leadingConsensus.code) }}>
                      {cardState.leadingConsensus.label} {cardState.leadingConsensus.percentage}%
                    </strong>
                  </div>
                ) : (
                  <span className="micro-copy">Todavía sin lectura del grupo.</span>
                )
              ) : null}
              {groupBuckets.map((bucket) => {
                const isWinning = resolvedOutcome === bucket.outcome.code;

                return (
                  <article key={bucket.outcome.code} style={{ display: "grid", gap: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="split-row">
                      <strong style={{ color: isWinning ? getOutcomeColor(bucket.outcome.code) : "#EDE8D9", fontSize: "1rem" }}>
                        {getOutcomeFlag(bucket.outcome.code, effectiveMatch)} {bucket.outcome.label}
                      </strong>
                      <span className="micro-copy">{bucket.tickets.length} picks</span>
                    </div>
                    {bucket.tickets.length ? (
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
                    ) : (
                      <span className="micro-copy">Sin jugadas</span>
                    )}
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
          )}
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
