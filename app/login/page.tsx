import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="stack page-narrow">
      <section className="card compact-summary">
        <p className="eyebrow">Acceso rápido</p>
        <h1 className="page-title">Nombre y PIN.</h1>
        <span className="subtle">Nada más.</span>
      </section>

      <LoginForm />
    </main>
  );
}
