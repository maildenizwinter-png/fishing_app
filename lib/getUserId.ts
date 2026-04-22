import { supabase } from "./supabaseClient";

export async function getActiveUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Wenn impersoniert und der aktuelle User ist Admin → impersonierte ID zurückgeben
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
      // Sicherheit: Nicht-Admin darf nicht impersonieren
      localStorage.removeItem("impersonateUserId");
      localStorage.removeItem("impersonateUserName");
    }
  }

  return user.id;
}