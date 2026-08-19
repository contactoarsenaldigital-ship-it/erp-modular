import type { ModuleKey } from "@erp/contracts";
import { getModuleStatus } from "../module-registry";

export class ModuleNotWritableError extends Error {
  constructor(
    public readonly moduleKey: ModuleKey,
    public readonly reason: "read_only" | "cancelled" | "not_licensed",
  ) {
    super(`El módulo "${moduleKey}" no admite escrituras ahora mismo: ${reason}`);
    this.name = "ModuleNotWritableError";
  }
}

/**
 * Guard único de "solo lectura por atraso de soporte" (decisión cerrada,
 * sección 3.3.1 del diseño). CUALQUIER mutación de negocio — una venta
 * nueva, un movimiento de stock, una orden de compra, un asiento — debe
 * llamar esto ANTES de escribir. Los módulos de negocio no necesitan
 * saber nada de facturación: solo respetan lo que este guard permite.
 *
 * Uso típico en un módulo:
 *
 *   await assertWritable(organizationId, "inventory");
 *   await tx.stockMovement.create({ ... });
 *
 * Lecturas y reportes NUNCA pasan por este guard — el cliente siempre
 * puede ver sus datos y ponerse al día, atrasado o no.
 */
export async function assertWritable(
  organizationId: string,
  moduleKey: ModuleKey,
): Promise<void> {
  const status = await getModuleStatus(organizationId, moduleKey);

  if (status === "not_licensed") {
    throw new ModuleNotWritableError(moduleKey, "not_licensed");
  }
  if (status === "cancelled") {
    throw new ModuleNotWritableError(moduleKey, "cancelled");
  }
  if (status === "read_only") {
    throw new ModuleNotWritableError(moduleKey, "read_only");
  }
  // status === "active" -> ok, se permite la escritura.
}
