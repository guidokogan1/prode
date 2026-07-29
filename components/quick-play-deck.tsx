"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check } from "lucide-react";
import { QualifiesVoteCard } from "@/components/qualifies-slider";
import { SessionContext } from "@/components/session-provider";
import { TeamCrest } from "@/components/team-crest";
import { VoteFace } from "@/components/vote-face";
import type { MatchOutcomeCode, MatchViewModel } from "@/lib/domain";
import { buildSinglePickAllocation, creditForMarketType } from "@/lib/game";
import { ALLOCATION_EVENT, buildAllocationScope, getStoredAllocation, saveStoredAllocation } from "@/lib/local-store";
import { getOutcomeFlag, getQuickPlayOutcomeTargets, getQuickPlaySwipeOutcome } from "@/lib/match-ui";

type QuickPlayDeckProps = {
  matches: MatchViewModel[];
  onMatchSaved?: (matchId: string) => void;
  onPendingCountChange?: (count: number) => void;
};

type CardPhase = "idle" | "saved";

export function QuickPlayDeck({ matches, onMatchSaved, onPendingCountChange }: QuickPlayDeckProps) {
  const router = useRouter();
  const session = useContext(SessionContext);
  const [justSavedIds, setJustSavedIds] = useState<Set<string>>(new Set());
  const allocationScope = buildAllocationScope(session);
  const [effectiveMatches, setEffectiveMatches] = useState(() => matches);

  useEffect(() => {
    const syncMatches = () => {
      setEffectiveMatches(applyStoredDrafts(matches, allocationScope));
    };

    syncMatches();
    window.addEventListener(ALLOCATION_EVENT, syncMatches);
    window.addEventListener("storage", syncMatches);

    return () => {
      window.removeEventListener(ALLOCATION_EVENT, syncMatches);
      window.removeEventListener("storage", syncMatches);
    };
  }, [allocationScope, matches]);

  const deck = useMemo(() => {
    const pending = effectiveMatches.filter((match) => isPendingQuickPlayMatch(match) && !justSavedIds.has(match.id));
    return pending.sort((a, b) => (a.kickoffAt ?? "").localeCompare(b.kickoffAt ?? ""));
  }, [effectiveMatches, justSavedIds]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [chosenOutcome, setChosenOutcome] = useState<MatchOutcomeCode | null>(null);
  const [savedMatchSnapshot, setSavedMatchSnapshot] = useState<MatchViewModel | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"default" | "warning" | "loading">("default");
  const [isSaving, setIsSaving] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(false);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isChoosingRef = useRef(false);
  const [qualifiesSaving, setQualifiesSaving] = useState(false);
  const [qualifiesError, setQualifiesError] = useState<string | null>(null);

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
    return () => {
      if (nextTimerRef.current) {
        clearTimeout(nextTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onPendingCountChange?.(deck.length);
  }, [deck.length, onPendingCountChange]);

  useEffect(() => {
    if (!deck.length) {
      setCurrentIndex(0);
      return;
    }

    if (currentIndex > deck.length) {
      setCurrentIndex(deck.length);
    }
  }, [currentIndex, deck.length]);

  const done = deck.length === 0 || currentIndex >= deck.length;
  const match = done ? null : deck[Math.min(currentIndex, deck.length - 1)];
  const liveMatch = effectiveMatches.find((item) => item.status === "live") ?? null;
  const quickPlayTargets = match ? getQuickPlayOutcomeTargets(match) : null;
  const projectedGroups = useMemo(
    () => buildProjectedGroups(effectiveMatches, allocationScope),
    [allocationScope, effectiveMatches],
  );
  const projectedKnockout = useMemo(
    () => buildProjectedKnockout(effectiveMatches, allocationScope),
    [allocationScope, effectiveMatches],
  );

  useEffect(() => {
    setQualifiesError(null);
    setQualifiesSaving(false);
  }, [match?.id]);

  async function confirmQualifies(homeAmount: number) {
    if (!match) {
      return;
    }
    const credit = creditForMarketType(match.marketType);
    const homeOutcome = match.allocation.find((item) => item.code === "home_qualifies") ?? match.allocation[0];
    const awayOutcome = match.allocation.find((item) => item.code === "away_qualifies") ?? match.allocation[1];
    if (!homeOutcome || !awayOutcome) {
      return;
    }
    const payload = [
      { code: homeOutcome.code, label: homeOutcome.label, amount: homeAmount },
      { code: awayOutcome.code, label: awayOutcome.label, amount: credit - homeAmount },
    ];

    setQualifiesSaving(true);
    setQualifiesError(null);
    saveStoredAllocation(allocationScope, match.id, { allocations: payload, savedAt: new Date().toISOString(), status: "draft" });

    let savedStatus: "saved_remote" | "saved_local" | "sync_error" = "saved_local";
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, allocations: payload }),
      });
      const result = (await response.json()) as { ok: boolean; reason?: string; state?: string };
      if (!response.ok || !result.ok) {
        saveStoredAllocation(allocationScope, match.id, { allocations: payload, savedAt: new Date().toISOString(), status: "sync_error" });
        setQualifiesError(result.reason ?? "No se pudo guardar la jugada.");
        setQualifiesSaving(false);
        return;
      }
      savedStatus = result.state === "saved_remote" ? "saved_remote" : "saved_local";
    } catch {
      savedStatus = "sync_error";
    }

    saveStoredAllocation(allocationScope, match.id, { allocations: payload, savedAt: new Date().toISOString(), status: savedStatus });
    setJustSavedIds((prev) => {
      const next = new Set(prev);
      next.add(match.id);
      return next;
    });
    onMatchSaved?.(match.id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(ALLOCATION_EVENT));
    }
    setQualifiesSaving(false);
    moveNext();
  }

  const resetPhase = () => {
    setPhase("idle");
    setChosenOutcome(null);
    setSavedMatchSnapshot(null);
    setSaveMessage(null);
    setSaveTone("default");
    setIsSaving(false);
    x.set(0);
    y.set(0);
    cardOpacity.set(1);
  };

  function moveNext() {
    resetPhase();
  }

  async function chooseOutcome(code: MatchOutcomeCode) {
    if (!match || phase !== "idle" || isChoosingRef.current) {
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

    const savedMatch = match;
    const payload = buildSinglePickAllocation(
      savedMatch.allocation.map((item) => item.code),
      code,
      creditForMarketType(savedMatch.marketType),
    ).map((item) => ({
      code: item.outcomeCode as MatchOutcomeCode,
      label: savedMatch.allocation.find((allocation) => allocation.code === item.outcomeCode)?.label ?? item.outcomeCode,
      amount: item.amount,
    }));

    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
    }

    await Promise.all([
      animate(x, targetX, { duration: 0.2, ease: "easeOut" }).finished,
      animate(y, targetY, { duration: 0.2, ease: "easeOut" }).finished,
      animate(cardOpacity, 0, { duration: 0.18, ease: "easeOut" }).finished,
    ]);

    saveStoredAllocation(allocationScope, savedMatch.id, {
      allocations: payload,
      savedAt: new Date().toISOString(),
      status: "draft",
    });
    setChosenOutcome(code);
    setSavedMatchSnapshot(savedMatch);
    setJustSavedIds((prev) => {
      const next = new Set(prev);
      next.add(savedMatch.id);
      return next;
    });
    onMatchSaved?.(savedMatch.id);
    setPhase("saved");
    setIsSaving(true);
    setSaveMessage("Guardando");
    setSaveTone("loading");
    x.set(0);
    y.set(0);
    cardOpacity.set(1);
    isChoosingRef.current = false;

    try {
      const [, response] = await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 760)),
        fetch("/api/tickets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId: savedMatch.id,
            allocations: payload,
          }),
        }),
      ]);

      if (!response.ok) {
        throw new Error("remote save failed");
      }

      saveStoredAllocation(allocationScope, savedMatch.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "saved_remote",
      });
      setSaveMessage("Guardado");
      setSaveTone("default");
    } catch {
      saveStoredAllocation(allocationScope, savedMatch.id, {
        allocations: payload,
        savedAt: new Date().toISOString(),
        status: "sync_error",
      });
      setSaveMessage(session?.kind === "remote" ? "Sin conexión, guardado local" : "Guardado local");
      setSaveTone("warning");
    } finally {
      setIsSaving(false);
    }

    nextTimerRef.current = setTimeout(() => {
      moveNext();
    }, 760);
  }

  const showDrawGesture = match?.allocation.some((item) => item.code === "draw");

  useEffect(() => {
    if (!isFinePointer || !match || phase !== "idle" || !quickPlayTargets) {
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
  }, [isFinePointer, match, phase, quickPlayTargets, showDrawGesture]);

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

  return (
    <div style={{ display: "grid", gap: 10, minHeight: 0 }}>
      {!done ? (() => {
        const MAX_DOTS = 8;
        const savedCount = justSavedIds.size;
        const totalMatches = deck.length + savedCount;
        const totalDots = Math.min(MAX_DOTS, totalMatches);
        const startIndex = Math.max(
          0,
          Math.min(savedCount - Math.floor((totalDots - 1) / 2), totalMatches - totalDots),
        );
        return (
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 5, minHeight: 10 }}>
            {Array.from({ length: totalDots }).map((_, slot) => {
              const matchIndex = startIndex + slot;
              const isCurrent = matchIndex === savedCount;
              const isDone = matchIndex < savedCount;
              return (
                <span
                  key={`deck-dot-${matchIndex}`}
                  style={{
                    width: isCurrent ? 16 : 5,
                    height: 5,
                    borderRadius: 999,
                    background: isDone ? "var(--gold)" : isCurrent ? "#e7efff" : "rgba(255,255,255,0.12)",
                    transition: "all 220ms ease",
                  }}
                />
              );
            })}
          </div>
        );
      })() : null}

      <div style={{ minHeight: 0, display: "grid", gap: 16, alignContent: "start" }}>
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: "grid",
              gap: 20,
              paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-bottom) + 28px)",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <h2 className="display-title">El torneo segun tus apuestas</h2>
            </div>

            {projectedGroups.length ? (
              <section style={{ display: "grid", gap: 16 }}>
                <div className="split-row" style={{ alignItems: "end" }}>
                  <p className="eyebrow">Tus grupos</p>
                  <span className="micro-copy">Según tus decisiones</span>
                </div>
                <div style={{ display: "grid", gap: 16 }}>
                  {projectedGroups.map((group) => (
                    <article key={group.label} className="surface-card-soft" style={{ padding: 16, borderRadius: 14, display: "grid", gap: 12 }}>
                      <div className="split-row" style={{ alignItems: "start" }}>
                        <strong style={{ fontFamily: "var(--font-display)", fontSize: "1rem", letterSpacing: ".01em", textTransform: "uppercase" }}>{group.label}</strong>
                        <span className="micro-copy">{group.teams.length} equipos</span>
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {group.teams.map((team, index) => (
                          <div key={`${group.label}-${team.name}`} style={{ display: "grid", gridTemplateColumns: "34px minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}>
                            <span className="micro-copy" style={{ letterSpacing: ".02em" }}>#{index + 1}</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "14px", lineHeight: 1.08, fontWeight: 600 }}>
                              <span style={{ marginRight: 8 }}>{team.flag}</span>{team.name}
                            </span>
                            <strong style={{ fontFamily: "var(--font-accent)", fontSize: "1rem", letterSpacing: "-0.02em" }}>{team.points} pts</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {projectedKnockout ? (
              <section style={{ display: "grid", gap: 16 }}>
                <div className="split-row" style={{ alignItems: "end" }}>
                  <p className="eyebrow">{projectedKnockout.title}</p>
                  <span className="micro-copy">{projectedKnockout.subtitle}</span>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {projectedKnockout.rows.map((row) => (
                    <article key={row.id} className="surface-card-soft" style={{ padding: 14, borderRadius: 12, display: "grid", gap: 5 }}>
                      <strong style={{ fontSize: ".98rem" }}>{row.label}</strong>
                      {row.hint ? <span className="micro-copy">{row.hint}</span> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

          </motion.div>
        ) : (() => {
          const activeMatch = match!;

          if (activeMatch.marketType === "qualifies") {
            return (
              <QualifiesVoteCard
                match={activeMatch}
                credit={creditForMarketType(activeMatch.marketType)}
                onPick={(homeAmount) => void confirmQualifies(homeAmount)}
                topRightLabel={activeMatch.kickoffLabel}
                saving={qualifiesSaving}
                errorMessage={qualifiesError}
              />
            );
          }

          const activeQuickPlayTargets = quickPlayTargets!;

          return (
          <>
            <div style={{ position: "relative" }}>
              {phase === "idle" && currentIndex < deck.length - 1 ? (
                <>
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 14,
                      right: 14,
                      top: 10,
                      bottom: -2,
                      borderRadius: 16,
                      background: "linear-gradient(180deg, rgba(19,26,36,0.92) 0%, rgba(10,14,20,0.92) 100%)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      opacity: 0.34,
                    }}
                  />
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 24,
                      right: 24,
                      top: 18,
                      bottom: -6,
                      borderRadius: 16,
                      background: "linear-gradient(180deg, rgba(19,26,36,0.92) 0%, rgba(10,14,20,0.92) 100%)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      opacity: 0.16,
                    }}
                  />
                </>
              ) : null}

              <AnimatePresence mode="wait">
                {phase === "idle" ? (
                  <motion.div
                    key={`idle-${activeMatch.id}`}
                    drag="x"
                    dragMomentum={false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.14}
                    onDragEnd={async (_, info) => {
                      if (!match || !quickPlayTargets) {
                        return;
                      }

                      const outcome = getQuickPlaySwipeOutcome(activeMatch, info.offset.x, 0);
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
                      minHeight: 246,
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
                        background: "linear-gradient(135deg, rgba(63,227,242,0.55) 0%, transparent 55%)",
                      }}
                    >
                      <div style={{ position: "absolute", left: 20, top: "46%", transform: "translateY(-50%)", display: "grid", gap: 6, justifyItems: "center" }}>
                          <TeamCrest url={activeMatch.home.logo} alt={activeMatch.home.name} size={44} />
                        <span style={{ color: "var(--gold)", fontFamily: "var(--font-body)", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em" }}>
                          {"gana"}
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      style={{
                        opacity: awayOpacity,
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: "linear-gradient(225deg, rgba(244,166,60,0.55) 0%, transparent 55%)",
                      }}
                    >
                      <div style={{ position: "absolute", right: 20, top: "46%", transform: "translateY(-50%)", display: "grid", gap: 6, justifyItems: "center" }}>
                          <TeamCrest url={activeMatch.away.logo} alt={activeMatch.away.name} size={44} />
                        <span style={{ color: "var(--live)", fontFamily: "var(--font-body)", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em" }}>
                          {"gana"}
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
                        <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", display: "grid", gap: 6, justifyItems: "center" }}>
                          <span style={{ fontSize: "2.2rem", lineHeight: 1 }}>🤝</span>
                          <span style={{ color: "var(--outcome-draw)", fontFamily: "var(--font-body)", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em" }}>
                            empate
                          </span>
                        </div>
                      </motion.div>
                    ) : null}

                    <VoteFace
                      match={activeMatch}
                      showDrawGesture={Boolean(showDrawGesture)}
                      outcomeTargets={activeQuickPlayTargets}
                      onSelectOutcome={(code) => {
                        void chooseOutcome(code);
                      }}
                    />
                  </motion.div>
                ) : null}

                {phase === "saved" && chosenOutcome && savedMatchSnapshot ? (
                  <motion.div
                    key={`saved-${savedMatchSnapshot.id}-${chosenOutcome}`}
                    initial={{ scale: 0.96, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: -24 }}
                    transition={{ type: "spring", stiffness: 250, damping: 24 }}
                    className="surface-card"
                    style={{
                      minHeight: 292,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      padding: 20,
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
                        animate={{ scale: 1, rotate: 0, boxShadow: isSaving ? "0 0 0 12px rgba(63,227,242,0.08)" : "0 0 0 0 rgba(63,227,242,0)" }}
                        transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.08 }}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(63,227,242,0.18)",
                          border: "2px solid #3FE3F2",
                        }}
                      >
                        <Check size={28} style={{ color: "#3FE3F2" }} />
                      </motion.div>
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ display: "grid", gap: 6 }}>
                        <p className="section-title">Guardado</p>
                        <p className="muted-copy">
                          {getOutcomeFlag(chosenOutcome, savedMatchSnapshot)} {savedMatchSnapshot.allocation.find((item) => item.code === chosenOutcome)?.label}
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
                    onClick={() => void chooseOutcome(activeQuickPlayTargets.left)}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      border: "1.5px solid rgba(63,227,242,0.35)",
                      background: "rgba(63,227,242,0.12)",
                      boxShadow: "0 4px 20px rgba(63,227,242,0.18)",
                      display: "grid",
                      placeItems: "center",
                      color: "#3FE3F2",
                    }}
                  >
                    <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                      <TeamCrest url={activeMatch.home.logo} alt={activeMatch.home.name} size={22} />
                      <span style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontSize: ".5rem", fontStyle: "normal", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>{activeMatch.home.name.slice(0, 3)}</span>
                    </div>
                  </motion.button>
                  {showDrawGesture ? (
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => {
                        if (activeQuickPlayTargets.draw) {
                          void chooseOutcome(activeQuickPlayTargets.draw);
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
                    onClick={() => void chooseOutcome(activeQuickPlayTargets.right)}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      border: "1.5px solid rgba(244,166,60,0.35)",
                      background: "rgba(244,166,60,0.12)",
                      boxShadow: "0 4px 20px rgba(244,166,60,0.18)",
                      display: "grid",
                      placeItems: "center",
                      color: "#F4A63C",
                    }}
                  >
                    <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
                      <TeamCrest url={activeMatch.away.logo} alt={activeMatch.away.name} size={22} />
                      <span style={{ fontFamily: "var(--font-barlow), system-ui, sans-serif", fontSize: ".5rem", fontStyle: "normal", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>{activeMatch.away.name.slice(0, 3)}</span>
                    </div>
                  </motion.button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {isFinePointer && phase === "idle" ? (
              <p
                className="micro-copy"
                style={{
                  textAlign: "center",
                  marginTop: 6,
                  color: "var(--text-tertiary)",
                  letterSpacing: ".06em",
                }}
              >
                Atajos: <kbd>←</kbd>{showDrawGesture ? <> <kbd>↑</kbd></> : null} <kbd>→</kbd>
              </p>
            ) : null}
          </>
          );
        })()}
      </div>

      <AnimatePresence initial={false}>
        {phase === "idle" && !done && !liveMatch ? (
          <motion.div
            key="home-shortcuts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{ display: "grid", gap: 8 }}
          >
            <button className="button-secondary" onClick={() => router.push("/matches")} style={{ justifyContent: "space-between", width: "100%", minHeight: 40 }}>
              <span>Ir al fixture completo</span>
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

      {done && typeof document !== "undefined"
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: "calc(var(--bottom-nav-height) + var(--safe-bottom) + 12px)",
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 40,
                paddingInline: 16,
              }}
            >
              <button
                className="button-primary"
                onClick={() => router.push("/matches")}
                style={{
                  width: "100%",
                  maxWidth: "calc(var(--shell-width) - 32px)",
                  pointerEvents: "auto",
                  boxShadow: "0 0 0 1px rgba(63,227,242,0.42), 0 0 28px rgba(63,227,242,0.34), 0 14px 34px rgba(0,0,0,0.34)",
                }}
              >
                Edita tus partidos
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function applyStoredDrafts(matches: MatchViewModel[], allocationScope: string) {
  if (typeof window === "undefined") {
    return matches;
  }

  return matches.map((match) => {
    if (match.draftState === "saved_remote") {
      return match;
    }

    const storedDraft = getStoredAllocation(allocationScope, match.id);
    if (!storedDraft?.allocations?.length) {
      return match;
    }

    const amountByLabel = new Map(storedDraft.allocations.map((item) => [item.label, item.amount]));
    return {
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
    };
  });
}

function isPendingQuickPlayMatch(match: MatchViewModel) {
  if (!match.isEditable) {
    return false;
  }

  if (match.draftState === "draft" || match.draftState === "sync_error") {
    return true;
  }

  return match.userStateLabel === "Te falta jugar";
}

function getLeadingPickedOutcome(match: MatchViewModel, allocationScope?: string) {
  const leadingServerOutcome = [...match.allocation].sort((left, right) => right.amount - left.amount)[0] ?? null;
  if (leadingServerOutcome && leadingServerOutcome.amount > 0) {
    return leadingServerOutcome;
  }

  if (!allocationScope || typeof window === "undefined") {
    return leadingServerOutcome;
  }

  const storedDraft = getStoredAllocation(allocationScope, match.id);
  if (!storedDraft?.allocations?.length) {
    return leadingServerOutcome;
  }

  const amountByLabel = new Map(storedDraft.allocations.map((item) => [item.label, item.amount]));
  return (
    match.allocation
      .map((item) => ({
        ...item,
        amount: amountByLabel.get(item.label) ?? item.amount,
      }))
      .sort((left, right) => right.amount - left.amount)[0] ?? leadingServerOutcome
  );
}

function buildProjectedGroups(matches: MatchViewModel[], allocationScope: string) {
  const groupMatches = matches.filter((match) => match.groupLabel);
  const groups = new Map<string, Map<string, { name: string; flag: string; points: number; wins: number }>>();

  for (const match of groupMatches) {
    const groupLabel = match.groupLabel!;
    if (!groups.has(groupLabel)) {
      groups.set(groupLabel, new Map());
    }

    const table = groups.get(groupLabel)!;
    for (const team of [match.home, match.away]) {
      if (!table.has(team.name)) {
        table.set(team.name, { ...team, points: 0, wins: 0 });
      }
    }

    const leading = getLeadingPickedOutcome(match, allocationScope);
    if (!leading || leading.amount <= 0) {
      continue;
    }

    if (leading.code === "draw") {
      table.get(match.home.name)!.points += 1;
      table.get(match.away.name)!.points += 1;
      continue;
    }

    const winner = leading.code === "home" ? match.home.name : match.away.name;
    table.get(winner)!.points += 3;
    table.get(winner)!.wins += 1;
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([label, teams]) => ({
      label,
      teams: Array.from(teams.values()).sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return a.name.localeCompare(b.name, "es");
      }),
    }));
}

function buildProjectedKnockout(matches: MatchViewModel[], allocationScope: string) {
  const stageOrder = [
    { stage: "Dieciseisavos", next: "Octavos de final" },
    { stage: "Octavos de final", next: "Cuartos de final" },
    { stage: "Cuartos de final", next: "Semifinales" },
    { stage: "Semifinales", next: "Final" },
    { stage: "Final", next: "Campeón" },
  ];

  const completeStage = [...stageOrder]
    .reverse()
    .find(({ stage }) => {
      const stageMatches = matches.filter((match) => match.stage === stage);
      return stageMatches.length > 0 && stageMatches.every((match) => {
        const leading = getLeadingPickedOutcome(match, allocationScope);
        return Boolean(leading && leading.amount > 0);
      });
    });

  if (!completeStage) {
    return null;
  }

  const winners = matches
    .filter((match) => match.stage === completeStage.stage)
    .map((match) => {
      const leading = getLeadingPickedOutcome(match, allocationScope);
      if (!leading) return null;
      if (leading.code === "home" || leading.code === "home_qualifies") return match.home;
      if (leading.code === "away" || leading.code === "away_qualifies") return match.away;
      return null;
    })
    .filter((team): team is MatchViewModel["home"] => Boolean(team));

  if (!winners.length) {
    return null;
  }

  if (completeStage.next === "Campeón") {
    const champion = winners[0];
    return {
      title: "Tu campeón",
      subtitle: "Si se da tu final",
      rows: [
        {
          id: "champion",
          label: `${champion.flag} ${champion.name}`,
          hint: "Así terminaría tu torneo ideal.",
        },
      ],
    };
  }

  const rows = [];
  for (let index = 0; index < winners.length; index += 2) {
    const left = winners[index];
    const right = winners[index + 1];
    rows.push({
      id: `${completeStage.stage}-${index}`,
      label: right ? `${left.flag} ${left.name} vs ${right.flag} ${right.name}` : `${left.flag} ${left.name}`,
      hint: right ? `Así quedaría ${completeStage.next.toLowerCase()} según tus picks.` : "Avanza según tu cuadro.",
    });
  }

  return {
    title: completeStage.next,
    subtitle: `Si se da ${completeStage.stage.toLowerCase()}`,
    rows,
  };
}
