import { NextResponse, type NextRequest } from "next/server";
import { dispatchPendingEvents } from "@erp/event-bus";

// Vercel Cron llama este endpoint según el schedule de vercel.json (ver
// ese archivo, junto a este). Node runtime (no Edge, que es el default de
// los Route Handlers salvo que se declare `runtime = "edge"`) porque
// dispatchPendingEvents usa Prisma con el driver adapter de `pg` — mismo
// motivo por el que middleware.ts fuerza runtime nodejs.
//
// `force-dynamic` es explícito a propósito, no porque haga falta hoy (leer
// `request.headers` ya vuelve la ruta dinámica) sino para que quede
// documentado: este endpoint NUNCA debe cachearse, sin depender de que
// alguien sepa esa regla implícita del App Router.
export const dynamic = "force-dynamic";

/**
 * Verifica el header `Authorization: Bearer <CRON_SECRET>` que Vercel Cron
 * agrega automáticamente cuando el proyecto tiene la variable de entorno
 * CRON_SECRET configurada (Vercel Project Settings → Environment
 * Variables). Sin este chequeo, cualquiera que adivine la URL podría
 * disparar el dispatcher repetidamente.
 *
 * Falla CERRADO en producción: si CRON_SECRET no está configurado y
 * NODE_ENV es "production", se rechaza la request en vez de dejarla
 * pasar sin protección. Fuera de producción (dev local), se permite sin
 * secreto para poder probar con curl sin configurar nada extra — pero
 * queda logueado para que no pase inadvertido.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[cron/dispatch-events] CRON_SECRET no está configurado en producción — request rechazada.",
      );
      return false;
    }
    console.warn(
      "[cron/dispatch-events] CRON_SECRET no configurado — permitido solo " +
        "porque NODE_ENV no es 'production' (uso local con curl/Postman).",
    );
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await dispatchPendingEvents();
  return NextResponse.json(result);
}
