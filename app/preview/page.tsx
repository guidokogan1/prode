import Link from "next/link";

export default function PreviewIndexPage() {
  const links = [
    { href: "/preview/partidos", title: "Partidos", desc: "Fixtures y resultados en vivo del Clausura" },
    { href: "/preview/cruces", title: "Cruces", desc: "Zonas A/B y bracket de playoffs" },
  ];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>
      <p className="eyebrow">Preview · sin base de datos · datos de ESPN</p>
      <h1 style={{ fontFamily: "var(--font-accent)", fontSize: "2rem", margin: "4px 0 20px" }}>Torneo Clausura 2026</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ display: "block", padding: "16px 18px", background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: 14 }}
          >
            <div style={{ fontFamily: "var(--font-accent)", fontSize: "1.1rem" }}>{link.title}</div>
            <div className="muted-copy" style={{ fontSize: ".85rem" }}>{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
