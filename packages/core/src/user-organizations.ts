import { prisma } from "./prisma-client";

/**
 * Espeja el usuario de Supabase Auth en UserProfile la primera vez que se
 * ve (id y email deben coincidir siempre con auth.users). Se llama desde
 * el flujo de login/link-user, nunca desde un módulo de negocio directo.
 */
export async function ensureUserProfile(id: string, email: string): Promise<void> {
  await prisma.userProfile.upsert({
    where: { id },
    update: { email },
    create: { id, email },
  });
}

export interface OrganizationMembership {
  organizationId: string;
  role: string;
}

export async function getUserOrganizations(
  userId: string,
): Promise<OrganizationMembership[]> {
  return prisma.userOrganization.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });
}

/**
 * Organización activa de un usuario. Fase 0: un usuario = una
 * organización (la primera membresía que tenga). Un selector real de
 * organización (para usuarios con acceso a varias) es trabajo de fases
 * posteriores, no bloquea nada del núcleo hoy.
 */
export async function getDefaultOrganizationId(userId: string): Promise<string | null> {
  const membership = await prisma.userOrganization.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}
