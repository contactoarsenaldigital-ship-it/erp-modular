import { z } from "zod";
import { MODULE_KEYS } from "./module-keys";

/**
 * Contratos de eventos entre módulos.
 *
 * Regla de oro: un módulo EMITE eventos sin saber quién los escucha, y
 * SUSCRIBE eventos sin importar código interno del módulo que los emitió.
 * Toda la forma del dato vive acá, en @erp/contracts — nunca en el módulo.
 *
 * Agregar un evento nuevo: (1) definir el schema acá, (2) agregarlo a
 * EVENT_SCHEMAS, (3) emitirlo desde el módulo dueño vía @erp/event-bus.
 */

const baseEventFields = {
  organizationId: z.string().uuid(),
  emittedAt: z.string().datetime(),
};

export const StockAdjustedEvent = z.object({
  type: z.literal("StockAdjusted"),
  ...baseEventFields,
  payload: z.object({
    productId: z.string(),
    warehouseId: z.string(),
    quantityDelta: z.number(), // positivo = entrada, negativo = salida
    reason: z.enum(["sale", "purchase_received", "manual_adjustment", "return"]),
    sourceModule: z.enum(MODULE_KEYS),
  }),
});

export const SaleConfirmedEvent = z.object({
  type: z.literal("SaleConfirmed"),
  ...baseEventFields,
  payload: z.object({
    saleId: z.string(),
    totalAmount: z.number(),
    currency: z.string().default("CLP"),
    lines: z.array(
      z.object({
        productId: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
      }),
    ),
  }),
});

export const PurchaseReceivedEvent = z.object({
  type: z.literal("PurchaseReceived"),
  ...baseEventFields,
  payload: z.object({
    purchaseOrderId: z.string(),
    supplierId: z.string(),
    lines: z.array(
      z.object({
        productId: z.string(),
        quantity: z.number(),
        unitCost: z.number(),
      }),
    ),
  }),
});

export const EVENT_SCHEMAS = {
  StockAdjusted: StockAdjustedEvent,
  SaleConfirmed: SaleConfirmedEvent,
  PurchaseReceived: PurchaseReceivedEvent,
} as const;

export type EventName = keyof typeof EVENT_SCHEMAS;

export type DomainEvent =
  | z.infer<typeof StockAdjustedEvent>
  | z.infer<typeof SaleConfirmedEvent>
  | z.infer<typeof PurchaseReceivedEvent>;
