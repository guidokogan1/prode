import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", gap: 18 }}>
      <section className="surface-card-strong" style={{ padding: 20, display: "grid", gap: 8, marginTop: 8 }}>
        <p className="eyebrow">Acceso rápido</p>
        <h1 className="display-title">Nombre y PIN.</h1>
        <p className="muted-copy">Nada más. Entrás, jugás y seguís con la ronda.</p>
      </section>

      <LoginForm />
    </main>
  );
}
