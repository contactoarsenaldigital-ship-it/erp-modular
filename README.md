# ERP modular — Fase 0 (fundaciones)

Scaffolding de la Fase 0 del plan de trabajo (ver `ERP_Modular_Diseno_Propuesta_PlanDeTrabajo.md`
en la carpeta del proyecto). Construye el núcleo: tenancy, licenciamiento de
módulos con precios, matriz de conexión, branding, bus de eventos con
patrón outbox, y el guard único de solo lectura por atraso de soporte.

**No incluye todavía ningún módulo de negocio** (Inventario, Ventas,
Proveedores, Contabilidad) — eso son las fases 1 a 4.

## Estructura

```
apps/web/          # Next.js — única app desplegada
packages/contracts/  # Tipos + esquemas de eventos (sin lógica)
packages/core/         # Auth, tenancy, RLS, licencias, branding, guard
packages/event-bus/      # Outbox: publishEvent + dispatcher + subscribe
packages/ui-kit/           # Componentes themeados por variables CSS
```

## Setup

```bash
pnpm install
cp .env.example .env       # completar DATABASE_URL / DIRECT_URL / Supabase
pnpm db:push                # sincroniza el schema (Session pooler, puerto 5432)
psql -h <host> -p 5432 -U postgres.<project-ref> -d postgres -f packages/core/prisma/rls-policies.sql
pnpm db:generate
pnpm --filter @erp/core prisma db seed
```

> **Nota Prisma 7:** las URLs de conexión ya no van en `schema.prisma` — viven
> en `packages/core/prisma.config.ts` (`DIRECT_URL` para el CLI) y en
> `packages/core/src/prisma-client.ts` (`DATABASE_URL`, vía driver adapter
> `@prisma/adapter-pg`, obligatorio desde esta versión). No hay que tocar
> ninguno de los dos para el uso normal — solo importa si cambian las
> variables de entorno.

### Auth real (Supabase Auth)

No hay alta de cuentas todavía (eso es trabajo de una fase posterior, con
invitaciones). Para entrar como usuario de prueba:

1. En el dashboard de Supabase: **Authentication → Users → Add user**, crea
   un usuario con email/contraseña.
2. Vincúlalo a la organización del seed:
   ```bash
   pnpm --filter @erp/core link-user tu@email.com
   ```
3. `pnpm dev` y entra por `http://localhost:3000/login`. El middleware
   redirige cualquier ruta sin sesión a `/login`, y `/login` a `/admin` si
   ya hay sesión.

El `organizationId` activo ya no es una variable de entorno fija — se
resuelve en cada request a partir del usuario autenticado (ver
`packages/core/src/user-organizations.ts` y `apps/web/middleware.ts`).

## Decisiones ya cerradas que este scaffolding refleja

- **Modelo comercial:** `OrganizationModule.oneTimePrice` (venta) +
  `monthlySupportPrice` (soporte mensual, recurrente por módulo).
- **Atraso de soporte → solo lectura**, nunca bloqueo total ni borrado.
  Aplicado por un único guard: `packages/core/src/guards/writable-guard.ts`.
- **Bus de eventos con outbox completo desde el día uno** — persistencia
  y reintentos en Postgres (`EventLog` + `EventDelivery`), no un emisor
  en memoria. Ver `packages/event-bus/src/outbox.ts` y `dispatcher.ts`.
- **RLS activado desde el día uno**, mismo enfoque `psql` ya usado en
  producción por Arsenal Digital. Ver `packages/core/prisma/rls-policies.sql`.
- **Auth real (Supabase Auth) desde el día uno** — no se repite el atajo
  de cookie firmada casera de los dos proyectos anteriores. Pendiente de
  conectar (ver TODOs en `tenancy.ts`, `layout.tsx`, `middleware.ts`).

## Pendiente para cerrar la Fase 0

- [x] Conectar Supabase Auth real — login/logout vía Server Actions
      (`apps/web/app/login/`), sesión resuelta en middleware y layout
      (`getDefaultOrganizationId`), sin alta de cuentas todavía (eso es
      trabajo de una fase posterior con invitaciones).
- [x] UI de alta de organización + activación de módulos con precio
      (`apps/web/app/(admin)/admin/organizations/`) — reemplaza el uso
      manual de `prisma/seed.ts` para clientes reales. El vínculo de
      usuario a organización sigue siendo por `link-user` (sin UI de
      invitaciones todavía, fuera de alcance de la Fase 0).
- [x] Cron/función programada que llame `dispatchPendingEvents()`
      periódicamente — `apps/web/app/api/cron/dispatch-events/route.ts`
      + `apps/web/vercel.json`. Protegido con `CRON_SECRET` (ver
      `.env.example`); falla cerrado si falta esa variable en producción.
      **Nota:** el schedule (`*/10 * * * *`) asume que el plan de Vercel
      del proyecto permite crons cada 10 minutos — revisar el límite de
      frecuencia del plan contratado antes de desplegar y ajustar si
      hace falta.
- [ ] UI de conexión entre módulos (`ModuleConnection`) — tiene más
      sentido construirla en Fase 2, cuando haya dos módulos reales que
      conectar (ver nota en `app/(admin)/admin/settings/page.tsx`).
- [ ] Pipeline de CI/CD que corra `prisma migrate deploy` automáticamente
      después de cada push a `main` — responde directo a la lección más
      repetida en el proyecto de Arsenal Digital ("el build de Vercel
      quedó bien pero la base no se sincronizó"). El workflow YA existe
      (`.github/workflows/deploy.yml`) pero queda sin marcar hasta
      confirmar que corrió una vez con éxito: necesita los secrets
      `DATABASE_URL` y `DIRECT_URL` configurados en GitHub (Settings →
      Secrets and variables → Actions) — sin eso, el job falla en
      silencio la primera vez que alguien haga push a `main`.

## Convención de storage (a definir en Fase 1)

Documentar acá, en un único lugar, qué bucket de Supabase Storage
corresponde a qué tipo de archivo apenas se cree el primer endpoint de
subida (Fase 1, catálogo de Inventario) — este bug apareció **tres
veces** en My Clipper Supply por no tener esta convención escrita desde
el principio. No reinventar el patrón en cada flujo de carga.
