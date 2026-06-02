import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", alignContent: "start", gap: 18, paddingTop: 36 }}>
      <section className="title-stack" style={{ gap: 6 }}>
        <p className="eyebrow">Acceso</p>
        <h1 className="display-title">Crear cuenta</h1>
        <p className="muted-copy">Elegí tu nombre y dejá tu PIN de 4 dígitos.</p>
      </section>
      <RegisterForm />
    </main>
  );
}
