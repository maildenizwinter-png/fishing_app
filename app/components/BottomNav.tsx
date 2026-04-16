"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

 const tabs = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/sessions", label: "Sessions", icon: "🎣" },
  { href: "/catches", label: "Fische", icon: "🐟" },
  { href: "/new", label: "Fang", icon: "➕" },
  { href: "/stats", label: "Stats", icon: "📊" },
];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-50">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors
              ${isActive
                ? "text-blue-400"
                : "text-gray-500 hover:text-gray-300"
              }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}