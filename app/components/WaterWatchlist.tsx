"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  searchHvzGauges, fetchHvzByCoords, hvzPegelUrl, hvzTrend,
  HvzGauge, HvzDetail,
} from "../../lib/hvz";
import { Waves, Plus, Search, Trash2, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

function fmtQ(v: number | null): string {
  if (v == null) return "–";
  return v >= 10 ? `${Math.round(v)} m³/s` : `${v.toFixed(2)} m³/s`;
}

export default function WaterWatchlist() {
  const [waters, setWaters] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<HvzDetail | null>(null);
  const [noGauge, setNoGauge] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<HvzGauge[]>([]);
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
      setDetail(null);
      setNoGauge(false);
      return;
    }
    setLoadingInfo(true);
    setNoGauge(false);
    fetchHvzByCoords(w.latitude, w.longitude).then((d) => {
      setDetail(d);
      setNoGauge(d == null);
      setLoadingInfo(false);
    });
  }, [selectedId, waters]);

  const runSearch = async (term?: string) => {
    const t = (term ?? q).trim();
    if (!t) return;
    if (term != null) setQ(term);
    setSearching(true);
    const r = await searchHvzGauges(t);
    setResults(r);
    setSearching(false);
  };

  const addGauge = async (g: HvzGauge) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // HVZ-Name exakt übernehmen: „Name / Gewässer" (z.B. „Epplings / Obere Argen").
    const name = g.gew && g.gew !== g.name ? `${g.name} / ${g.gew}` : g.name;
    const { data } = await supabase
      .from("user_waters")
      .insert({ user_id: user.id, name, latitude: g.lat, longitude: g.lon, is_river: true })
      .select()
      .single();
    setAdding(false);
    setQ("");
    setResults([]);
    await loadWaters(data?.id);
  };

  const removeWater = async (id: number) => {
    if (!confirm("Pegel aus deiner Liste entfernen?")) return;
    await supabase.from("user_waters").delete().eq("id", id);
    setSelectedId(null);
    setDetail(null);
    loadWaters();
  };

  const selected = waters.find((x) => x.id === selectedId);
  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm placeholder-gray-500 focus:border-teal-500 focus:outline-none transition";

  const TrendBadge = () => {
    if (!detail) return null;
    const { trend, changePct } = hvzTrend(detail.q, detail.tmQ);
    const map = {
      steigend: { icon: TrendingUp, text: "steigend", cls: "text-sky-400" },
      fallend: { icon: TrendingDown, text: "fallend", cls: "text-teal-400" },
      gleich: { icon: Minus, text: "gleichbleibend", cls: "text-gray-400" },
    } as const;
    const t = map[trend];
    const Icon = t.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-sm ${t.cls}`}>
        <Icon className="w-4 h-4" /> {t.text}
        {changePct != null && Math.abs(changePct) >= 1 && (
          <span className="text-gray-500">({changePct > 0 ? "+" : ""}{Math.round(changePct)} % ggü. Vortag)</span>
        )}
      </span>
    );
  };

  // Grafik alle 15 Min neu laden
  const graphBucket = Math.floor(Date.now() / 900000);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Waves className="w-5 h-5 text-teal-400" strokeWidth={1.75} /> Pegel · Wasserführung
        </h2>
        <button
          onClick={() => { setAdding((v) => !v); setResults([]); setQ(""); }}
          className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition"
        >
          <Plus className="w-4 h-4" /> Pegel
        </button>
      </div>

      {/* Pegel hinzufügen */}
      {adding && (
        <div className="space-y-2 bg-gray-800/50 rounded-xl p-3">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
              placeholder="HVZ-Pegel suchen (z.B. Argen, Epplings)"
              className={inputClass}
            />
            <button onClick={() => runSearch()} className="px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition shrink-0">
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Argen", "Bodensee", "Schussen"].map((s) => (
              <button
                key={s}
                onClick={() => runSearch(s)}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700 hover:border-teal-500 transition"
              >
                {s}
              </button>
            ))}
          </div>
          {searching && <p className="text-gray-500 text-sm">Suche…</p>}
          {results.map((g, i) => (
            <button
              key={i}
              onClick={() => addGauge(g)}
              className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 transition"
            >
              <span className="text-white">{g.name}</span>
              <span className="text-gray-500 block text-xs truncate">{g.gew} · Pegel {g.dasa}</span>
            </button>
          ))}
          {!searching && q && results.length === 0 && (
            <p className="text-gray-500 text-sm">Kein Pegel gefunden — anderen Namen probieren (nur Baden-Württemberg).</p>
          )}
        </div>
      )}

      {/* Auswahl */}
      {waters.length === 0 ? (
        <p className="text-gray-500 text-sm">Noch kein Pegel. Tippe auf „＋ Pegel" und such deinen HVZ-Pegel (z.B. „Argen").</p>
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
            <button onClick={() => removeWater(selected.id)} className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-400 hover:text-red-400 transition shrink-0" title="Entfernen">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Anzeige */}
      {selected && (
        <div className="space-y-3">
          {loadingInfo ? (
            <p className="text-gray-500 text-sm">Lade HVZ-Pegel…</p>
          ) : noGauge || !detail ? (
            <p className="text-gray-500 text-sm">Kein HVZ-Pegel in der Nähe dieses Eintrags. Tippe auf „＋ Pegel" und wähle einen HVZ-Pegel (Baden-Württemberg).</p>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold text-white leading-none">{fmtQ(detail.q)}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Wasserstand {detail.w != null ? `${detail.w} ${detail.wUnit}` : "–"}
                  </p>
                  <div className="mt-1"><TrendBadge /></div>
                </div>
                <div className="text-right">
                  {detail.qTime && <p className="text-gray-500 text-xs">Stand:<br />{detail.qTime}</p>}
                </div>
              </div>

              {(detail.tmQ != null || detail.tmW != null) && (
                <p className="text-gray-500 text-xs">
                  Tagesmittel Vortag: {detail.tmQ != null ? fmtQ(detail.tmQ) : "–"}
                  {detail.tmW != null ? ` · ${detail.tmW} cm` : ""}
                  {detail.tmDate ? ` (${detail.tmDate})` : ""}
                </p>
              )}

              {/* HVZ-Abflussgrafik (Original der Hochwasservorhersagezentrale) */}
              <div className="space-y-1">
                <p className="text-gray-500 text-xs">Abfluss-Verlauf (HVZ-Originalgrafik)</p>
                <div className="bg-white rounded-lg p-1 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/hvz/graph?id=${detail.dasa}&type=2002&t=${graphBucket}`}
                    alt={`Abfluss-Verlauf Pegel ${detail.name}`}
                    className="w-full h-auto"
                  />
                </div>
              </div>

              <a
                href={hvzPegelUrl(detail.dasa)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition"
              >
                <ExternalLink className="w-4 h-4" /> Bei HVZ Pegel-Info öffnen
              </a>

              <p className="text-gray-600 text-xs">
                Echte Messwerte der Hochwasservorhersagezentrale Baden-Württemberg (ungeprüfte Rohdaten).
                W = Wasserstand, Q = Abfluss.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
