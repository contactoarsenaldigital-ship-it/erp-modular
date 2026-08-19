import type { EventName, ModuleKey } from "@erp/contracts";
import { prisma } from "@erp/core";

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Interés declarado por tipo de evento: qué módulos, EN PRINCIPIO, saben
 * reaccionar a cada evento. Esto vive acá (no en cada módulo) porque es
 * parte del contrato entre módulos, igual que los schemas de @erp/contracts.
 *
 * Que un módulo esté en esta lista no significa que reciba el evento: eso
 * además requiere que Admin haya activado la conexión específica en
 * ModuleConnection (ver sección 3.10 del diseño). Esta lista es el
 * "quién sabría escuchar"; ModuleConnection es el "quién está autorizado
 * a escuchar ahora, para esta organización".
 */
const INTERESTED_SUBSCRIBERS: Record<EventName, ModuleKey[]> = {
  StockAdjusted: ["sales", "accounting"],
  SaleConfirmed: ["inventory", "accounting"],
  PurchaseReceived: ["inventory", "accounting"],
};

export async function resolveInterestedSubscribers(
  tx: PrismaTx,
  organizationId: string,
  sourceModule: ModuleKey,
  eventType: EventName,
): Promise<ModuleKey[]> {
  const candidates = INTERESTED_SUBSCRIBERS[eventType].filter(
    (m) => m !== sourceModule,
  );
  if (candidates.length === 0) return [];

  const connections = await tx.moduleConnection.findMany({
    where: {
      organizationId,
      enabled: true,
      OR: candidates.map((subscriberModule) => ({
        OR: [
          { moduleA: sourceModule, moduleB: subscriberModule },
          { moduleA: subscriberModule, moduleB: sourceModule },
        ],
      })),
    },
    select: { moduleA: true, moduleB: true },
  });

  const connectedModules = new Set(
    connections.flatMap((c) => [c.moduleA, c.moduleB]),
  );

  return candidates.filter((m) => connectedModules.has(m));
}
