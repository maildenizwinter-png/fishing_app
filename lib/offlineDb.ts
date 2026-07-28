// Lokale Offline-Datenbank (IndexedDB via Dexie) + Outbox (Sync-Warteschlange).
// Nur clientseitig verwenden. Fänge/Sessions, die offline erfasst werden,
// landen hier und werden beim Wiederverbinden zu Supabase synchronisiert.
import Dexie, { type Table } from "dexie";

export type OutboxType = "session" | "catch";

export interface OutboxItem {
  id?: number;
  type: OutboxType;
  payload: Record<string, any>; // Felder für den Supabase-Insert
  localSessionId?: number; // Outbox-id der lokalen Session (Fang während Offline-Session)
  photoBlob?: Blob; // Foto, das offline aufgenommen wurde (wird beim Sync hochgeladen)
  photoName?: string;
  status: "pending" | "error";
  errorMsg?: string;
  serverId?: number; // nach erfolgreichem Sync: echte Supabase-id
  createdAt: string;
}

interface KV {
  key: string;
  value: any;
}

class CatchOfflineDB extends Dexie {
  outbox!: Table<OutboxItem, number>;
  kv!: Table<KV, string>;
  constructor() {
    super("catch-offline");
    this.version(1).stores({
      outbox: "++id, type, status, createdAt",
    });
    // Additive Migration: Cache-Store für Offline-Lesen (Outbox bleibt erhalten)
    this.version(2).stores({
      outbox: "++id, type, status, createdAt",
      kv: "key",
    });
  }
}

// Lazy-Singleton, nur im Browser instanziieren (kein IndexedDB beim SSR/Build).
let _db: CatchOfflineDB | null = null;
function db(): CatchOfflineDB {
  if (!_db) _db = new CatchOfflineDB();
  return _db;
}

export async function queueSession(payload: Record<string, any>): Promise<number> {
  return db().outbox.add({
    type: "session",
    payload,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

export async function queueCatch(item: {
  payload: Record<string, any>;
  localSessionId?: number;
  photoBlob?: Blob | null;
  photoName?: string;
}): Promise<number> {
  return db().outbox.add({
    type: "catch",
    payload: item.payload,
    localSessionId: item.localSessionId,
    photoBlob: item.photoBlob || undefined,
    photoName: item.photoName,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

export async function pendingCount(): Promise<number> {
  if (typeof window === "undefined") return 0;
  try {
    return await db().outbox.count();
  } catch {
    return 0;
  }
}

export async function allItems(): Promise<OutboxItem[]> {
  if (typeof window === "undefined") return [];
  try {
    return await db().outbox.orderBy("createdAt").toArray();
  } catch {
    return [];
  }
}

export async function pendingCatches(): Promise<OutboxItem[]> {
  return (await allItems()).filter((o) => o.type === "catch");
}

export async function pendingSessions(): Promise<OutboxItem[]> {
  return (await allItems()).filter((o) => o.type === "session");
}

export async function getItem(id: number): Promise<OutboxItem | undefined> {
  return db().outbox.get(id);
}

export async function markSynced(id: number, serverId?: number) {
  await db().outbox.delete(id);
  void serverId;
}

export async function markError(id: number, msg: string) {
  await db().outbox.update(id, { status: "error", errorMsg: msg });
}

// Cache für Offline-Lesen (zuletzt geladene Server-Daten spiegeln)
export async function cacheSet(key: string, value: any): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await db().kv.put({ key, value });
  } catch {}
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (typeof window === "undefined") return null;
  try {
    const row = await db().kv.get(key);
    return (row?.value as T) ?? null;
  } catch {
    return null;
  }
}
