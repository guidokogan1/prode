import { PinForm } from "@/components/pin-form";

export default function PinPage() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", alignContent: "start", gap: 18, paddingTop: 36 }}>
      <section className="title-stack" style={{ gap: 6 }}>
        <p className="eyebrow">Acceso</p>
        <h1 className="display-title">Cambiar PIN</h1>
        <p className="muted-copy">Confirmá tu PIN actual y elegí uno nuevo.</p>
      </section>
      <PinForm />
    </main>
  );
}
