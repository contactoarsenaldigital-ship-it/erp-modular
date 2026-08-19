import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components y Server Actions. Lee/escribe
 * la sesión desde las cookies de la request actual — nunca guarda el
 * usuario en una variable global (cada request resuelve la suya).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Se puede llamar desde un Server Component puro, que no tiene
            // permiso de escritura de cookies — se ignora a propósito
            // porque el middleware (lib/supabase/middleware.ts) ya se
            // encarga de refrescar la sesión en cada request.
          }
        },
      },
    },
  );
}
