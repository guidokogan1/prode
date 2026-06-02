import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="page-shell page-scroll" style={{ display: "grid", alignContent: "start", gap: 18, paddingTop: 36 }}>
      <section className="title-stack" style={{ gap: 6 }}>
        <p className="eyebrow">Acceso</p>
        <h1 className="display-title">Iniciar sesión</h1>
        <p className="muted-copy">Entrá con tu nombre y PIN.</p>
      </section>
      <LoginForm />
    </main>
  );
}
