"use client";

import { useEffect, useRef } from "react";
import type { BracketData, BracketSlot } from "@/lib/espn-bracket";
import { TeamCrest } from "@/components/team-crest";

const DATE_FORMAT = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const formatKickoff = (iso: string) => DATE_FORMAT.format(new Date(iso)).replace(/\./g, "");
const positionClass = (rank: number) => (rank <= 8 ? "q" : "o");

function Slot({ slot }: { slot: BracketSlot }) {
  return (
    <div className={`s ${slot.resolved ? "team" : "pend"}`}>
      {slot.resolved && slot.logo ? <TeamCrest url={slot.logo} alt={slot.text} size={20} /> : <span className="av empty" />}
      <span className="nm">{slot.text}</span>
    </div>
  );
}

export function BracketView({ data }: { data: BracketData }) {
  const stages = ["Grupos", ...data.rounds.map((round) => round.label)];
  const vpRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!vpRef.current || !stripRef.current || !trackRef.current || !lensRef.current || !labelsRef.current || !svgRef.current) return;
    const vp = vpRef.current;
    const strip = stripRef.current;
    const track = trackRef.current;
    const lens = lensRef.current;
    const labels = labelsRef.current;
    const svg = svgRef.current;

    const NP = stages.length - 1;
    const lastRound = data.rounds.length - 1;
    const gap = 10;
    const CARD_H = 82;
    const VGAP = 16;
    const UNIT = CARD_H + VGAP;
    const TOP_PAD = 10;

    let pair = 0;
    let x = 0;
    let vx = 0;
    let target = 0;
    let raf: number | null = null;
    let colW = 0;
    let step = 0;
    let slot = 0;

    const cl = (i: number) => TOP_PAD + i * UNIT + CARD_H / 2;
    const colLeft = (i: number) => i * step;
    const colAt = (ci: number) => strip.children[ci + 1] as HTMLElement | undefined;
    const knockCols = () => [...strip.querySelectorAll<HTMLElement>(".col.knock")];
    const cardsOf = (col: Element) => [...col.querySelectorAll<HTMLElement>(".mc")];

    function layoutCols() {
      for (const col of knockCols()) {
        const ri = Number(col.dataset.ri);
        cardsOf(col).forEach((card, k) => {
          card.style.height = `${CARD_H}px`;
          const yy = ri === lastRound && card.dataset.third === "1" ? cl(0) + 3 * UNIT : cl(k);
          card.style.top = `${yy - CARD_H / 2}px`;
          card.dataset.cy = String(yy);
        });
      }
    }
    function bottomOf(ci: number) {
      const col = colAt(ci);
      if (!col) return 0;
      if (col.classList.contains("grp")) return col.scrollHeight;
      let mx = 0;
      for (const c of cardsOf(col)) mx = Math.max(mx, parseFloat(c.dataset.cy || "0") + CARD_H / 2);
      return mx;
    }
    function drawConn(p: number, h: number) {
      svg.setAttribute("width", String(stages.length * step));
      svg.setAttribute("height", String(h));
      let d = "";
      const lc = colAt(p);
      const rc = colAt(p + 1);
      if (lc && rc && lc.classList.contains("knock") && rc.classList.contains("knock")) {
        const lcards = cardsOf(lc);
        const rcards = cardsOf(rc);
        const leftRight = colLeft(p) + colW - 7;
        const rightLeft = colLeft(p + 1) + 7;
        const midX = (leftRight + rightLeft) / 2;
        rcards.forEach((card, k) => {
          if (card.dataset.third === "1") return;
          const a = lcards[2 * k];
          const b = lcards[2 * k + 1];
          if (!a || !b) return;
          const fa = parseFloat(a.dataset.cy || "0");
          const fb = parseFloat(b.dataset.cy || "0");
          const pc = parseFloat(card.dataset.cy || "0");
          d += `M${leftRight} ${fa}H${midX}M${leftRight} ${fb}H${midX}M${midX} ${fa}V${fb}M${midX} ${pc}H${rightLeft}`;
        });
      }
      svg.innerHTML = `<path d="${d}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>`;
    }
    function relayout(p: number) {
      layoutCols();
      const rc = colAt(p + 1);
      const lcCol = colAt(p);
      if (rc && rc.classList.contains("knock") && lcCol && lcCol.classList.contains("knock")) {
        const ri = Number(rc.dataset.ri);
        cardsOf(rc).forEach((card, k) => {
          const yy =
            ri === lastRound && card.dataset.third === "1"
              ? cl(0) + 3 * UNIT
              : ri === lastRound
                ? (cl(0) + cl(1)) / 2
                : (cl(2 * k) + cl(2 * k + 1)) / 2;
          card.style.top = `${yy - CARD_H / 2}px`;
          card.dataset.cy = String(yy);
        });
      }
      const h = Math.max(bottomOf(p), bottomOf(p + 1)) + 40;
      strip.style.height = `${h}px`;
      for (const c of strip.querySelectorAll<HTMLElement>(".col")) c.style.height = `${h}px`;
      svg.style.opacity = "0";
      drawConn(p, h);
      requestAnimationFrame(() => {
        svg.style.opacity = "1";
      });
      vp.scrollTop = 0;
    }
    const clampPair = (p: number) => Math.max(0, Math.min(NP - 1, p));
    function render() {
      strip.style.transform = `translate3d(${x}px,0,0)`;
      const frac = step ? -x / step : 0;
      lens.style.transform = `translate3d(${frac * slot}px,0,0)`;
    }
    function updateLabels() {
      [...labels.children].forEach((l, i) => l.classList.toggle("on", i === pair || i === pair + 1));
      for (const g of track.querySelectorAll<HTMLElement>(".glyph")) {
        const i = Number(g.dataset.i);
        g.classList.toggle("on", i === pair || i === pair + 1);
      }
    }
    const STIFF = 300;
    const DAMP = 34;
    function tick() {
      const dt = 1 / 60;
      const f = -STIFF * (x - target) - DAMP * vx;
      vx += f * dt;
      x += vx * dt;
      render();
      if (Math.abs(x - target) < 0.3 && Math.abs(vx) < 0.3) {
        x = target;
        vx = 0;
        render();
        raf = null;
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    function start() {
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function setPair(p: number, vel?: number) {
      pair = clampPair(p);
      relayout(pair);
      target = -pair * step;
      if (vel !== undefined) vx = vel;
      start();
      updateLabels();
    }
    function setX(nx: number) {
      const min = -(NP - 1) * step;
      if (nx > 0) nx *= 0.4;
      else if (nx < min) nx = min + (nx - min) * 0.4;
      x = nx;
      render();
    }
    function snap(vel: number) {
      const proj = x + vel * 0.12;
      setPair(clampPair(Math.round(-proj / step)), vel);
    }
    function measure() {
      colW = Math.floor((vp.clientWidth - gap) / 2);
      step = colW + gap;
      slot = track.clientWidth / stages.length;
      strip.style.width = `${stages.length * step}px`;
      lens.style.width = `${slot * 2}px`;
      strip.querySelectorAll<HTMLElement>(".col").forEach((c, i) => {
        c.style.left = `${colLeft(i)}px`;
        c.style.width = `${colW}px`;
      });
      relayout(pair);
      target = -pair * step;
      x = target;
      render();
      updateLabels();
    }

    type Drag = { x0: number; px: number; py: number; h: boolean | null; lastX: number; lastT: number; v: number; fromLens: boolean; moved: boolean };
    let ds: Drag | null = null;
    function dragStart(e: PointerEvent, fromLens: boolean) {
      ds = { x0: x, px: e.clientX, py: e.clientY, h: fromLens ? true : null, lastX: e.clientX, lastT: performance.now(), v: 0, fromLens, moved: false };
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }
    function dragMove(e: PointerEvent) {
      if (!ds) return;
      const dx = e.clientX - ds.px;
      const dy = e.clientY - ds.py;
      if (ds.h === null) {
        if (Math.abs(dx) > 7 || Math.abs(dy) > 7) {
          ds.h = Math.abs(dx) > Math.abs(dy);
          if (ds.h) {
            try {
              vp.setPointerCapture(e.pointerId);
            } catch {}
          }
        }
      }
      if (!ds.h) return;
      e.preventDefault();
      if (Math.abs(dx) > 4) ds.moved = true;
      setX(ds.x0 + (ds.fromLens ? -(dx / slot) * step : dx));
      const now = performance.now();
      const dt = now - ds.lastT;
      if (dt > 0) {
        const inst = ((e.clientX - ds.lastX) / dt) * 1000;
        ds.v = ds.v * 0.6 + inst * 0.4;
      }
      ds.lastX = e.clientX;
      ds.lastT = now;
    }
    function dragEnd() {
      if (!ds) return;
      const wasH = ds.h;
      const v = ds.fromLens ? -ds.v : ds.v;
      const moved = ds.moved;
      ds = null;
      if (wasH && moved) snap(v);
      else if (wasH) start();
    }

    const onGlyph = (e: Event) => setPair(Number((e.currentTarget as HTMLElement).dataset.i));
    const glyphs = [...track.querySelectorAll<HTMLElement>(".glyph")];
    glyphs.forEach((g) => g.addEventListener("click", onGlyph));

    const onVpDown = (e: PointerEvent) => dragStart(e, false);
    vp.addEventListener("pointerdown", onVpDown);
    vp.addEventListener("pointermove", dragMove);
    vp.addEventListener("pointerup", dragEnd);
    vp.addEventListener("pointercancel", dragEnd);

    const onLensDown = (e: PointerEvent) => {
      e.stopPropagation();
      try {
        lens.setPointerCapture(e.pointerId);
      } catch {}
      dragStart(e, true);
    };
    const onLensMove = (e: PointerEvent) => {
      if (ds && ds.fromLens) dragMove(e);
    };
    const onLensUp = (e: PointerEvent) => {
      const tap = ds && !ds.moved;
      const t = (e.target as HTMLElement).classList;
      if (tap && t.contains("chev")) {
        setPair(t.contains("l") ? pair - 1 : pair + 1);
        ds = null;
        return;
      }
      dragEnd();
    };
    lens.addEventListener("pointerdown", onLensDown);
    lens.addEventListener("pointermove", onLensMove);
    lens.addEventListener("pointerup", onLensUp);
    lens.addEventListener("pointercancel", dragEnd);

    window.addEventListener("resize", measure);
    measure();
    const readyId = requestAnimationFrame(() => strip.classList.add("ready"));

    return () => {
      if (raf) cancelAnimationFrame(raf);
      cancelAnimationFrame(readyId);
      strip.classList.remove("ready");
      window.removeEventListener("resize", measure);
      glyphs.forEach((g) => g.removeEventListener("click", onGlyph));
      vp.removeEventListener("pointerdown", onVpDown);
      vp.removeEventListener("pointermove", dragMove);
      vp.removeEventListener("pointerup", dragEnd);
      vp.removeEventListener("pointercancel", dragEnd);
      lens.removeEventListener("pointerdown", onLensDown);
      lens.removeEventListener("pointermove", onLensMove);
      lens.removeEventListener("pointerup", onLensUp);
      lens.removeEventListener("pointercancel", dragEnd);
    };
  }, [data, stages]);

  return (
    <>
      <div className="sel">
        <div className="sel-labels" ref={labelsRef}>
          {stages.map((stageLabel) => (
            <span key={stageLabel}>{stageLabel}</span>
          ))}
        </div>
        <div className="sel-track" ref={trackRef}>
          <div className="lens" ref={lensRef}>
            <span className="chev l">‹</span>
            <span className="chev r">›</span>
          </div>
          {stages.map((stageLabel, i) => (
            <div className="glyph" data-i={i} key={stageLabel}>
              {i === stages.length - 1 ? (
                <div className="trophy">🏆</div>
              ) : (
                <div className="bars">
                  {Array.from({ length: stages.length - 1 - i }).map((_, b) => (
                    <i key={b} style={{ width: `${15 - b * 1.4}px` }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="vp" ref={vpRef}>
        <div className="strip" ref={stripRef}>
          <svg className="svg-conn" ref={svgRef} />
          <div className="col grp" data-ri={-1}>
            {data.groups.map((group) => (
              <div className="gt" key={group.label}>
                <div className="gt-h">
                  <b>{group.label}</b>
                  <s className={group.complete ? "" : "live"}>{group.complete ? "cerrado" : "en curso"}</s>
                </div>
                <table>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr className={positionClass(row.rank)} key={row.rank}>
                        <td className="n">{row.rank}</td>
                        <td className="fl"><TeamCrest url={row.logo} alt={row.name} size={18} /></td>
                        <td className="t">
                          {row.name}
                          {row.advanced ? <span className="adv" /> : null}
                        </td>
                        <td>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                        <td className="p">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {data.rounds.map((round, ri) => (
            <div className="col knock" data-ri={ri} key={round.key}>
              {round.matches.map((match, k) => (
                <div className={`mc ${match.fullyResolved ? "set" : ""}`} data-third={match.third ? 1 : 0} key={k}>
                  <div className="mc-h">
                    <span className="mc-d">{formatKickoff(match.date)}</span>
                    {match.title ? <span className="mc-t">{match.title}</span> : null}
                  </div>
                  <Slot slot={match.home} />
                  <Slot slot={match.away} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
