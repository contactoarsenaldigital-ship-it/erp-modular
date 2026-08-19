import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Resuelto contra la ubicación de este archivo (no contra el cwd desde
// donde se invoque `prisma`), para que funcione igual si se corre con
// `pnpm --filter @erp/core prisma ...` (cwd = packages/core) o directo
// desde la raíz del monorepo. El .env vive en la raíz del monorepo.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 movió acá la config de seed (antes vivía en package.json
    // bajo "prisma": { "seed": ... }, que ya no se usa).
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // El CLI (prisma db push / migrate) necesita conexión directa, no el
    // pooler de transacciones — usa DIRECT_URL (Session pooler, 5432),
    // no DATABASE_URL. El runtime de la app sigue usando DATABASE_URL,
    // configurado en src/prisma-client.ts vía driver adapter.
    url: env("DIRECT_URL"),
  },
});
