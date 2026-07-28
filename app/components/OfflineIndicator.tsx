"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-sm sticky top-0 z-40">
      <WifiOff className="w-4 h-4" /> Offline – Einträge werden lokal gespeichert und später synchronisiert
    </div>
  );
}
