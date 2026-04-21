"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("../../components/MapView"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const [catches, setCatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCatches();
  }, []);

  const loadCatches = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data } = await supabase
      .from("catches")
      .select("*, sessions(location)")
      .eq("user_id", user.id)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    setCatches(data || []);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="p-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
          ← Zurück
        </button>
        <h1 className="text-white font-bold text-lg">🗺️ Fangkarte</h1>
        <span className="text-gray-400 text-sm ml-auto">{catches.length} Fänge</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Laden...</div>
      ) : catches.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Noch keine Fänge mit GPS-Daten vorhanden
        </div>
      ) : (
        <div className="flex-1">
          <MapView catches={catches} />
        </div>
      )}
    </div>
  );
}