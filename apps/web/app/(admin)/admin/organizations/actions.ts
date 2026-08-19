"use server";

import { redirect } from "next/navigation";
import { MODULE_KEYS, type ModuleKey } from "@erp/contracts";
import { activateModule, createOrganization, SlugTakenError } from "@erp/core";

/**
 * Alta de organización + activación de módulos con precio, en un solo
 * envío de formulario (ver /admin/organizations/page.tsx). Mismo patrón
 * de Server Action + redirect con query param que ya usa
 * app/login/actions.ts — sin cliente de estado (useActionState), acorde
 * a que el resto de Admin en Fase 0 no usa componentes de cliente.
 */
export async function createOrganizationAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();

  if (!name || !slug) {
    redirect(
      `/admin/organizations?error=${encodeURIComponent("Nombre y slug son obligatorios.")}`,
    );
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    redirect(
      `/admin/organizations?error=${encodeURIComponent(
        "El slug solo puede tener minúsculas, números y guiones.",
      )}`,
    );
  }

  let organizationId: string;
  try {
    const org = await createOrganization({ name, slug });
    organizationId = org.id;
  } catch (err) {
    if (err instanceof SlugTakenError) {
      redirect(`/admin/organizations?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  // Un módulo por checkbox marcado en el formulario — el que no viene
  // marcado simplemente no se activa (la organización queda igual de
  // válida con 1 solo módulo de negocio + Admin, mínimo viable descrito
  // en la sección 1 del diseño).
  for (const moduleKey of MODULE_KEYS as readonly ModuleKey[]) {
    if (!formData.get(`module_${moduleKey}_active`)) continue;

    await activateModule({
      organizationId,
      moduleKey,
      oneTimePrice: Number(formData.get(`module_${moduleKey}_oneTimePrice`) ?? 0),
      monthlySupportPrice: Number(
        formData.get(`module_${moduleKey}_monthlySupportPrice`) ?? 0,
      ),
      billingCycleAnchor: Number(
        formData.get(`module_${moduleKey}_billingCycleAnchor`) ?? 5,
      ),
    });
  }

  redirect(`/admin/organizations?created=${encodeURIComponent(slug)}`);
}
