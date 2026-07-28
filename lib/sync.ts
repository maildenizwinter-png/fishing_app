// Sync-Engine: arbeitet die Offline-Outbox ab, sobald wieder Verbindung besteht.
// Reihenfolge wichtig: erst Sessions (neue Server-IDs merken), dann Fänge
// (lokale Session-Referenz auflösen, Fotos hochladen).
import { supabase } from "./supabaseClient";
import { allItems, markSynced } from "./offlineDb";

async function uploadPhoto(blob: Blob, name: string): Promise<string | null> {
  const fileName = name || `${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("catch-images")
    .upload(fileName, blob, { contentType: "image/jpeg" });
  if (error) return null;
  const { data } = supabase.storage.from("catch-images").getPublicUrl(fileName);
  return data.publicUrl;
}

let syncing = false;

export async function syncOutbox(): Promise<{ synced: number; errors: number }> {
  if (typeof window === "undefined" || !navigator.onLine || syncing) {
    return { synced: 0, errors: 0 };
  }
  syncing = true;
  let synced = 0;
  let errors = 0;

  try {
    const items = await allItems();
    const sessions = items.filter((i) => i.type === "session" && i.status === "pending");
    const catches = items.filter((i) => i.type === "catch" && i.status === "pending");
    const sessionMap = new Map<number, number>(); // Outbox-id -> Server-Session-id

    for (const s of sessions) {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .insert([s.payload])
          .select("id")
          .single();
        if (error) throw error;
        sessionMap.set(s.id!, data.id);
        // Falls diese lokale Session gerade "aktiv" ist (negativer Marker), auf echte id umstellen
        const act = localStorage.getItem("activeSessionId");
        if (act && Number(act) === -s.id!) localStorage.setItem("activeSessionId", String(data.id));
        await markSynced(s.id!, data.id);
        synced++;
      } catch {
        // Bleibt "pending" -> wird beim nächsten Sync erneut versucht (kein Datenverlust)
        errors++;
      }
    }

    for (const c of catches) {
      try {
        const payload: Record<string, any> = { ...c.payload };
        if (c.localSessionId != null) {
          const sid = sessionMap.get(c.localSessionId);
          if (sid == null) continue; // zugehörige Session noch nicht gesynct -> nächster Lauf
          payload.session_id = sid;
        }
        if (c.photoBlob) {
          const url = await uploadPhoto(c.photoBlob, c.photoName || `${Date.now()}.jpg`);
          if (url) payload.image_url = url;
        }
        const { error } = await supabase.from("catches").insert([payload]);
        if (error) throw error;
        await markSynced(c.id!);
        synced++;
      } catch {
        // Bleibt "pending" -> nächster Sync versucht es erneut
        errors++;
      }
    }
  } finally {
    syncing = false;
  }

  window.dispatchEvent(new Event("outbox-changed"));
  return { synced, errors };
}
