import type { EventName, ModuleKey } from "@erp/contracts";
import { prisma } from "@erp/core";

type EventHandler = (payload: unknown, organizationId: string) => Promise<void>;

const handlers = new Map<string, EventHandler>();

function handlerKey(moduleKey: ModuleKey, eventType: EventName): string {
  return `${moduleKey}:${eventType}`;
}

/**
 * Un módulo se suscribe a un evento con esto, típicamente en su archivo
 * de inicialización. Ejemplo real en Fase 2 (Ventas escuchando Inventario):
 *
 *   subscribe("sales", "StockAdjusted", async (payload, organizationId) => {
 *     // actualizar el "disponible para venta" en caché del catálogo
 *   });
 *
 * El módulo Inventario nunca importa este archivo desde `sales` ni
 * viceversa — ambos solo conocen @erp/event-bus y @erp/contracts.
 */
export function subscribe(
  moduleKey: ModuleKey,
  eventType: EventName,
  handler: EventHandler,
): void {
  handlers.set(handlerKey(moduleKey, eventType), handler);
}

const MAX_ATTEMPTS = 5;

/**
 * Procesa un lote de entregas pendientes. Se llama desde un cron job /
 * función programada (Vercel Cron, por ejemplo) — no es un listener en
 * tiempo real todavía, eso es una optimización para más adelante si el
 * volumen lo justifica, no un requisito de la Fase 0.
 */
export async function dispatchPendingEvents(batchSize = 50): Promise<{
  delivered: number;
  failed: number;
}> {
  const pending = await prisma.eventDelivery.findMany({
    where: { status: "pending", attempts: { lt: MAX_ATTEMPTS } },
    include: { eventLog: true },
    take: batchSize,
    orderBy: { eventLog: { emittedAt: "asc" } },
  });

  let delivered = 0;
  let failed = 0;

  for (const delivery of pending) {
    const key = handlerKey(
      delivery.subscriberModuleKey as ModuleKey,
      delivery.eventLog.eventType as EventName,
    );
    const handler = handlers.get(key);

    // Sin handler registrado todavía (módulo no construido aún) -> se
    // deja pending, no se marca como error. Evita perder eventos
    // emitidos por Inventario (Fase 1) antes de que Ventas (Fase 2)
    // exista para consumirlos.
    if (!handler) continue;

    try {
      await handler(delivery.eventLog.payload, delivery.eventLog.organizationId);
      await prisma.eventDelivery.update({
        where: { id: delivery.id },
        data: { status: "delivered", attempts: { increment: 1 }, lastAttemptAt: new Date() },
      });
      delivered++;
    } catch (err) {
      const attempts = delivery.attempts + 1;
      await prisma.eventDelivery.update({
        where: { id: delivery.id },
        data: {
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          lastAttemptAt: new Date(),
          lastError: err instanceof Error ? err.message : String(err),
        },
      });
      failed++;
    }
  }

  await syncEventLogStatus();
  return { delivered, failed };
}

/**
 * Un EventLog pasa a "delivered" cuando todas sus entregas terminaron.
 *
 * IMPORTANTE (misma lección documentada en prisma/rls-policies.sql): las
 * columnas quedan en camelCase, entre comillas dobles y sensibles a
 * mayúsculas ("eventLogId"), aunque la tabla esté mapeada a snake_case
 * con @@map("event_deliveries"). Un SQL crudo sin comillas (event_log_id)
 * apunta a una columna que no existe y Postgres lo rechaza — bug real
 * encontrado la primera vez que se ejecutó este código, al conectar el
 * cron del outbox.
 */
async function syncEventLogStatus(): Promise<void> {
  await prisma.$executeRaw`
    update event_log
    set status = 'delivered'
    where status = 'pending'
      and not exists (
        select 1 from event_deliveries
        where event_deliveries."eventLogId" = event_log.id
          and event_deliveries.status = 'pending'
      )
  `;
}
