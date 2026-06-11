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

              <RulesSection title="Cómo se juega">
                <p>En cada partido tenés <strong>10.000 créditos</strong> para repartir entre los resultados posibles. Podés ir equilibrado, con sesgo, o jugarte todo a un solo lado. Vos elegís cuánto le creés a tu corazonada.</p>
                <p>Podés editar tu jugada hasta que arranca el partido. Cuando suena el pitazo inicial, se cierra y todos ven las jugadas de todos.</p>
              </RulesSection>

              <RulesSection title="Qué tan fuerte la jugás">
                <p>Tres niveles de confianza para repartir tus 10.000. Mientras más concentrás, más ganás si acertás, pero menos red de seguridad tenés si fallás.</p>
                <PresetBlock
                  label="Si te jugás por un equipo (gana local o gana visitante)"
                  caption="tu pick · empate · el otro equipo"
                  rows={[
                    ["Suave", "5.000 · 3.000 · 2.000"],
                    ["Media", "7.000 · 3.000 · 0"],
                    ["Fuerte", "9.000 · 1.000 · 0"],
                  ]}
                />
                <PresetBlock
                  label="Si te jugás por el empate"
                  caption="empate · un equipo · el otro"
                  rows={[
                    ["Suave", "4.000 · 3.000 · 3.000"],
                    ["Media", "6.000 · 2.000 · 2.000"],
                    ["Fuerte", "8.000 · 1.000 · 1.000"],
                  ]}
                />
                <PresetBlock
                  label="Cuando hay solo dos resultados (octavos en adelante)"
                  caption="tu pick · el otro"
                  rows={[
                    ["Suave", "6.000 · 4.000"],
                    ["Media", "8.000 · 2.000"],
                    ["Fuerte", "10.000 · 0"],
                  ]}
                />
              </RulesSection>

              <RulesSection title="Cómo se reparte la plata">
                <p>No jugás contra la casa, jugás contra el resto del grupo. Al final del partido se junta toda la plata que pusieron todos en un solo pozo, y se reparte entre los que le pegaron al resultado correcto.</p>
                <p style={{ marginTop: 4 }}>Mientras más fuerte le hayas ido a ese resultado <em>comparado con el resto</em>, más te llevás.</p>

                <div className="surface-card-soft" style={{ padding: "14px 16px", display: "grid", gap: 10, background: "rgba(255,255,255,0.035)", marginTop: 6 }}>
                  <strong style={{ fontSize: ".95rem" }}>Ejemplo</strong>
                  <p style={{ margin: 0 }}>
                    Argentina vs Japón. <strong>Mariano</strong>, <strong>Jairo</strong> y <strong>Esteban</strong> le fueron a Argentina con distinta intensidad. <strong>Bato</strong> arriesgó al empate y <strong>Sofi</strong> se la jugó por Japón.
                  </p>
                  <p style={{ margin: 0 }}>
                    Gana Argentina. Bato y Sofi pierden lo que pusieron al lado equivocado. La plata de todos se reparte entre Mariano, Jairo y Esteban — y el que más concentró en Argentina se lleva la tajada más grande.
                  </p>
                </div>
              </RulesSection>

              <RulesSection title="Si empatamos en el ranking">
                <p>Al final del Mundial, si dos quedan con la misma ganancia acumulada, se desempata así, en orden:</p>
                <ol style={{ display: "grid", gap: 6, paddingLeft: 20, margin: 0 }}>
                  <li>Quien tenga más partidos ganados</li>
                  <li>Quien haya tenido la mejor jugada individual</li>
                  <li>Quien le pegó al campeón del Mundial</li>
                  <li>Si todo lo anterior empata, empate compartido</li>
                </ol>
                <p style={{ marginTop: 4, fontSize: ".88rem", color: "var(--text-secondary)" }}>
                  Ejemplo: si <strong>Guido</strong> y <strong>Chino</strong> terminan iguales en plata pero Chino le acertó al campeón, gana Chino.
                </p>
              </RulesSection>

              <RulesSection title="Apuesta al campeón">
                <p>Antes del partido inaugural elegís quién pensás que sale campeón. Cada uno pone <strong>5.000 créditos</strong> en este mercado, que arman un pozo aparte solo para esta apuesta. Cuando termina el Mundial, ese pozo se reparte entre los que le pegaron — mientras menos sean, más se llevan.</p>
                <p>Lo que ganás (o perdés) acá <strong>suma a tu ganancia acumulada en la misma tabla</strong> del ranking general. No es un torneo aparte: es un partido extra que se juega al principio y se cobra al final.</p>
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
