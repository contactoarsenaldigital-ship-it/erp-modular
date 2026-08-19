import type { ReactNode } from "react";
import { getBranding, getDefaultOrganizationId } from "@erp/core";
import { ThemeProvider } from "@erp/ui-kit";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const DEFAULT_BRANDING = {
  logoUrl: null,
  faviconUrl: null,
  colorPrimary: "#185FA5",
  colorSecondary: "#0F6E56",
  colorAccent: "#D85A30",
  colorText: null,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Sesión real de Supabase Auth — reemplaza el DEV_ORGANIZATION_ID fijo.
  // Se resuelve acá (no solo en middleware) porque el layout también
  // envuelve /login, donde todavía no hay usuario ni organización.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organizationId = user ? await getDefaultOrganizationId(user.id) : null;
  const branding = organizationId ? await getBranding(organizationId) : DEFAULT_BRANDING;

  return (
    <html lang="es">
      <body>
        <ThemeProvider branding={branding}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
