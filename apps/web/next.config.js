const path = require("path");

// Next.js solo carga automáticamente el .env que está DENTRO de apps/web,
// no el de la raíz del monorepo (donde vive el .env real, según el
// README). Se carga acá, explícito, antes de que arranque el servidor —
// mismo motivo por el que packages/core/prisma.config.ts hace lo mismo
// para el CLI de Prisma.
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@erp/core", "@erp/contracts", "@erp/event-bus", "@erp/ui-kit"],
};

module.exports = nextConfig;
