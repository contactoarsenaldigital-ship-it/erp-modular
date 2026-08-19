import { prisma } from "./prisma-client";

export interface OrgContext {
  organizationId: string;
  userId: string;
}

/**
 * Ejecuta `fn` con las variables de sesión de Postgres que las policies de
 * RLS (ver prisma/rls-policies.sql) usan para filtrar filas. Es la manera
 * en que la segunda capa de aislamiento (RLS) se entera de qué organización
 * está pidiendo datos — sin esto, RLS bloquearía todo por defecto.
 *
 * Usar SIEMPRE esta función para envolver cualquier acceso a datos de un
 * módulo de negocio. No hacer queries de Prisma "sueltas" fuera de este
 * wrapper para tablas con organizationId.
 */
export async function withOrgContext<T>(
  ctx: OrgContext,
  fn: () => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_org_id', ${ctx.organizationId}, true)`;
    await tx.$executeRaw`select set_config('app.current_user_id', ${ctx.userId}, true)`;
    return fn();
  });
}

/**
 * Placeholder para uso fuera de Next.js (workers, jobs, futuros contextos
 * sin `next/headers`). El patrón real hoy vive en `apps/web`:
 * `lib/supabase/server.ts` resuelve el usuario autenticado, y
 * `getDefaultOrganizationId` (ver user-organizations.ts) resuelve su
 * organización — así se arma el layout, el middleware y el dashboard de
 * Admin. Esta función no se usa desde ahí porque Server Components no
 * reciben un `Request` estándar, sino las APIs de `next/headers`.
 */
export async function requireOrgContext(_request: Request): Promise<OrgContext> {
  throw new Error(
    "requireOrgContext: sin implementación de Request genérico todavía — " +
      "usar apps/web/lib/supabase/server.ts + getDefaultOrganizationId en Next.js.",
  );
}
