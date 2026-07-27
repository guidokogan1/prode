"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { HelpCircle, X } from "lucide-react";

export function RulesHelpButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver reglas del prode"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}
      >
        <HelpCircle size={18} />
      </button>

      {mounted ? createPortal(<SheetOverlay open={open} onClose={() => setOpen(false)} />, document.body) : null}
    </>
  );
}

function SheetOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "rgba(4, 7, 11, 0.72)",
              backdropFilter: "blur(6px)",
            }}
          >
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Reglas del prode"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                height: "100%",
                width: "min(440px, 100%)",
                background: "var(--bg-elevated, #0f151d)",
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                overflowY: "auto",
                padding: "20px 22px calc(var(--bottom-nav-height, 0px) + var(--safe-bottom, 0px) + 32px)",
                display: "grid",
                gap: 24,
                alignContent: "start",
              }}
            >
              <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h2 className="display-title" style={{ fontSize: "1.4rem" }}>Reglas</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              </header>

              <RulesSection title="La idea en una línea">
                <p>Cada partido apostás <strong>$10.000</strong>. Si le pegás al resultado, cobrás parte del pozo del grupo. Si errás, no cobrás nada de ese partido. Gana el que más acumula al final del torneo.</p>
              </RulesSection>

              <RulesSection title="Cómo apostás">
                <p>Tenés <strong>$10.000</strong> por partido. Elegís un lado (local, empate o visitante) y qué tan fuerte le creés. Cuando arranca el partido se cierra la apuesta y se revelan todas.</p>
                <PresetBlock
                  label="Si te la jugás por un equipo"
                  caption="tu pick · empate · el otro equipo"
                  rows={[
                    ["Suave", "$5.000 · $3.000 · $2.000"],
                    ["Media", "$7.000 · $3.000 · $0"],
                    ["Fuerte", "$9.000 · $1.000 · $0"],
                  ]}
                />
                <PresetBlock
                  label="Si te jugás por el empate"
                  caption="empate · un equipo · el otro"
                  rows={[
                    ["Suave", "$4.000 · $3.000 · $3.000"],
                    ["Media", "$6.000 · $2.000 · $2.000"],
                    ["Fuerte", "$8.000 · $1.000 · $1.000"],
                  ]}
                />
                <PresetBlock
                  label="Octavos en adelante (solo pasa o no pasa)"
                  caption="tu pick · el otro"
                  rows={[
                    ["Suave", "$6.000 · $4.000"],
                    ["Media", "$8.000 · $2.000"],
                    ["Fuerte", "$10.000 · $0"],
                  ]}
                />
              </RulesSection>

              <RulesSection title="Cómo se calcula tu cobro">
                <p>No jugás contra la casa, jugás contra el grupo. Al final del partido:</p>
                <ol style={{ display: "grid", gap: 6, paddingLeft: 20, margin: 0 }}>
                  <li>Se junta toda la guita de todos en un solo pozo (somos 9 → <strong>$90.000</strong> de pozo).</li>
                  <li>Ese pozo se reparte <strong>solo</strong> entre los que pusieron algo al resultado ganador.</li>
                  <li>Cuanto más concentraste vos en el ganador <em>comparado con el resto</em>, más cobrás.</li>
                </ol>
                <p style={{ marginTop: 6, fontSize: ".88rem", color: "var(--text-secondary)" }}>
                  Fórmula: <code>tu cobro = pozo total × (lo que pusiste al ganador ÷ pozo del ganador)</code>
                </p>
              </RulesSection>

              <RulesSection title="Ejemplo concreto">
                <div className="surface-card-soft" style={{ padding: "14px 16px", display: "grid", gap: 10, background: "rgba(255,255,255,0.035)" }}>
                  <strong style={{ fontSize: ".95rem" }}>Argentina vs Japón, gana Argentina</strong>
                  <p style={{ margin: 0 }}>9 jugadores apostaron $10.000 cada uno → pozo total <strong>$90.000</strong>. Al ganador Argentina le fueron <strong>$44.000</strong> en total.</p>
                  <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                    <li><strong>Vos pusiste $9.000 fuerte a Argentina</strong> → cobrás $90.000 × ($9.000 ÷ $44.000) = <strong>~$18.400</strong>. Ganaste $8.400.</li>
                    <li><strong>Pusiste $5.000 suave a Argentina</strong> → cobrás ~$10.200. Casi empate, ganaste apenas.</li>
                    <li><strong>Pusiste $7.000 al empate</strong> → cobrás $0. Te erraste con tu apuesta principal.</li>
                  </ul>
                  <p style={{ margin: 0, fontSize: ".88rem", color: "var(--text-secondary)" }}>
                    Si todos van fuerte al mismo lado, ese lado paga poco (se reparte entre muchos). Si te animaste a un batacazo y pegaste, te llevás una banda.
                  </p>
                </div>
              </RulesSection>

              <RulesSection title="Las dudas más comunes">
                <p><strong>"Le pegué, ¿por qué cobré tan poco?"</strong><br/>Porque el ganador concentró mucho pozo (todos pusieron al favorito). Cuando muchos aciertan, el pozo se divide entre muchos y a cada uno le toca menos.</p>
                <p><strong>"¿Dónde fueron mis $10.000?"</strong><br/>Al pozo. Toda la guita que pusiste va al pozo del partido. Si pegaste al ganador, recuperás parte (a veces más, a veces menos de lo que pusiste). Si no, no recuperás nada de ese partido.</p>
                <p><strong>"Pegué suave y cobré, ¿soy un genio?"</strong><br/>Cobraste pero le erraste con tu apuesta principal. En el ranking eso no cuenta como acierto.</p>
                <p><strong>"¿Puedo quedar negativo?"</strong><br/>No. Lo peor que te puede pasar en un partido es cobrar $0. Tu total nunca baja.</p>
              </RulesSection>

              <RulesSection title="Qué cuenta como acierto">
                <p>Un <strong>acierto</strong> es cuando tu apuesta principal (la del monto más alto) coincide con el resultado ganador.</p>
                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                  <li>Pusiste fuerte/media/suave a un lado y ganó ese lado → <strong>acierto</strong>.</li>
                  <li>Pusiste fuerte al empate y ganó un equipo → <strong>no es acierto</strong>, aunque hayas cobrado algo por los pesitos que le dejaste al equipo que ganó.</li>
                </ul>
              </RulesSection>

              <RulesSection title="Cómo se lee la tabla">
                <p><strong>Total</strong> — la plata que cobraste en todos los partidos del torneo. Ordena la tabla. Nunca baja.</p>
                <p><strong>Aciertos</strong> — cuántos partidos leíste bien con tu apuesta principal.</p>
                <p><strong>Mejor</strong> — el cobro más grande que pegaste en un solo partido.</p>
              </RulesSection>

              <RulesSection title="Apuesta al campeón">
                <p>Antes del partido inaugural elegís quién pensás que sale campeón. Cada uno pone <strong>$10.000</strong>, que arman un pozo aparte. Cuando termina el torneo, ese pozo se reparte entre los que acertaron — mientras menos sean, más se llevan.</p>
                <p>Lo que cobres al campeón <strong>se suma a tu total</strong> de la misma tabla del ranking. Es un partido extra que se juega al principio y se cobra al final.</p>
              </RulesSection>

              <RulesSection title="Si empatamos en el ranking">
                <p>Si dos quedan con el mismo total al final, se desempata así:</p>
                <ol style={{ display: "grid", gap: 6, paddingLeft: 20, margin: 0 }}>
                  <li>Quien tenga más aciertos</li>
                  <li>Quien haya tenido el mejor cobro individual</li>
                  <li>Quien le pegó al campeón del torneo</li>
                  <li>Si todo lo anterior empata, empate compartido</li>
                </ol>
              </RulesSection>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
  );
}

function RulesSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 10 }}>
      <h3 className="eyebrow" style={{ letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>{title}</h3>
      <div style={{ display: "grid", gap: 10, color: "var(--text-primary)", fontSize: ".95rem", lineHeight: 1.5 }}>
        {children}
      </div>
    </section>
  );
}

function PresetBlock({ label, caption, rows }: { label: string; caption: string; rows: [string, string][] }) {
  return (
    <div className="surface-card-soft" style={{ padding: "12px 14px", display: "grid", gap: 8, background: "rgba(255,255,255,0.035)" }}>
      <div style={{ display: "grid", gap: 2 }}>
        <strong style={{ fontSize: ".92rem" }}>{label}</strong>
        <span className="micro-copy" style={{ color: "var(--text-secondary)" }}>{caption}</span>
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: ".9rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>{k}</span>
            <span style={{ fontFamily: "var(--font-accent)", letterSpacing: "-0.02em" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
