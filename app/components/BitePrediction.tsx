"use client";
import { useEffect, useState } from "react";
import { fetchBitePrediction, BiteDay, BiteRating } from "../../lib/bite";
import { Fish, Sunrise } from "lucide-react";

const ratingStyle: Record<BiteRating, { label: string; cls: string }> = {
  top: { label: "Top", cls: "bg-emerald-500/15 text-emerald-400" },
  gut: { label: "Gut", cls: "bg-teal-500/15 text-teal-400" },
  ok: { label: "OK", cls: "bg-amber-500/15 text-amber-400" },
  "mäßig": { label: "Mäßig", cls: "bg-orange-500/15 text-orange-400" },
  schlecht: { label: "Schlecht", cls: "bg-gray-700 text-gray-400" },
};

export default function BitePrediction({ lat, lon }: { lat: number; lon: number }) {
  const [days, setDays] = useState<BiteDay[] | null>(null);

  useEffect(() => {
    let alive = true;
    setDays(null);
    fetchBitePrediction(lat, lon).then((d) => { if (alive) setDays(d); });
    return () => { alive = false; };
  }, [lat, lon]);

  const fmtDate = (iso: string) => {
    const [, m, dd] = iso.split("-");
    return `${dd}.${m}.`;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Fish className="w-5 h-5 text-teal-400" strokeWidth={1.75} /> Beißvorhersage
        </h2>
        <span className="text-gray-600 text-xs">Einschätzung, keine Garantie</span>
      </div>

      {days === null ? (
        <p className="text-gray-500 text-sm">Lade Vorhersage…</p>
      ) : days.length === 0 ? (
        <p className="text-gray-500 text-sm">Keine Vorhersage verfügbar.</p>
      ) : (
        days.map((d, i) => {
          const rs = ratingStyle[d.rating];
          return (
            <div key={d.date} className="rounded-xl bg-gray-800/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{i === 0 ? "Heute" : d.weekday} · {fmtDate(d.date)}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full ${rs.cls}`}>{rs.label} · {d.score}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {d.factors.map((f, j) => (
                  <span
                    key={j}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      f.score >= 70 ? "bg-teal-500/10 text-teal-300" : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {f.label}: {f.value}
                  </span>
                ))}
              </div>
              {d.bestWindows.length > 0 && (
                <p className="text-gray-400 text-xs flex items-center gap-1.5">
                  <Sunrise className="w-3.5 h-3.5 text-gray-500 shrink-0" strokeWidth={1.75} /> Beste Zeiten:{" "}
                  <span className="text-gray-300">{d.bestWindows.join(" · ")}</span>
                </p>
              )}
            </div>
          );
        })
      )}
      <p className="text-gray-600 text-xs">Aus Luftdruck-Trend, Mond, Bewölkung, Niederschlag &amp; Wasser-Trend · grobe Heuristik.</p>
    </div>
  );
}
