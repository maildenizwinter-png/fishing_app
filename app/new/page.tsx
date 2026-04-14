"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function NewCatchPage() {
  const router = useRouter();

  const sessionId =
    typeof window !== "undefined"
      ? Number(localStorage.getItem("activeSessionId"))
      : null;

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

  // 🎣 Köder Logik
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!sessionId) {
      alert("Keine aktive Session ❌");
      return;
    }

    const { error } = await supabase.from("catches").insert([
      {
        session_id: sessionId,
        fish,
        sub_fish: subFish,
        length_cm: length ? Number(length) : null,
        weight_g: weight ? Number(weight) : null,
        method,
        bait: bait,
        status,
        location_detail: locationDetail,
        water_temp: waterTemp ? Number(waterTemp) : null,
        notes,
      },
    ]);

    if (error) {
      alert("Fehler: " + error.message);
      return;
    }

    // ✅ Weiterleitung + Refresh
    router.push("/");
    router.refresh();
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Neuer Fang 🎣</h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Fisch */}
        <select onChange={(e) => handleFishChange(e.target.value)} className="w-full border p-2">
          <option>Fisch wählen</option>
          <option>Forelle</option>
          <option>Karpfen</option>
          <option>Äsche</option>
          <option>Bachsaibling</option>
          <option>Felchen</option>
          <option>Hecht</option>
          <option>Wels</option>
          <option>Zander</option>
          <option>Barsch</option>
          <option>Rapfen</option>
          <option>Schleie</option>
          <option>Brasse</option>
          <option>Rotauge</option>
          <option>Rotfeder</option>
          <option>Nase</option>
          <option>Barbe</option>
          <option>Döbel</option>
          <option>Maifisch</option>
          <option>Aal</option>
          <option>Sonstiges</option>
        </select>

        {subFishOptions.length > 0 && (
          <select onChange={(e) => setSubFish(e.target.value)} className="w-full border p-2">
            {subFishOptions.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        )}

        {/* Länge & Gewicht */}
        <input placeholder="Länge cm" type="number" onChange={(e) => setLength(e.target.value)} className="w-full border p-2" />
        <input placeholder="Gewicht g" type="number" onChange={(e) => setWeight(e.target.value)} className="w-full border p-2" />

        {/* Angelart */}
        <select onChange={(e) => setMethod(e.target.value)} className="w-full border p-2">
          <option>Angelart</option>
          <option>Spinnfischen</option>
          <option>Grund</option>
          <option>Pose</option>
          <option>Fliege</option>
        </select>

        {/* Köder Kategorie */}
        <select onChange={(e) => handleBaitCategoryChange(e.target.value)} className="w-full border p-2">
          <option>Köder wählen</option>
          <option>Fliege</option>
          <option>Lebendköder</option>
          <option>Kunstköder</option>
        </select>

        {/* Sub Köder */}
        {baitOptions.length > 0 && (
          <select onChange={(e) => setBait(e.target.value)} className="w-full border p-2">
            {baitOptions.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        )}

        {/* Status */}
        <select onChange={(e) => setStatus(e.target.value)} className="w-full border p-2">
          <option>Entnommen / Zurückgesetzt</option>
          <option>Entnommen</option>
          <option>Zurückgesetzt</option>
        </select>

        {/* Ort */}
        <input placeholder="Ort" onChange={(e) => setLocationDetail(e.target.value)} className="w-full border p-2" />

        {/* Wasser */}
        <input placeholder="Wassertemperatur" type="number" onChange={(e) => setWaterTemp(e.target.value)} className="w-full border p-2" />

        {/* Notizen */}
        <textarea placeholder="Besonderheiten" onChange={(e) => setNotes(e.target.value)} className="w-full border p-2"></textarea>

        <button className="bg-blue-500 text-white p-2 w-full">Speichern</button>
      </form>
    </main>
  );
}