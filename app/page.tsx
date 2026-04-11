"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [fish, setFish] = useState("");
  const [subFish, setSubFish] = useState("");
  const [subFishOptions, setSubFishOptions] = useState<string[]>([]);

  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");
  const [method, setMethod] = useState("");
  const [bait, setBait] = useState("");
  const [weather, setWeather] = useState("");
  const [rating, setRating] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
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

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const { error } = await supabase.from("catches").insert([
      {
        fish,
        sub_fish: subFish,
        length_cm: length ? Number(length) : null,
        weight_g: weight ? Number(weight) : null,
        method,
        bait,
        weather,
        rating: rating ? Number(rating) : null,
        status,
        location,
        location_detail: locationDetail,
        water_temp: waterTemp ? Number(waterTemp) : null,
        notes,
      },
    ]);

    if (error) {
      alert("Fehler beim Speichern");
      console.log(error);
    } else {
      alert("Fang gespeichert 🎣");
    }
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Fang eintragen 🎣</h1>

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

        {/* Unterart */}
        {subFishOptions.length > 0 && (
          <select onChange={(e) => setSubFish(e.target.value)} className="w-full border p-2">
            <option>Unterart wählen</option>
            {subFishOptions.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        )}

        <input placeholder="Länge cm" type="number" onChange={(e) => setLength(e.target.value)} className="w-full border p-2" />
        <input placeholder="Gewicht g" type="number" onChange={(e) => setWeight(e.target.value)} className="w-full border p-2" />

        {/* Angelart */}
        <select onChange={(e) => setMethod(e.target.value)} className="w-full border p-2">
          <option>Angelart</option>
          <option>Spinnfischen</option>
          <option>Grund</option>
          <option>Pose</option>
          <option>Fliege</option>
          <option>Sonstiges</option>
        </select>

        {/* Köder */}
        <select onChange={(e) => setBait(e.target.value)} className="w-full border p-2">
          <option>Köder wählen</option>
          <option>Wurm Dendro</option>
          <option>Wurm Tauwurm</option>
          <option>Wurm Gummi</option>
          <option>Made</option>
          <option>Mais</option>
          <option>Fliege</option>
          <option>Köderfisch</option>
          <option>Spinner</option>
          <option>Blinker</option>
          <option>Wobbler</option>
          <option>Mepps</option>
          <option>Gummifisch</option>
          <option>Teig</option>
          <option>Boilie</option>
        </select>

        {/* Wetter */}
        <select onChange={(e) => setWeather(e.target.value)} className="w-full border p-2">
          <option>Wetter</option>
          <option>Sonnig</option>
          <option>Leicht bewölkt</option>
          <option>Wolkig</option>
          <option>Regen</option>
          <option>Gewitter</option>
        </select>

        {/* Bewertung */}
        <select onChange={(e) => setRating(e.target.value)} className="w-full border p-2">
          <option>Bewertung</option>
          <option>0</option>
          <option>1</option>
          <option>2</option>
          <option>3</option>
          <option>4</option>
          <option>5</option>
        </select>

        {/* Status */}
        <select onChange={(e) => setStatus(e.target.value)} className="w-full border p-2">
          <option>Status</option>
          <option>Entnommen</option>
          <option>Zurückgesetzt</option>
        </select>

        {/* Ort */}
        <select onChange={(e) => setLocation(e.target.value)} className="w-full border p-2">
          <option>Ort</option>
          <option>Obere Argen</option>
          <option>Doppelargen</option>
          <option>Weiher</option>
          <option>Anderes Gewässer</option>
        </select>

        <input placeholder="Ort Zusatz" onChange={(e) => setLocationDetail(e.target.value)} className="w-full border p-2" />

        <input placeholder="Wassertemperatur" type="number" onChange={(e) => setWaterTemp(e.target.value)} className="w-full border p-2" />

        <textarea placeholder="Besonderheiten" onChange={(e) => setNotes(e.target.value)} className="w-full border p-2"></textarea>

        <button className="bg-blue-500 text-white p-2 w-full">Speichern</button>
      </form>
    </main>
  );
}