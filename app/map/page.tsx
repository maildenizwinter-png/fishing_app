"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Users } from "lucide-react";

const MapView = dynamic(() => import("../components/MapView"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const [catches, setCatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForeign, setShowForeign] = useState(false);

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

  const foreignCatches = catches.filter((c) => c.is_foreign);
  const displayed = showForeign ? catches : catches.filter((c) => !c.is_foreign);

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="p-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition flex items-center gap-1">
          <ArrowLeft className="w-5 h-5" /> Zurück
        </button>
        <h1 className="text-white font-semibold text-lg">Fangkarte</h1>
        {foreignCatches.length > 0 && (
          <button
            onClick={() => setShowForeign((v) => !v)}
            className={`ml-auto inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition ${showForeign ? "bg-yellow-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"}`}
          >
            <Users className="w-3.5 h-3.5" /> Begleiter {showForeign ? "an" : "aus"}
          </button>
        )}
        <span className={`text-gray-400 text-sm ${foreignCatches.length > 0 ? "" : "ml-auto"}`}>{displayed.length} Fänge</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Laden...</div>
      ) : displayed.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Noch keine Fänge mit GPS-Daten vorhanden
        </div>
      ) : (
        <div className="flex-1">
          <MapView catches={displayed} />
        </div>
      )}
    </div>
  );
}