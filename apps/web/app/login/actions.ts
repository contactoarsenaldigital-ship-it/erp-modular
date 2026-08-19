"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@erp/core";

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "No se pudo iniciar sesión")}`);
  }

  // Espeja el usuario en UserProfile la primera vez que entra — así
  // link-user (o una UI de invitaciones más adelante) siempre encuentra
  // una fila para vincular a una organización.
  await ensureUserProfile(data.user.id, data.user.email ?? email);

  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
