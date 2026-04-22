"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [totalStats, setTotalStats] = useState({ users: 0, catches: 0, sessions: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Prüfen ob Admin
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (myProfile?.role !== "admin") {
      router.push("/");
      return;
    }

    setIsAdmin(true);

    // Alle Profile laden
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    // Alle catches und sessions laden (für Zählung pro User)
    const { data: allCatches } = await supabase.from("catches").select("user_id");
    const { data: allSessions } = await supabase.from("sessions").select("user_id");

    const userStats = (profiles || []).map((p: any) => ({
      ...p,
      catchCount: (allCatches || []).filter((c: any) => c.user_id === p.id).length,
      sessionCount: (allSessions || []).filter((s: any) => s.user_id === p.id).length,
    }));

    setUsers(userStats);
    setTotalStats({
      users: profiles?.length || 0,
      catches: allCatches?.length || 0,
      sessions: allSessions?.length || 0,
    });

    setLoading(false);
  };

  const impersonateUser = (userId: string, userName: string) => {
    localStorage.setItem("impersonateUserId", userId);
    localStorage.setItem("impersonateUserName", userName);
    router.push("/");
  };

  if (loading) return <div className="p-4 text-gray-400">Laden...</div>;
  if (!isAdmin) return null;

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">

      <div className="pt-4">
        <h1 className="text-2xl font-bold text-white">🛡️ Admin Dashboard</h1>
        <p className="text-gray-400 text-sm">Übersicht aller User</p>
      </div>

      {/* Gesamt-Statistik */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-gray-400 text-xs uppercase tracking-wider">Gesamt</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-700 rounded-xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl">👥</span>
            <span className="text-xl font-bold text-white">{totalStats.users}</span>
            <span className="text-xs text-gray-400">User</span>
          </div>
          <div className="bg-gray-700 rounded-xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl">🐟</span>
            <span className="text-xl font-bold text-white">{totalStats.catches}</span>
            <span className="text-xs text-gray-400">Fische</span>
          </div>
          <div className="bg-gray-700 rounded-xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl">🎣</span>
            <span className="text-xl font-bold text-white">{totalStats.sessions}</span>
            <span className="text-xs text-gray-400">Sessions</span>
          </div>
        </div>
      </div>

      {/* User Liste */}
      <div className="space-y-3">
        <p className="text-gray-400 text-xs uppercase tracking-wider">👥 User</p>

        {users.map((u) => (
          <div key={u.id} className="bg-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-bold">
                  {u.username || u.full_name || "Unbenannter User"}
                  {u.role === "admin" && <span className="ml-2 text-yellow-400 text-xs">🛡️ Admin</span>}
                </p>
                <p className="text-gray-500 text-xs">{u.id.slice(0, 8)}...</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">🐟 {u.catchCount}</p>
                <p className="text-gray-400 text-sm">🎣 {u.sessionCount}</p>
              </div>
            </div>

            <button
              onClick={() => impersonateUser(u.id, u.username || u.full_name || "User")}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-sm transition"
            >
              👁️ Als dieser User ansehen →
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}