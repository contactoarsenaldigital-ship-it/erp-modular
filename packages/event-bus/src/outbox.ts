import type { EventName, ModuleKey } from "@erp/contracts";
import { EVENT_SCHEMAS } from "@erp/contracts";
import { prisma } from "@erp/core";
import { resolveInterestedSubscribers } from "./subscriptions";

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Publica un evento como parte del patrón outbox.
 *
 * CRÍTICO: debe llamarse dentro de la MISMA transacción de Prisma que el
 * cambio de negocio que lo origina (ej. crear el StockMovement y publicar
 * StockAdjusted en la misma `tx`). Si el commit de negocio falla, el
 * evento nunca se escribe — así una venta nunca "cree" que descontó
 * stock si en realidad no se guardó nada.
 *
 * No entrega el evento de inmediato: solo dos inserts (EventLog +
 * EventDelivery por cada módulo suscrito). La entrega real la hace el
 * dispatcher por separado (ver dispatcher.ts), con reintentos.
 */
export async function publishEvent<T extends EventName>(
  tx: PrismaTx,
  organizationId: string,
  sourceModule: ModuleKey,
  eventType: T,
  payload: Record<string, unknown>,
): Promise<void> {
  const schema = EVENT_SCHEMAS[eventType];
  const parsed = schema.parse({
    type: eventType,
    organizationId,
    emittedAt: new Date().toISOString(),
    payload,
  });

  const subscribers = await resolveInterestedSubscribers(
    tx,
    organizationId,
    sourceModule,
    eventType,
  );

  const eventLog = await tx.eventLog.create({
    data: {
      organizationId,
      eventType,
      payload: parsed.payload as object,
      status: subscribers.length > 0 ? "pending" : "delivered",
    },
  });

  if (subscribers.length === 0) return;

  await tx.eventDelivery.createMany({
    data: subscribers.map((subscriberModuleKey) => ({
      eventLogId: eventLog.id,
      subscriberModuleKey,
      status: "pending" as const,
    })),
  });
}
