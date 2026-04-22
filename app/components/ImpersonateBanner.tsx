"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ImpersonateBanner() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setUserName(localStorage.getItem("impersonateUserName"));
  }, []);

  const stopImpersonation = () => {
    localStorage.removeItem("impersonateUserId");
    localStorage.removeItem("impersonateUserName");
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