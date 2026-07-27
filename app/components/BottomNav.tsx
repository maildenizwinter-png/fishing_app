"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Home, Waves, Fish, Plus, BarChart3, Shield, LogOut } from "lucide-react";

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
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/sessions", label: "Sessions", icon: Waves },
    { href: "/catches", label: "Fische", icon: Fish },
    { href: "/new", label: "Fang", icon: Plus },
    { href: "/stats", label: "Stats", icon: BarChart3 },
  ];

  if (isAdmin && !impersonating) {
    tabs.push({ href: "/admin", label: "Admin", icon: Shield });
  }

  const handleLogout = async () => {
    localStorage.removeItem("impersonateUserId");
    localStorage.removeItem("impersonateUserName");
    window.dispatchEvent(new Event("impersonation-change"));
    setImpersonating(false);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex z-50 pb-4">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center pt-2.5 pb-1 text-[11px] gap-1 transition-colors
              ${isActive ? "text-teal-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2 : 1.75} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
      <button
        onClick={handleLogout}
        className="flex-1 flex flex-col items-center pt-2.5 pb-1 text-[11px] gap-1 text-gray-500 hover:text-red-400 transition-colors"
      >
        <LogOut className="w-[22px] h-[22px]" strokeWidth={1.75} />
        <span>Logout</span>
      </button>
    </nav>
  );
}
