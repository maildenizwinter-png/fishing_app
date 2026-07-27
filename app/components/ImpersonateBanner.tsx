"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function ImpersonateBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Kein Banner auf Login/Register
    if (pathname === "/login" || pathname === "/register") {
      setUserName(null);
      return;
    }

    const name = localStorage.getItem("impersonateUserName");
    if (!name) {
      setUserName(null);
      return;
    }

    // Nur zeigen wenn wirklich eine Session existiert – sonst verwaiste Keys entfernen
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      localStorage.removeItem("impersonateUserId");
      localStorage.removeItem("impersonateUserName");
      setUserName(null);
      return;
    }

    setUserName(name);
  }, [pathname]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    // Custom-Event (gleicher Tab) + storage-Event (anderer Tab)
    window.addEventListener("impersonation-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("impersonation-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const stopImpersonation = () => {
    localStorage.removeItem("impersonateUserId");
    localStorage.removeItem("impersonateUserName");
    window.dispatchEvent(new Event("impersonation-change"));
    setUserName(null);
    router.push("/admin");
  };

  if (!userName) return null;

  return (
    <div className="bg-yellow-600 text-white px-4 py-2 flex items-center justify-between text-sm sticky top-0 z-40">
      <span>🛡️ Du siehst Daten von <strong>{userName}</strong></span>
      <button
        onClick={stopImpersonation}
        className="bg-yellow-700 hover:bg-yellow-800 px-3 py-1 rounded-lg transition"
      >
        ↩ Zurück
      </button>
    </div>
  );
}
