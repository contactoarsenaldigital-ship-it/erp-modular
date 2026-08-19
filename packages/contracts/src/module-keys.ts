/**
 * Módulos de negocio soportados por la plataforma.
 *
 * Esta es la ÚNICA lista de módulos válidos. Todo lo demás (rutas, menús,
 * OrganizationModule.moduleKey, guards) se deriva de acá — nunca se
 * hardcodea el nombre de un módulo en otro lugar del código.
 *
 * RR.HH. y Proyectos (SAIL) quedaron fuera del roadmap (fases 0-5) por
 * decisión de negocio, pero se listan comentados para que quede explícito
 * dónde se agregarían si se retoman más adelante.
 */
export const MODULE_KEYS = [
  "inventory",
  "sales",
  "suppliers",
  "accounting",
  // "hr",        // futuro — RR.HH. / liquidaciones
  // "projects",  // futuro — Proyectos / metodología SAIL
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

/**
 * Etiqueta legible por módulo, para cualquier UI (dashboard de Admin,
 * alta de organización, etc.). Único lugar donde se define el nombre
 * visible de un módulo — nunca repetir el mapeo en cada página.
 */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  inventory: "Inventario",
  sales: "Ventas",
  suppliers: "Proveedores",
  accounting: "Contabilidad",
};

/** Estado de licencia de un módulo para una organización. */
export const MODULE_STATUS = ["active", "read_only", "cancelled"] as const;
export type ModuleStatus = (typeof MODULE_STATUS)[number];

/** Estado de pago del soporte mensual de un módulo. */
export const SUPPORT_STATUS = ["al_dia", "atrasado"] as const;
export type SupportStatus = (typeof SUPPORT_STATUS)[number];
