import { prisma } from "./prisma-client";

export interface Branding {
  logoUrl: string | null;
  faviconUrl: string | null;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorText: string | null;
}

const DEFAULT_BRANDING: Branding = {
  logoUrl: null,
  faviconUrl: null,
  colorPrimary: "#185FA5",
  colorSecondary: "#0F6E56",
  colorAccent: "#D85A30",
  colorText: null,
};

export async function getBranding(organizationId: string): Promise<Branding> {
  const row = await prisma.organizationBranding.findUnique({
    where: { organizationId },
  });
  if (!row) return DEFAULT_BRANDING;
  return {
    logoUrl: row.logoUrl,
    faviconUrl: row.faviconUrl,
    colorPrimary: row.colorPrimary,
    colorSecondary: row.colorSecondary,
    colorAccent: row.colorAccent,
    colorText: row.colorText,
  };
}

/**
 * Variables CSS que el layout raíz inyecta en <html style="...">. Ningún
 * componente del ui-kit debe tener un color hardcodeado — todos leen de
 * estas variables, para no repetir el problema de patrones inconsistentes
 * entre distintos flujos que ya costó tres bugs en My Clipper Supply
 * (ahí fue con buckets de storage; acá sería con colores fijos).
 */
export function brandingToCssVars(branding: Branding): Record<string, string> {
  return {
    "--brand-primary": branding.colorPrimary,
    "--brand-secondary": branding.colorSecondary,
    "--brand-accent": branding.colorAccent,
    ...(branding.colorText ? { "--brand-text": branding.colorText } : {}),
  };
}
