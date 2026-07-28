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

class CatchOfflineDB extends Dexie {
  outbox!: Table<OutboxItem, number>;
  constructor() {
    super("catch-offline");
    this.version(1).stores({
      outbox: "++id, type, status, createdAt",
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
