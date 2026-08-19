import type { ModuleKey } from "@erp/contracts";
import { MODULE_LABELS } from "@erp/contracts";
import { getOrganizationModules, getDefaultOrganizationId } from "@erp/core";
import { Card } from "@erp/ui-kit";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../../login/actions";

// Mismo patrón de "matriz de accesos agrupados por categoría" ya validado
// en producción por Arsenal Digital — la diferencia es que acá la matriz
// se arma sola según qué módulos tiene licenciados la organización, en
// vez de mostrar siempre las mismas categorías para todos los clientes.
const CATEGORY_BY_MODULE: Record<ModuleKey, string> = {
  inventory: "Operaciones",
  suppliers: "Operaciones",
  sales: "CRM / Ventas",
  accounting: "Finanzas",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  read_only: "Solo lectura (soporte atrasado)",
  cancelled: "Cancelado",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El middleware ya garantiza que si llegamos acá hay sesión — este
  // check es solo defensivo (ej. llamadas directas fuera del flujo normal).
  const organizationId = user ? await getDefaultOrganizationId(user.id) : null;
  const modules = organizationId ? await getOrganizationModules(organizationId) : [];

  const byCategory = new Map<string, typeof modules>();
  for (const mod of modules) {
    if (mod.status === "cancelled") continue; // no se muestra en el menú
    const category = CATEGORY_BY_MODULE[mod.moduleKey];
    byCategory.set(category, [...(byCategory.get(category) ?? []), mod]);
  }

  return (
    <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Panel Admin</h1>
          <p style={{ color: "#666" }}>{user?.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            style={{
              background: "none",
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      {!organizationId && (
        <Card style={{ marginTop: 24 }}>
          <p>
            Tu usuario no está vinculado a ninguna organización todavía.
            Corre <code>pnpm --filter @erp/core link-user {user?.email}</code>{" "}
            y recarga esta página.
          </p>
        </Card>
      )}

      {organizationId && byCategory.size === 0 && (
        <Card style={{ marginTop: 24 }}>
          <p>
            Esta organización no tiene módulos activos todavía. Actívalos
            desde <code>OrganizationModule</code> (Fase 0: sin UI de alta
            todavía, se hace por script/seed).
          </p>
        </Card>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        {Array.from(byCategory.entries()).map(([category, mods]) => (
          <Card key={category}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginTop: 0 }}>{category}</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {mods.map((mod) => (
                <li
                  key={mod.moduleKey}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #eee",
                    fontSize: 14,
                  }}
                >
                  <span>{MODULE_LABELS[mod.moduleKey]}</span>
                  <span style={{ color: mod.status === "active" ? "#0f6e56" : "#a32d2d" }}>
                    {STATUS_LABEL[mod.status]}
                    {mod.supportStatus === "atrasado" && mod.status !== "read_only"
                      ? " · soporte atrasado"
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </main>
  );
}
