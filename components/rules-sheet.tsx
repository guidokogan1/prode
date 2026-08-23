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
                <p>Tenés <strong>$10.000</strong> por partido y van <strong>enteros a una sola opción</strong>: local, empate o visitante. No se reparte, no hay suave ni fuerte. Cuando arranca el partido se cierra la jugada y se revelan todas.</p>
                <p>De octavos en adelante son dos opciones: pasa uno o pasa el otro.</p>
              </RulesSection>

              <RulesSection title="Cómo se calcula tu cobro">
                <p>No jugás contra la casa, jugás contra el grupo. Al final del partido:</p>
                <ol style={{ display: "grid", gap: 6, paddingLeft: 20, margin: 0 }}>
                  <li>Se junta la guita de todos los que jugaron ese partido en un solo pozo.</li>
                  <li>Ese pozo se reparte <strong>solo</strong> entre los que le pegaron al resultado.</li>
                  <li>Mientras menos sean los que le pegaron, más se lleva cada uno.</li>
                </ol>
                <p style={{ marginTop: 6, fontSize: ".88rem", color: "var(--text-secondary)" }}>
                  Fórmula: <code>tu cobro = pozo total ÷ cantidad de los que acertaron</code>
                </p>
                <p style={{ marginTop: 6 }}><strong>Si nadie le pegó, nadie cobra.</strong> El pozo de ese partido no se reparte y no se devuelve: todos quedan en $0 en ese partido.</p>
              </RulesSection>

              <RulesSection title="Ejemplo concreto">
                <div className="surface-card-soft" style={{ padding: "14px 16px", display: "grid", gap: 10, background: "rgba(255,255,255,0.035)" }}>
                  <strong style={{ fontSize: ".95rem" }}>Independiente vs Independiente Rivadavia, terminó 0-0</strong>
                  <p style={{ margin: 0 }}>Jugaron 3: dos fueron a un equipo y uno al empate → pozo total <strong>$30.000</strong>.</p>
                  <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                    <li><strong>El único que puso al empate</strong> → cobra los $30.000 enteros. Ganó $20.000.</li>
                    <li><strong>Los dos que pusieron a un equipo</strong> → cobran $0.</li>
                  </ul>
                  <p style={{ margin: 0, fontSize: ".88rem", color: "var(--text-secondary)" }}>
                    Si todos van al mismo lado y ese lado gana, cada uno recupera sus $10.000 y nadie saca ventaja. El batacazo solo paga si te lo jugaste solo.
                  </p>
                </div>
              </RulesSection>

              <RulesSection title="Las dudas más comunes">
                <p><strong>"Le pegué, ¿por qué cobré tan poco?"</strong><br/>Porque le pegaron muchos. El pozo se divide entre todos los que acertaron, así que si van todos al favorito a cada uno le toca poco.</p>
                <p><strong>"¿Dónde fueron mis $10.000?"</strong><br/>Al pozo. Si le pegaste al resultado, recuperás tu parte (a veces más, a veces lo mismo que pusiste). Si no, no recuperás nada de ese partido.</p>
                <p><strong>"Puse al empate y ganó uno de los dos, ¿cobro algo?"</strong><br/>No. Cobrás solo si le pegás al resultado exacto. El empate es una opción como cualquier otra: si el partido no termina empatado, ese pick no paga nada.</p>
                <p><strong>"Nadie le pegó a ese partido, ¿nos devuelven?"</strong><br/>No. Si nadie acertó, nadie cobra y el pozo de ese partido queda sin repartir. Errar nunca paga.</p>
                <p><strong>"¿Puedo quedar negativo?"</strong><br/>No. Lo peor que te puede pasar en un partido es cobrar $0. Tu total nunca baja.</p>
              </RulesSection>

              <RulesSection title="Qué cuenta como acierto">
                <p>Un <strong>acierto</strong> es cuando la opción que elegiste es la que terminó ganando. Nada más.</p>
                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                  <li>Fuiste a un equipo y ganó ese equipo → <strong>acierto</strong>.</li>
                  <li>Fuiste al empate y empataron → <strong>acierto</strong>.</li>
                  <li>Fuiste al empate y ganó alguno de los dos → <strong>no es acierto</strong>, y no cobrás nada.</li>
                </ul>
              </RulesSection>

              <RulesSection title="Cómo se lee la tabla">
                <p><strong>Total</strong> — la plata que cobraste en todos los partidos del torneo. Ordena la tabla. Nunca baja.</p>
                <p><strong>Aciertos</strong> — en cuántos partidos elegiste la opción que ganó.</p>
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

