"use client";
import { useEffect, useState, useCallback } from "react";
import { WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { pendingCount } from "../../lib/offlineDb";
import { syncOutbox } from "../../lib/sync";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await pendingCount());
  }, []);

  const doSync = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    setSyncing(true);
    await syncOutbox();
    setSyncing(false);
    refresh();
  }, [refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();
    if (navigator.onLine) doSync();
    const on = () => { setOnline(true); doSync(); };
    const off = () => setOnline(false);
    const changed = () => refresh();
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("outbox-changed", changed);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("outbox-changed", changed);
    };
  }, [doSync, refresh]);

  if (!online) {
    return (
      <div className="bg-amber-600 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-sm sticky top-0 z-40">
        <WifiOff className="w-4 h-4" /> Offline – Einträge werden lokal gespeichert und später synchronisiert
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div className="bg-teal-700 text-white px-4 py-1.5 flex items-center justify-center gap-3 text-sm sticky top-0 z-40">
        <span className="flex items-center gap-2">
          <CloudUpload className="w-4 h-4" /> {pending} offline erfasst
        </span>
        <button
          onClick={doSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-2.5 py-0.5 rounded-full transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchronisiere…" : "Synchronisieren"}
        </button>
      </div>
    );
  }

  return null;
}
