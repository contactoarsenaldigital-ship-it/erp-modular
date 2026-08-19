import type { ModuleKey } from "@erp/contracts";
import { MODULE_KEYS, MODULE_LABELS } from "@erp/contracts";
import { listOrganizations } from "@erp/core";
import { Card } from "@erp/ui-kit";
import { createOrganizationAction } from "./actions";

// Valores de referencia para prellenar el formulario — el equipo de
// Arsenal Digital los ajusta caso a caso en el kickoff con cada cliente
// (ver checklist, sección 7 del diseño). No son un "plan": cada módulo
// se vende y se cobra por separado (sección 3.3.1), este es solo un
// punto de partida editable antes de enviar el formulario.
const DEFAULT_PRICING: Record<ModuleKey, { oneTimePrice: number; monthlySupportPrice: number }> = {
  inventory: { oneTimePrice: 800000, monthlySupportPrice: 45000 },
  sales: { oneTimePrice: 900000, monthlySupportPrice: 55000 },
  suppliers: { oneTimePrice: 500000, monthlySupportPrice: 30000 },
  accounting: { oneTimePrice: 600000, monthlySupportPrice: 35000 },
};

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
  const organizations = await listOrganizations();

  return (
    <main style={{ padding: 32, maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500 }}>Organizaciones</h1>
      <p style={{ color: "#666" }}>
        Alta de clientes nuevos y activación de módulos con precio (sección
        3.3.1 del diseño). Reemplaza el uso manual de{" "}
        <code>packages/core/prisma/seed.ts</code> para clientes reales.
      </p>

      {created && (
        <Card style={{ marginTop: 16, borderColor: "#0f6e56" }}>
          <p style={{ color: "#0f6e56", margin: 0, fontSize: 14 }}>
            Organización &quot;{created}&quot; creada. Vincula al primer usuario con{" "}
            <code>
              pnpm --filter @erp/core link-user &lt;email&gt; {created}
            </code>
            .
          </p>
        </Card>
      )}
      {error && (
        <Card style={{ marginTop: 16, borderColor: "#a32d2d" }}>
          <p style={{ color: "#a32d2d", margin: 0, fontSize: 14 }}>{error}</p>
        </Card>
      )}

      <Card style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginTop: 0 }}>Clientes actuales</h2>
        {organizations.length === 0 ? (
          <p style={{ color: "#666", fontSize: 14 }}>Todavía no hay organizaciones.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "6px 0", fontWeight: 500 }}>Organización</th>
                <th style={{ fontWeight: 500 }}>Módulos activos</th>
                <th style={{ fontWeight: 500 }}>Vendido (venta)</th>
                <th style={{ fontWeight: 500 }}>MRR soporte</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                  <td style={{ padding: "6px 0" }}>
                    {org.name} <span style={{ color: "#999" }}>({org.slug})</span>
                  </td>
                  <td>{org.activeModuleCount}</td>
                  <td>{currency.format(org.totalOneTimeSold)}</td>
                  <td>{currency.format(org.monthlySupportMrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginTop: 0 }}>Nueva organización</h2>
        <form
          action={createOrganizationAction}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 14, flex: 1 }}>
              Nombre
              <input
                name="name"
                required
                style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
            <label style={{ fontSize: 14, flex: 1 }}>
              Slug (minúsculas, sin espacios)
              <input
                name="slug"
                required
                pattern="[a-z0-9-]+"
                placeholder="ej. mi-clipper-supply"
                style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
          </div>

          <div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Módulos a activar</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {MODULE_KEYS.map((moduleKey) => (
                <div
                  key={moduleKey}
                  style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}
                >
                  <label
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <input type="checkbox" name={`module_${moduleKey}_active`} />
                    {MODULE_LABELS[moduleKey]}
                  </label>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <label style={{ fontSize: 13, flex: 1 }}>
                      Precio de venta (CLP)
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        name={`module_${moduleKey}_oneTimePrice`}
                        defaultValue={DEFAULT_PRICING[moduleKey].oneTimePrice}
                        style={{ display: "block", width: "100%", padding: 6, marginTop: 4 }}
                      />
                    </label>
                    <label style={{ fontSize: 13, flex: 1 }}>
                      Soporte mensual (CLP)
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        name={`module_${moduleKey}_monthlySupportPrice`}
                        defaultValue={DEFAULT_PRICING[moduleKey].monthlySupportPrice}
                        style={{ display: "block", width: "100%", padding: 6, marginTop: 4 }}
                      />
                    </label>
                    <label style={{ fontSize: 13, width: 120 }}>
                      Día de cobro
                      <input
                        type="number"
                        min="1"
                        max="28"
                        name={`module_${moduleKey}_billingCycleAnchor`}
                        defaultValue={5}
                        style={{ display: "block", width: "100%", padding: 6, marginTop: 4 }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            style={{
              alignSelf: "flex-start",
              padding: "10px 16px",
              background: "var(--brand-primary, #185FA5)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Crear organización
          </button>
        </form>
      </Card>
    </main>
  );
}
