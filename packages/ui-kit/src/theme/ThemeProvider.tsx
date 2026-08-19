import type { Branding } from "@erp/core";
import { brandingToCssVars } from "@erp/core";
import type { CSSProperties, ReactNode } from "react";

/**
 * Inyecta el branding de la organización como variables CSS. Ningún
 * componente de este ui-kit debe tener un color hardcodeado — todos
 * leen de var(--brand-primary), var(--brand-secondary), var(--brand-accent).
 *
 * Uso en apps/web/app/layout.tsx:
 *   <ThemeProvider branding={branding}>{children}</ThemeProvider>
 */
export function ThemeProvider({
  branding,
  children,
}: {
  branding: Branding;
  children: ReactNode;
}) {
  const vars = brandingToCssVars(branding) as CSSProperties;
  return (
    <div data-theme-root style={vars}>
      {children}
    </div>
  );
}
