import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 500 }}>Iniciar sesión</h1>

      {error && (
        <p style={{ color: "#a32d2d", fontSize: 14 }}>
          No se pudo iniciar sesión: {error}
        </p>
      )}

      <form
        action={signIn}
        style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}
      >
        <label style={{ fontSize: 14 }}>
          Email
          <input
            name="email"
            type="email"
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 14 }}>
          Contraseña
          <input
            name="password"
            type="password"
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <button
          type="submit"
          style={{
            marginTop: 8,
            padding: "10px 16px",
            background: "var(--brand-primary, #185FA5)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>

      <p style={{ fontSize: 12, color: "#888", marginTop: 16 }}>
        Fase 0: no hay alta de cuentas todavía — el usuario se crea desde el
        dashboard de Supabase (Authentication → Users → Add user) y se
        vincula a una organización con{" "}
        <code>pnpm --filter @erp/core link-user tu@email.com</code>.
      </p>
    </main>
  );
}
