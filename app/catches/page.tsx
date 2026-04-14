"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CatchesPage() {
  const [catches, setCatches] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [fish, setFish] = useState("");
  const [subFish, setSubFish] = useState("");
  const [subFishOptions, setSubFishOptions] = useState<string[]>([]);

  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");
  const [method, setMethod] = useState("");

  const [baitCategory, setBaitCategory] = useState("");
  const [bait, setBait] = useState("");
  const [baitOptions, setBaitOptions] = useState<string[]>([]);

  const [status, setStatus] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [waterTemp, setWaterTemp] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("catches")
      .select("*")
      .order("created_at", { ascending: false });

    setCatches(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ ZEIT FIX (KEIN INVALID DATE MEHR)
  const formatTime = (date: string) => {
    if (!date) return "-";

    try {
      const iso = date.replace(" ", "T");
      const d = new Date(iso);

      if (isNaN(d.getTime())) return "-";

      return d.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
    } catch {
      return "-";
    }
  };

  const handleFishChange = (value: string) => {
    setFish(value);
    setSubFish("");

    if (value === "Karpfen") {
      setSubFishOptions([
        "Schuppenkarpfen",
        "Spiegelkarpfen",
        "Graskarpfen",
      ]);
    } else if (value === "Forelle") {
      setSubFishOptions([
        "Regenbogenforelle",
        "Bachforelle",
        "Seeforelle",
      ]);
    } else {
      setSubFishOptions([]);
    }
  };

  const handleBaitCategoryChange = (value: string) => {
    setBaitCategory(value);
    setBait("");

    if (value === "Lebendköder") {
      setBaitOptions([
        "Dendro",
        "Tauwurm",
        "Boili",
        "Made",
        "Köderfisch",
        "Mais",
        "Forellenteig",
        "Eigener Teig",
      ]);
    } else if (value === "Kunstköder") {
      setBaitOptions([
        "Wurm Gummi",
        "Made Gummi",
        "Spinner",
        "Blinker",
        "Wobbler",
        "Mepps",
      ]);
    } else if (value === "Fliege") {
      setBaitOptions([
        "Trockenfliege",
        "Nassfliege",
        "Nymphen",
        "Gammars",
        "Streamer",
        "Boobies",
      ]);
    } else {
      setBaitOptions([]);
    }
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);

    setFish(c.fish || "");
    setSubFish(c.sub_fish || "");
    setLength(c.length_cm?.toString() || "");
    setWeight(c.weight_g?.toString() || "");
    setMethod(c.method || "");
    setStatus(c.status || "");
    setLocationDetail(c.location_detail || "");
    setWaterTemp(c.water_temp?.toString() || "");
    setNotes(c.notes || "");

    handleFishChange(c.fish);
  };

  const saveEdit = async (id: number) => {
    await supabase
      .from("catches")
      .update({
        fish,
        sub_fish: subFish,
        length_cm: length ? Number(length) : null,
        weight_g: weight ? Number(weight) : null,
        method,
        bait,
        status,
        location_detail: locationDetail,
        water_temp: waterTemp ? Number(waterTemp) : null,
        notes,
      })
      .eq("id", id);

    setEditingId(null);
    load();
  };

  const deleteCatch = async (id: number) => {
    const confirmDelete = confirm("Fang wirklich löschen?");
    if (!confirmDelete) return;

    await supabase.from("catches").delete().eq("id", id);
    load();
  };

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">🐟 Alle Fänge</h1>

      {catches.map((c: any) => (
        <div key={c.id} className="border p-4 rounded space-y-3">

          {editingId === c.id ? (
            <>
              <select value={fish} onChange={(e) => handleFishChange(e.target.value)} className="w-full border p-2">
                <option>Forelle</option>
                <option>Karpfen</option>
                <option>Äsche</option>
                <option>Hecht</option>
                <option>Zander</option>
                <option>Barsch</option>
                <option>Wels</option>
                <option>Sonstiges</option>
              </select>

              {subFishOptions.length > 0 && (
                <select value={subFish} onChange={(e) => setSubFish(e.target.value)} className="w-full border p-2">
                  {subFishOptions.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              )}

              <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="Länge cm" className="w-full border p-2" />

              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border p-2">
                <option>Entnommen</option>
                <option>Zurückgesetzt</option>
              </select>

              <button onClick={() => saveEdit(c.id)} className="bg-green-500 text-white p-2 w-full rounded">
                💾 Speichern
              </button>
            </>
          ) : (
            <>
              <p><strong>{c.fish || "-"}</strong></p>
              <p>
                {c.length_cm ? `${c.length_cm} cm` : "-"} • {c.status || "-"}
              </p>
              <p>{formatTime(c.created_at)}</p>

              <div className="flex gap-2">
                <button onClick={() => startEdit(c)} className="bg-yellow-400 px-2 py-1 rounded">
                  ✏️ Bearbeiten
                </button>

                <button onClick={() => deleteCatch(c.id)} className="bg-red-500 text-white px-2 py-1 rounded">
                  🗑️ Löschen
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </main>
  );
}