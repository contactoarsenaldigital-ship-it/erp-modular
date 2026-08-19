import { prisma } from "../src/prisma-client";

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Organización Demo",
      slug: "demo",
    },
  });

  // Ejemplo: cliente que compró Inventario + Ventas (con Ventas↔Inventario
  // conectado), y Proveedores con soporte atrasado (solo lectura) para
  // poder probar el guard con datos reales.
  await prisma.organizationModule.createMany({
    data: [
      {
        organizationId: org.id,
        moduleKey: "inventory",
        status: "active",
        oneTimePrice: 800000,
        monthlySupportPrice: 45000,
        supportStatus: "al_dia",
        billingCycleAnchor: 5,
      },
      {
        organizationId: org.id,
        moduleKey: "sales",
        status: "active",
        oneTimePrice: 900000,
        monthlySupportPrice: 55000,
        supportStatus: "al_dia",
        billingCycleAnchor: 5,
      },
      {
        organizationId: org.id,
        moduleKey: "suppliers",
        status: "read_only",
        oneTimePrice: 500000,
        monthlySupportPrice: 30000,
        supportStatus: "atrasado",
        billingCycleAnchor: 5,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.moduleConnection.upsert({
    where: {
      organizationId_moduleA_moduleB: {
        organizationId: org.id,
        moduleA: "sales",
        moduleB: "inventory",
      },
    },
    update: { enabled: true },
    create: {
      organizationId: org.id,
      moduleA: "sales",
      moduleB: "inventory",
      enabled: true,
    },
  });

  await prisma.organizationBranding.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      colorPrimary: "#185FA5",
      colorSecondary: "#0F6E56",
      colorAccent: "#D85A30",
    },
  });

  console.log(`Seed listo. Organización "${org.name}" (slug: ${org.slug}, id: ${org.id}).`);
  console.log(
    `Para entrar: crea un usuario en Supabase (Authentication → Users → Add user), ` +
      `después corre: pnpm --filter @erp/core link-user <email> ${org.slug}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
