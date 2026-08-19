import { NextResponse, type NextRequest } from "next/server";
import { isModuleLicensed, getDefaultOrganizationId } from "@erp/core";
import { isModuleKey } from "@erp/contracts";
import { updateSession } from "./lib/supabase/middleware";

// Node.js runtime (estable desde Next.js 15.5) en vez de Edge Runtime: el
// guard de licencias usa @erp/core -> Prisma con el driver adapter de
// node-postgres (pg), que depende del módulo nativo `crypto` de Node —
// no soportado en Edge.
//
// `api/cron` queda excluido igual que `api/auth`: son rutas llamadas por
// un servicio externo (Vercel Cron) sin cookie de sesión de Supabase, no
// por un usuario navegando. Si no se excluyera, el chequeo `!user` de
// abajo redirigiría el request a /login antes de llegar al endpoint —
// el cron nunca se ejecutaría y fallaría en silencio (ver
// apps/web/app/api/cron/dispatch-events/route.ts, que tiene su propia
// autenticación vía CRON_SECRET, no sesión de usuario).
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"],
};

// Rutas de módulo -> moduleKey. Se completa a medida que cada módulo se
// construye (Fases 1-4); Admin y Sistema no pasan por este check porque
// siempre están presentes.
const ROUTE_MODULE_MAP: Record<string, string> = {
  "/inventario": "inventory",
  "/ventas": "sales",
  "/proveedores": "suppliers",
  "/contabilidad": "accounting",
};

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  // Excluir /login de la exigencia de sesión (obvio, pero además evita el
  // problema clásico de un middleware global interfiriendo con el
  // Set-Cookie de un flujo de auth — lección de My Clipper Supply).
  const { supabaseResponse, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const moduleKeyForRoute = Object.entries(ROUTE_MODULE_MAP).find(([prefix]) =>
    path.startsWith(prefix),
  )?.[1];

  if (user && moduleKeyForRoute && isModuleKey(moduleKeyForRoute)) {
    const organizationId = await getDefaultOrganizationId(user.id);
    const licensed = organizationId
      ? await isModuleLicensed(organizationId, moduleKeyForRoute)
      : false;

    if (!licensed) {
      // Un cliente que no compró este módulo no debería poder "adivinar"
      // la URL y ver que existe — 404, no un mensaje de "no autorizado".
      return NextResponse.rewrite(new URL("/404", request.url));
    }
  }

  return supabaseResponse;
}
