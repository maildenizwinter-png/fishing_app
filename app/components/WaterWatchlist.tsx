"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  fetchWaterInfo, searchWaters, formatDischarge,
  WaterInfo, WaterSearchResult,
} from "../../lib/water";
import { Waves, Plus, Search, Trash2, TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";

export default function WaterWatchlist() {
  const [waters, setWaters] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [info, setInfo] = useState<WaterInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<WaterSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const loadWaters = async (selectId?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_waters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setWaters(data || []);
    if (selectId) setSelectedId(selectId);
    else if ((data || []).length && selectedId == null) setSelectedId(data![0].id);
  };

  useEffect(() => {
    loadWaters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const w = waters.find((x) => x.id === selectedId);
    if (!w || w.latitude == null) {
      setInfo(null);
      return;
    }
    setLoadingInfo(true);
    fetchWaterInfo(w.latitude, w.longitude).then((i) => {
      setInfo(i);
      setLoadingInfo(false);
    });
  }, [selectedId, waters]);

  const runSearch = async () => {
    if (!q.trim()) return;
    setSearching(true);
    const r = await searchWaters(q);
    setResults(r);
    setSearching(false);
  };

  const addWater = async (r: WaterSearchResult) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_waters")
      .insert({ user_id: user.id, name: r.shortName, latitude: r.lat, longitude: r.lon, is_river: true })
      .select()
      .single();
    setAdding(false);
    setQ("");
    setResults([]);
    await loadWaters(data?.id);
  };

  const removeWater = async (id: number) => {
    if (!confirm("Gewässer aus deiner Liste entfernen?")) return;
    await supabase.from("user_waters").delete().eq("id", id);
    setSelectedId(null);
    setInfo(null);
    loadWaters();
  };

  const selected = waters.find((x) => x.id === selectedId);
  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm placeholder-gray-500 focus:border-teal-500 focus:outline-none transition";

  const TrendBadge = () => {
    if (!info?.trend) return null;
    const map = {
      steigend: { icon: TrendingUp, text: "steigend", cls: "text-sky-400" },
      fallend: { icon: TrendingDown, text: "fallend", cls: "text-teal-400" },
      gleich: { icon: Minus, text: "gleichbleibend", cls: "text-gray-400" },
    } as const;
    const t = map[info.trend];
    const Icon = t.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-sm ${t.cls}`}>
        <Icon className="w-4 h-4" /> {t.text}
        {info.changePct != null && Math.abs(info.changePct) >= 1 && (
          <span className="text-gray-500">({info.changePct > 0 ? "+" : ""}{Math.round(info.changePct)} %)</span>
        )}
      </span>
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Waves className="w-5 h-5 text-teal-400" strokeWidth={1.75} /> Wasserführung
        </h2>
        <button
          onClick={() => { setAdding((v) => !v); setResults([]); setQ(""); }}
          className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition"
        >
          <Plus className="w-4 h-4" /> Gewässer
        </button>
      </div>

      {/* Gewässer hinzufügen */}
      {adding && (
        <div className="space-y-2 bg-gray-800/50 rounded-xl p-3">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
              placeholder="Gewässer suchen (z.B. Obere Argen)"
              className={inputClass}
            />
            <button onClick={runSearch} className="px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition shrink-0">
              <Search className="w-4 h-4" />
            </button>
          </div>
          {searching && <p className="text-gray-500 text-sm">Suche…</p>}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => addWater(r)}
              className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 transition"
            >
              <span className="text-white">{r.shortName}</span>
              <span className="text-gray-500 block text-xs truncate">{r.name}</span>
            </button>
          ))}
          {!searching && q && results.length === 0 && (
            <p className="text-gray-500 text-sm">Nichts gefunden — anderen Namen probieren.</p>
          )}
        </div>
      )}

      {/* Auswahl */}
      {waters.length === 0 ? (
        <p className="text-gray-500 text-sm">Noch keine Gewässer. Tippe auf „＋ Gewässer" und such deinen Fluss.</p>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className={inputClass}
          >
            {waters.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          {selected && (
            <button onClick={() => removeWater(selected.id)} className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-400 hover:text-red-400 transition shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Anzeige */}
      {selected && (
        <div className="space-y-2">
          {loadingInfo ? (
            <p className="text-gray-500 text-sm">Lade Wasserführung…</p>
          ) : info?.current == null ? (
            <p className="text-gray-500 text-sm">Für dieses Gewässer keine Wasserführung verfügbar (z.B. stehendes Gewässer).</p>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold text-white leading-none">{formatDischarge(info.current)}</p>
                  <div className="mt-1"><TrendBadge /></div>
                </div>
              </div>
              {info.series.length > 1 && (
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={info.series}>
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Line type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-gray-600 text-xs">Modellierte Wasserführung (Open-Meteo), 7-Tage-Verlauf · kein amtlicher cm-Pegel</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
