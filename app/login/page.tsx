import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="stack page-narrow">
      <section className="card hero-card">
        <div className="stack">
          <span className="eyebrow">Acceso rapido</span>
          <h1 className="page-title">Entrar sin mail ni clave.</h1>
          <p className="body-copy">
            Pones tu nombre, elegis un PIN corto y ya podes cargar jugadas desde cualquier
            celular, sin friccion.
          </p>
        </div>
      </section>

      <LoginForm />
    </main>
  );
}
