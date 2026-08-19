import { prisma } from "./prisma-client";

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  activeModuleCount: number;
  totalOneTimeSold: number;
  monthlySupportMrr: number;
}

/**
 * Lista de organizaciones para el panel Admin, con el mismo resumen que
 * describe la sección 3.3.1 del diseño: cuánto se le ha vendido a cada
 * cliente (oneTimePrice acumulado de sus módulos no cancelados) y cuánto
 * MRR de soporte tiene activo (monthlySupportPrice de los módulos con
 * status = active y supportStatus = al_dia). No filtra por organización
 * — es una vista de plataforma (todas las organizaciones), no la vista
 * con contexto de un tenant que usa el resto de Admin.
 */
export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { modules: true },
  });

  return orgs.map((org) => {
    const notCancelled = org.modules.filter((m) => m.status !== "cancelled");
    const totalOneTimeSold = notCancelled.reduce(
      (sum, m) => sum + Number(m.oneTimePrice),
      0,
    );
    const monthlySupportMrr = org.modules
      .filter((m) => m.status === "active" && m.supportStatus === "al_dia")
      .reduce((sum, m) => sum + Number(m.monthlySupportPrice), 0);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      activeModuleCount: notCancelled.length,
      totalOneTimeSold,
      monthlySupportMrr,
    };
  });
}

export class SlugTakenError extends Error {
  constructor(public readonly slug: string) {
    super(`Ya existe una organización con el slug "${slug}".`);
    this.name = "SlugTakenError";
  }
}

/**
 * Crea una organización nueva con branding por defecto (colores de
 * referencia del ui-kit — se personaliza después desde Admin, sección 3.4
 * del diseño). No activa ningún módulo: eso lo hace activateModule
 * (ver module-registry.ts) por separado, una vez por módulo elegido en
 * el formulario de alta.
 *
 * NOTA de seguridad pendiente (Fase 5 — endurecimiento): hoy cualquier
 * usuario autenticado que llegue a /admin/organizations puede crear una
 * organización nueva, porque todavía no existe un rol de "superadmin de
 * plataforma" separado del rol por-organización (UserOrganization.role).
 * Aceptable mientras el único acceso al sistema es el equipo de Arsenal
 * Digital (Fase 0-4), pero hay que resolverlo antes de dar de alta
 * usuarios de clientes reales con acceso a este panel.
 */
export async function createOrganization(input: {
  name: string;
  slug: string;
}): Promise<{ id: string }> {
  const existing = await prisma.organization.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (existing) {
    throw new SlugTakenError(input.slug);
  }

  const org = await prisma.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      branding: { create: {} }, // usa los defaults de OrganizationBranding en el schema
    },
    select: { id: true },
  });

  return org;
}
