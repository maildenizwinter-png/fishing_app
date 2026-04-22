import { supabase } from "./supabaseClient";

export async function getActiveUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const impersonateId = typeof window !== "undefined"
    ? localStorage.getItem("impersonateUserId")
    : null;

  if (impersonateId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return impersonateId;
    } else {
      localStorage.removeItem("impersonateUserId");
      localStorage.removeItem("impersonateUserName");
    }
  }

  return user.id;
}

/**
 * Gibt an wie Daten geladen werden sollen:
 * - mode "all": Admin ohne Impersonation → alle Daten zeigen (kein user_id Filter)
 * - mode "user": normaler User oder Admin mit Impersonation → nur Daten dieses Users
 */
export async function getUserFilter(): Promise<{ mode: "all" | "user"; userId: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { mode: "user", userId: null };

  const impersonateId = typeof window !== "undefined"
    ? localStorage.getItem("impersonateUserId")
    : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  if (impersonateId && isAdmin) {
    return { mode: "user", userId: impersonateId };
  }

  if (isAdmin) {
    return { mode: "all", userId: null };
  }

  return { mode: "user", userId: user.id };
}