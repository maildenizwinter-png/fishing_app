// Gemeinsame Logik für die Pegel-Auswahl (Option „beim Start wählen").
// Der User wählt selbst einen seiner gespeicherten HVZ-Pegel (aus „Meine Gewässer");
// die Wahl wird je Gewässer gemerkt und für Session, Fang & Beißvorhersage genutzt.
import { supabase } from "./supabaseClient";

export type SavedPegel = { id: number; name: string; latitude: number; longitude: number };

export async function loadSavedPegels(): Promise<SavedPegel[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("user_waters")
    .select("id,name,latitude,longitude")
    .eq("user_id", user.id)
    .not("latitude", "is", null)
    .order("created_at", { ascending: true });
  return (data || []) as SavedPegel[];
}

const keyFor = (water?: string) => `pegelFor:${(water || "").toLowerCase().trim()}`;

export function rememberPegel(water: string | undefined, pegelId: number | null) {
  try {
    if (pegelId == null) return;
    if (water && water.trim()) localStorage.setItem(keyFor(water), String(pegelId));
    localStorage.setItem("pegelLast", String(pegelId));
  } catch {}
}

// Gemerkten Pegel abrufen: erst je Gewässer, sonst die zuletzt genutzte Wahl.
export function recallPegel(water?: string): number | null {
  try {
    if (water && water.trim()) {
      const v = localStorage.getItem(keyFor(water));
      if (v) return Number(v);
    }
    const last = localStorage.getItem("pegelLast");
    return last ? Number(last) : null;
  } catch {
    return null;
  }
}
