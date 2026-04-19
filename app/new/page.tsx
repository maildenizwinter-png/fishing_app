"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function NewCatchPage() {
  const router = useRouter();

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [manualTime, setManualTime] = useState("");

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
  const [saving, setSaving] = useState(false);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem("activeSessionId");
    if (storedId) {
      setActiveSessionId(Number(storedId));
    } else {
      loadSessions();
    }
  }, []);

  const loadSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user?.id)
      .order("start_time", { ascending: false });
    setSessions(data || []);
  };

  const handleFishChange = (value: string) => {
    setFish(value);
    setSubFish("");
    if (value === "Karpfen") {
      setSubFishOptions(["Schuppenkarpfen", "Spiegelkarpfen", "Graskarpfen"]);
    } else if (value === "Forelle") {
      setSubFishOptions(["Regenbogenforelle", "Bachforelle", "Seeforelle"]);
    } else {
      setSubFishOptions([]);
    }
  };

  const handleBaitCategoryChange = (value: string) => {
    setBaitCategory(value);
    setBait("");
    if (value === "Lebendköder") {
      setBaitOptions(["Dendro", "Tauwurm", "Boili", "Made", "Köderfisch", "Mais", "Forellenteig", "Eigener Teig"]);
    } else if (value === "Kunstköder") {
      setBaitOptions(["Wurm Gummi", "Made Gummi", "Spinner", "Blinker", "Wobbler", "Mepps"]);
    } else if (value === "Fliege") {
      setBaitOptions(["Trockenfliege", "Nassfliege", "Nymphen", "Gammars", "Streamer", "Boobies"]);
    } else {
      setBaitOptions([]);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.75);
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    const compressedFile = new File([compressed], file.name, { type: "image/jpeg" });
    setImage(compressedFile);
    setImagePreview(URL.createObjectURL(compressed));
  };

  const getWeatherData = async () => {
    return new Promise<any>((resolve) => {
      if (!navigator.geolocation) { resolve({}); return; }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`
            );
            const data = await res.json();
            resolve({
              temperature: data.main?.temp ?? null,
              pressure: data.main?.pressure ?? null,
              weather: data.weather?.[0]?.main ?? null,
            });
          } catch { resolve({}); }
        },
        () => resolve({})
      );
    });
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!image) return null;
    const fileName = `${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("catch-images").upload(fileName, image);
    if (error) { console.error("Bild-Upload Fehler:", error.message); return null; }
    const { data } = supabase.storage.from("catch-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    const sessionId = activeSessionId || selectedSessionId;
    if (!sessionId) {
      alert("Bitte eine Session auswählen ❌");
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const weatherData = activeSessionId ? await getWeatherData() : {};
    const imageUrl = await uploadImage();
    const catchTime = manualTime
      ? new Date(manualTime).toISOString()
      : new Date().toISOString();

    const { error } = await supabase.from("catches").insert([{
      session_id: sessionId,
      user_id: user?.id,
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
      image_url: imageUrl,
      created_at: catchTime,
      ...weatherData,
    }]);

    if (error) {
      alert("Fehler: " + error.message);
      setSaving(false);
      return;
    }

    router.push("/");
  };

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl p-3 placeholder-gray-600";
  const labelClass = "text-gray-400 text-sm";

  const formatSessionLabel = (s: any) => {
    const date = new Date(s.start_time + "Z").toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
    return `${s.location} – ${date}`;
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-5">

      <div className="pt-4">
        <h1 className="text-2xl font-bold text-white">🐟 Neuer Fang</h1>
        <p className="text-gray-400 text-sm">
          {activeSessionId ? "Wetter wird automatisch erfasst 🌦️" : "Fang nachtragen 📅"}
        </p>
      </div>

      {!activeSessionId && (
        <div className="space-y-2">
          <label className={labelClass}>Session</label>
          <select onChange={(e) => setSelectedSessionId(Number(e.target.value))} className={inputClass}>
            <option value="">Session wählen</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{formatSessionLabel(s)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className={labelClass}>Zeitpunkt {activeSessionId ? "(optional – leer = jetzt)" : ""}</label>
        <input type="datetime-local" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className={inputClass} />
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Fischart</label>
        <select onChange={(e) => handleFishChange(e.target.value)} className={inputClass}>
          <option value="">Fisch wählen</option>
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
      </div>

      {subFishOptions.length > 0 && (
        <div className="space-y-2">
          <label className={labelClass}>Unterart</label>
          <select onChange={(e) => setSubFish(e.target.value)} className={inputClass}>
            {subFishOptions.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={labelClass}>Länge (cm)</label>
          <input placeholder="z.B. 45" type="number" onChange={(e) => setLength(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Gewicht (g)</label>
          <input placeholder="z.B. 1200" type="number" onChange={(e) => setWeight(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Angelart</label>
        <select onChange={(e) => setMethod(e.target.value)} className={inputClass}>
          <option value="">Angelart wählen</option>
          <option>Spinnfischen</option>
          <option>Grund</option>
          <option>Pose</option>
          <option>Fliege</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Köder Kategorie</label>
        <select onChange={(e) => handleBaitCategoryChange(e.target.value)} className={inputClass}>
          <option value="">Köder wählen</option>
          <option>Fliege</option>
          <option>Lebendköder</option>
          <option>Kunstköder</option>
        </select>
      </div>

      {baitOptions.length > 0 && (
        <div className="space-y-2">
          <label className={labelClass}>Köder</label>
          <select onChange={(e) => setBait(e.target.value)} className={inputClass}>
            {baitOptions.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className={labelClass}>Status</label>
        <select onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          <option value="">Status wählen</option>
          <option>Entnommen</option>
          <option>Zurückgesetzt</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Stelle (optional)</label>
        <input placeholder="z.B. Unter der Brücke" onChange={(e) => setLocationDetail(e.target.value)} className={inputClass} />
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Wassertemperatur (°C)</label>
        <input placeholder="z.B. 14" type="number" onChange={(e) => setWaterTemp(e.target.value)} className={inputClass} />
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Besonderheiten</label>
        <textarea placeholder="z.B. Schöner Fisch, direkt am Ufer gefangen..." onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Foto (optional)</label>
        <label className="w-full bg-gray-800 border border-gray-700 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:bg-gray-700 transition">
          <span className="text-3xl">📸</span>
          <span className="text-gray-400 text-sm">Foto aufnehmen oder aus Galerie wählen</span>
          <span className="text-gray-600 text-xs">wird automatisch komprimiert</span>
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </label>

        {imagePreview && (
          <div className="relative">
            <img src={imagePreview} alt="Vorschau" className="w-full rounded-xl object-cover max-h-64" />
            <button
              onClick={() => { setImage(null); setImagePreview(null); }}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl text-lg transition"
      >
        {saving ? "⏳ Wird gespeichert..." : "💾 Fang speichern"}
      </button>

    </div>
  );
}