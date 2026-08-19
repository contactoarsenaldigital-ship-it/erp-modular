-- Row-Level Security del núcleo.
--
-- Se aplica vía psql directo, no desde el dashboard de Supabase. Correr
-- después de cada `prisma db push` / `prisma migrate deploy` que agregue
-- una tabla nueva con organizationId.
--
-- Notas de esta versión (corregidas contra el schema real):
-- 1. Las columnas quedaron en camelCase (default de Prisma sin @map por
--    campo) aunque las tablas están en snake_case (por @@map). Por eso
--    los nombres de columna van entre comillas dobles ("organizationId").
-- 2. Los ids son String en el schema (uuid() como default, pero el tipo
--    de columna real es "text", no el tipo nativo "uuid" de Postgres) —
--    por eso NO se castea current_setting(...) a ::uuid, se compara como
--    texto directo.

alter table organizations enable row level security;
alter table organization_modules enable row level security;
alter table module_connections enable row level security;
alter table organization_branding enable row level security;
alter table event_log enable row level security;
alter table event_deliveries enable row level security;
alter table user_organizations enable row level security;
alter table module_permissions enable row level security;

create policy org_isolation_select on organizations
  for select
  using (
    id in (
      select "organizationId" from user_organizations
      where "userId" = current_setting('app.current_user_id', true)
    )
  );

create policy tenant_isolation on organization_modules
  for all
  using ("organizationId" = current_setting('app.current_org_id', true));

create policy tenant_isolation on module_connections
  for all
  using ("organizationId" = current_setting('app.current_org_id', true));

create policy tenant_isolation on organization_branding
  for all
  using ("organizationId" = current_setting('app.current_org_id', true));

create policy tenant_isolation on event_log
  for all
  using ("organizationId" = current_setting('app.current_org_id', true));

create policy tenant_isolation on event_deliveries
  for all
  using (
    "eventLogId" in (
      select id from event_log
      where "organizationId" = current_setting('app.current_org_id', true)
    )
  );

create policy tenant_isolation on user_organizations
  for all
  using ("organizationId" = current_setting('app.current_org_id', true));

create policy tenant_isolation on module_permissions
  for all
  using (
    "userOrganizationId" in (
      select id from user_organizations
      where "organizationId" = current_setting('app.current_org_id', true)
    )
  );

-- Checklist al agregar una tabla nueva en Fases 1-4:
--   1. ¿Tiene organizationId propio, o llega a través de su padre?
--   2. alter table ... enable row level security;
--   3. create policy tenant_isolation on ... con las columnas entre
--      comillas dobles si están en camelCase, sin cast a ::uuid (son text).
--   4. Revisar el onDelete real de cada relación antes de escribir
--      cualquier script de borrado/reset contra esta tabla.
