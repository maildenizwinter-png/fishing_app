"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    checkAdmin();
    setImpersonating(!!localStorage.getItem("impersonateUserId"));
  }, [pathname]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setIsAdmin(data?.role === "admin");
  };

  if (pathname === "/login" || pathname === "/register") return null;

  const tabs = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    { href: "/sessions", label: "Sessions", icon: "🎣" },
    { href: "/catches", label: "Fische", icon: "🐟" },
    { href: "/new", label: "Fang", icon: "➕" },
    { href: "/stats", label: "Stats", icon: "📊" },
  ];

  if (isAdmin && !impersonating) {
    tabs.push({ href: "/admin", label: "Admin", icon: "🛡️" });
  }

  const handleLogout = async () => {
    localStorage.removeItem("impersonateUserId");
    localStorage.removeItem("impersonateUserName");
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-50 pb-4">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center pt-2 pb-1 text-xs gap-1 transition-colors
              ${isActive ? "text-blue-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
      <button
        onClick={handleLogout}
        className="flex-1 flex flex-col items-center pt-2 pb-1 text-xs gap-1 text-gray-500 hover:text-red-400 transition-colors"
      >
        <span className="text-xl">🚪</span>
        <span>Logout</span>
      </button>
    </nav>
  );
}