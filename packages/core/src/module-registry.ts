import type { ModuleKey, ModuleStatus } from "@erp/contracts";
import { prisma } from "./prisma-client";

export interface ModuleLicense {
  moduleKey: ModuleKey;
  status: ModuleStatus;
  supportStatus: "al_dia" | "atrasado";
}

/**
 * Módulos licenciados por una organización, sin importar el estado.
 * Úsalo para armar el menú/matriz de Admin (sección 3.11 del diseño):
 * la matriz se arma dinámicamente a partir de esto, nunca mostrando
 * categorías fijas para todos los clientes.
 */
export async function getOrganizationModules(
  organizationId: string,
): Promise<ModuleLicense[]> {
  const rows = await prisma.organizationModule.findMany({
    where: { organizationId },
    select: { moduleKey: true, status: true, supportStatus: true },
  });

  return rows.map((row) => ({
    moduleKey: row.moduleKey as ModuleKey,
    status: row.status as ModuleStatus,
    supportStatus: row.supportStatus as "al_dia" | "atrasado",
  }));
}

/**
 * True si el módulo existe para la organización y no está cancelado.
 * Úsalo para decidir si una ruta/API de un módulo debe montarse o
 * responder 404 — nunca por rol de usuario únicamente (lección: un
 * usuario admin no debería poder "adivinar" la URL de un módulo que su
 * organización nunca compró).
 */
export async function isModuleLicensed(
  organizationId: string,
  moduleKey: ModuleKey,
): Promise<boolean> {
  const license = await prisma.organizationModule.findUnique({
    where: { organizationId_moduleKey: { organizationId, moduleKey } },
    select: { status: true },
  });
  return license !== null && license.status !== "cancelled";
}

/**
 * Estado efectivo de un módulo para efectos de negocio: si no está
 * licenciado, se trata igual que "cancelled" (sin distinguir de un
 * módulo cancelado explícitamente) para quien solo necesita saber
 * "¿puedo mostrar esto?".
 */
export async function getModuleStatus(
  organizationId: string,
  moduleKey: ModuleKey,
): Promise<ModuleStatus | "not_licensed"> {
  const license = await prisma.organizationModule.findUnique({
    where: { organizationId_moduleKey: { organizationId, moduleKey } },
    select: { status: true },
  });
  return license ? (license.status as ModuleStatus) : "not_licensed";
}

/**
 * Activa un módulo para una organización con su precio (sección 3.3.1:
 * precio único de venta + soporte mensual, sin "plan" separado). Usa
 * upsert a propósito: sirve tanto para la alta inicial (formulario de
 * /admin/organizations) como para reactivar más adelante un módulo que
 * la organización había cancelado, sin duplicar filas — la restricción
 * @@unique([organizationId, moduleKey]) del schema es la que lo permite.
 */
export async function activateModule(input: {
  organizationId: string;
  moduleKey: ModuleKey;
  oneTimePrice: number;
  monthlySupportPrice: number;
  billingCycleAnchor: number;
}): Promise<void> {
  await prisma.organizationModule.upsert({
    where: {
      organizationId_moduleKey: {
        organizationId: input.organizationId,
        moduleKey: input.moduleKey,
      },
    },
    update: {
      status: "active",
      oneTimePrice: input.oneTimePrice,
      monthlySupportPrice: input.monthlySupportPrice,
      supportStatus: "al_dia",
      billingCycleAnchor: input.billingCycleAnchor,
    },
    create: {
      organizationId: input.organizationId,
      moduleKey: input.moduleKey,
      status: "active",
      oneTimePrice: input.oneTimePrice,
      monthlySupportPrice: input.monthlySupportPrice,
      supportStatus: "al_dia",
      billingCycleAnchor: input.billingCycleAnchor,
    },
  });
}
