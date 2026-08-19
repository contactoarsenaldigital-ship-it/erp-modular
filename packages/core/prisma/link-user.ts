import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Este script se corre directo con `tsx prisma/link-user.ts` (no pasa por
// el CLI de Prisma), así que a diferencia de `db push`/`migrate`/`db seed`
// nunca hereda el dotenv.config() de prisma.config.ts. Se carga acá mismo
// el .env de la raíz del monorepo, igual que hace next.config.js para
// apps/web.
//
// IMPORTANTE — lección real de esta sesión: los imports estáticos de un
// módulo ES se resuelven SIEMPRE antes que el resto del código de ese
// archivo, sin importar la línea donde estén escritos. Un
// `import { prisma } from "../src/prisma-client"` puesto arriba dispararía
// la construcción del adapter de Postgres (que lee `process.env.DATABASE_URL`)
// ANTES de que dotenv.config() de abajo llegue a ejecutarse — el resultado
// fue exactamente este error ("client password must be a string"): pg
// intentando autenticar con una contraseña undefined porque DATABASE_URL
// todavía no existía. Por eso `@supabase/supabase-js` y `../src/prisma-client`
// se cargan con `import()` dinámico DESPUÉS de dotenv.config(), no con
// import estático. Cualquier script nuevo que se corra directo con `tsx`
// (ej. el futuro runner del cron de `dispatchPendingEvents`) debe seguir
// este mismo patrón.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Uso: pnpm --filter @erp/core link-user <email> [org-slug] [role]
// Vincula un usuario que YA existe en Supabase Auth (creado desde el
// dashboard: Authentication → Users → Add user) a una organización.
// No crea el usuario de Auth — eso lo hace Supabase, esto solo conecta
// las dos mitades (auth.users <-> organización) que hoy no se conectan
// solas porque todavía no hay UI de invitaciones (fuera del alcance de
// la Fase 0).

const email = process.argv[2];
const orgSlug = process.argv[3] ?? "demo";
const role = process.argv[4] ?? "owner";

if (!email) {
  console.error("Uso: pnpm --filter @erp/core link-user <email> [org-slug] [role]");
  process.exit(1);
}

async function main() {
  // Import dinámico (no estático) y DESPUÉS de dotenv.config() — ver la
  // nota de arriba. Un import estático de "../src/prisma-client" al
  // principio del archivo se resolvería antes que dotenv.config(), sin
  // importar en qué línea esté escrito.
  const { createClient } = await import("@supabase/supabase-js");
  const { prisma } = await import("../src/prisma-client");

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Fase 0: alcanza con listar y filtrar por email (bases de usuarios
    // chicas). Con más usuarios, cambiar por una búsqueda paginada real.
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const authUser = data.users.find((u) => u.email === email);
    if (!authUser) {
      throw new Error(
        `No existe un usuario con email ${email} en Supabase Auth. ` +
          `Créalo primero: dashboard de Supabase → Authentication → Users → Add user.`,
      );
    }

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) {
      throw new Error(`No existe una organización con slug "${orgSlug}". Corre el seed primero.`);
    }

    await prisma.userProfile.upsert({
      where: { id: authUser.id },
      update: { email: authUser.email ?? email },
      create: { id: authUser.id, email: authUser.email ?? email },
    });

    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: authUser.id, organizationId: org.id } },
      update: { role },
      create: { userId: authUser.id, organizationId: org.id, role },
    });

    console.log(`Listo: ${email} vinculado a "${org.name}" (${orgSlug}) con rol ${role}.`);
  } finally {
    // prisma solo existe en este scope (import dinámico dentro de main) —
    // por eso el disconnect también vive acá adentro, no en un
    // .finally() encadenado afuera de main().
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
