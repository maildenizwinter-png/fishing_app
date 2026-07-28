"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Fish, User, Users, Save, Camera, X, AlertTriangle } from "lucide-react";
import { getFishRule, isInSchonzeit, isUntermassig, formatSchonzeit } from "../../lib/fishingRules";
import { fetchWaterInfo } from "../../lib/water";

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

  // Begleiter-Fang (zählt nicht als eigener Fang)
  const [isForeign, setIsForeign] = useState(false);
  const [anglerName, setAnglerName] = useState("");
  const [knownAnglers, setKnownAnglers] = useState<string[]>([]);
  const [addingNewAngler, setAddingNewAngler] = useState(false);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem("activeSessionId");
    if (storedId) {
      setActiveSessionId(Number(storedId));
    } else {
      loadSessions();
    }
    loadKnownAnglers();
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

  // Bereits vergebene Begleiter-Namen laden → als Vorschlag, damit Schreibweise gleich bleibt
  const loadKnownAnglers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("catches")
      .select("angler_name")
      .eq("user_id", user.id)
      .eq("is_foreign", true)
      .not("angler_name", "is", null);
    const names = Array.from(
      new Set((data || []).map((r: any) => r.angler_name).filter(Boolean))
    ).sort((a: string, b: string) => a.localeCompare(b));
    setKnownAnglers(names as string[]);
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

  const getLocationData = async () => {
    return new Promise<{ latitude: number | null; longitude: number | null }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve({ latitude: null, longitude: null }),
        { timeout: 10000 }
      );
    });
  };

  const getWeatherData = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`
      );
      const data = await res.json();
      return {
        temperature: data.main?.temp ?? null,
        pressure: data.main?.pressure ?? null,
        weather: data.weather?.[0]?.main ?? null,
      };
    } catch {
      return { temperature: null, pressure: null, weather: null };
    }
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
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const sessionId = activeSessionId || selectedSessionId || null;

    // GPS + Wetter immer holen
    const { latitude, longitude } = await getLocationData();
    let weatherData = { temperature: null, pressure: null, weather: null };
    let riverDischarge: number | null = null;
    if (latitude && longitude) {
      weatherData = await getWeatherData(latitude, longitude);
      const water = await fetchWaterInfo(latitude, longitude);
      riverDischarge = water.current;
    }

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
      latitude,
      longitude,
      river_discharge: riverDischarge,
      is_foreign: isForeign,
      angler_name: isForeign ? (anglerName.trim() || null) : null,
      ...weatherData,
    }]);

    if (error) {
      alert("Fehler: " + error.message);
      setSaving(false);
      return;
    }

    router.push("/");
  };

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3.5 text-[15px] placeholder-gray-500 focus:border-teal-500 focus:outline-none transition";

  // Schonzeit / Mindestmaß zum gewählten Fisch (Regelwerk Baden-Württemberg)
  const catchDate = manualTime ? new Date(manualTime) : new Date();
  const rule = fish && fish !== "Sonstiges" ? getFishRule(fish, subFish) : null;
  const showRuleCard = !!fish && fish !== "Sonstiges";
  const schonzeitAktiv = rule ? isInSchonzeit(rule, catchDate) : false;
  const untermassig = rule ? isUntermassig(rule, length ? Number(length) : null) : false;

  const formatSessionLabel = (s: any) => {
    const date = new Date(s.start_time + "Z").toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
    return `${s.location} – ${date}`;
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">

      <div className="pt-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
          <Fish className="w-5 h-5 text-teal-400" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Neuer Fang</h1>
          <p className="text-gray-400 text-sm">GPS + Wetter werden automatisch erfasst</p>
        </div>
      </div>

      {/* Wer hat gefangen? – Begleiter-Fänge zählen nicht in die eigene Statistik */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setIsForeign(false); setAnglerName(""); setAddingNewAngler(false); }}
          className={`py-3.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${!isForeign ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"}`}
        >
          <User className="w-4 h-4" /> Mein Fang
        </button>
        <button
          type="button"
          onClick={() => setIsForeign(true)}
          className={`py-3.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${isForeign ? "bg-yellow-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"}`}
        >
          <Users className="w-4 h-4" /> Begleiter
        </button>
      </div>

      {isForeign && (
        <div className="space-y-2">
          {knownAnglers.length > 0 && !addingNewAngler ? (
            <select
              value={anglerName}
              onChange={(e) => {
                if (e.target.value === "__new__") { setAddingNewAngler(true); setAnglerName(""); }
                else setAnglerName(e.target.value);
              }}
              className={inputClass}
            >
              <option value="">Angler wählen…</option>
              {knownAnglers.map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="__new__">➕ Neuer Angler…</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                value={anglerName}
                onChange={(e) => setAnglerName(e.target.value)}
                placeholder="Name des Begleiters"
                className={inputClass}
              />
              {knownAnglers.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setAddingNewAngler(false); setAnglerName(""); }}
                  className="px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm whitespace-nowrap"
                >
                  Liste
                </button>
              )}
            </div>
          )}
          <p className="text-yellow-500/80 text-xs">Dieser Fang zählt nicht in deine Statistik.</p>
        </div>
      )}

      {/* Session – optional */}
      <select
        onChange={(e) => setSelectedSessionId(e.target.value ? Number(e.target.value) : null)}
        className={inputClass}
        defaultValue={activeSessionId?.toString() || ""}
      >
        <option value="">Ohne Session</option>
        {activeSessionId && (
          <option value={activeSessionId}>Aktive Session</option>
        )}
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>{formatSessionLabel(s)}</option>
        ))}
      </select>

      {/* Zeitpunkt – einziges Feld mit Mini-Label (datetime-local kann keinen Platzhalter) */}
      <div className="space-y-1.5">
        <label className="text-gray-500 text-xs px-1">Zeitpunkt · leer = jetzt</label>
        <input type="datetime-local" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className={inputClass} />
      </div>

      {/* Fischart */}
      <select onChange={(e) => handleFishChange(e.target.value)} className={inputClass} defaultValue="">
        <option value="">Fischart wählen</option>
        <option>Forelle</option>
        <option>Karpfen</option>
        <option>Äsche</option>
        <option>Bachsaibling</option>
        <option>Seesaibling</option>
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
        <select onChange={(e) => setSubFish(e.target.value)} className={inputClass} defaultValue="">
          <option value="">Unterart wählen</option>
          {subFishOptions.map((f) => <option key={f}>{f}</option>)}
        </select>
      )}

      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Länge (cm)" type="number" onChange={(e) => setLength(e.target.value)} className={inputClass} />
        <input placeholder="Gewicht (g)" type="number" onChange={(e) => setWeight(e.target.value)} className={inputClass} />
      </div>

      {/* Schonzeit / Mindestmaß (Baden-Württemberg) */}
      {showRuleCard && (
        <div className={`rounded-xl border p-3 space-y-2 text-sm ${schonzeitAktiv || untermassig ? "border-red-500/40 bg-red-500/5" : "border-gray-800 bg-gray-900"}`}>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-gray-400">
            <span>Schonzeit: <span className="text-gray-200">{rule ? formatSchonzeit(rule) : "keine"}</span></span>
            <span>Mindestmaß: <span className="text-gray-200">{rule?.mindestmassCm ? `${rule.mindestmassCm} cm` : "keins"}</span></span>
          </div>
          {schonzeitAktiv && (
            <p className="text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> In der Schonzeit — {subFish || fish} ist an diesem Datum geschont.</p>
          )}
          {untermassig && (
            <p className="text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> Untermaßig — unter {rule?.mindestmassCm} cm Mindestmaß.</p>
          )}
          <p className="text-gray-600 text-xs">Angaben ohne Gewähr (BW) · Vereins-/Pachtregeln können strenger sein · Erlaubnisschein prüfen.</p>
        </div>
      )}

      {/* Angelart */}
      <select onChange={(e) => setMethod(e.target.value)} className={inputClass} defaultValue="">
        <option value="">Angelart wählen</option>
        <option>Spinnfischen</option>
        <option>Grund</option>
        <option>Pose</option>
        <option>Fliege</option>
      </select>

      {/* Köderart */}
      <select onChange={(e) => handleBaitCategoryChange(e.target.value)} className={inputClass} defaultValue="">
        <option value="">Köderart wählen</option>
        <option>Fliege</option>
        <option>Lebendköder</option>
        <option>Kunstköder</option>
      </select>

      {baitOptions.length > 0 && (
        <select onChange={(e) => setBait(e.target.value)} className={inputClass} defaultValue="">
          <option value="">Köder wählen</option>
          {baitOptions.map((b) => <option key={b}>{b}</option>)}
        </select>
      )}

      {/* Status */}
      <select onChange={(e) => setStatus(e.target.value)} className={inputClass} defaultValue="">
        <option value="">Status wählen</option>
        <option>Entnommen</option>
        <option>Zurückgesetzt</option>
      </select>

      <input placeholder="Stelle (z.B. unter der Brücke)" onChange={(e) => setLocationDetail(e.target.value)} className={inputClass} />

      <input placeholder="Wassertemperatur (°C)" type="number" onChange={(e) => setWaterTemp(e.target.value)} className={inputClass} />

      <textarea placeholder="Besonderheiten / Notizen…" onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />

      {/* Foto */}
      <div className="space-y-2">
        <label className="w-full bg-gray-800 border border-gray-700 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:bg-gray-700 transition">
          <Camera className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
          <span className="text-gray-300 text-sm">Foto aufnehmen oder wählen</span>
          <span className="text-gray-600 text-xs">wird automatisch komprimiert</span>
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </label>

        {imagePreview && (
          <div className="relative">
            <img src={imagePreview} alt="Vorschau" className="w-full rounded-xl object-cover max-h-64" />
            <button
              onClick={() => { setImage(null); setImagePreview(null); }}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-4 rounded-2xl text-lg transition flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" /> {saving ? "GPS + Wetter werden erfasst…" : "Fang speichern"}
      </button>

    </div>
  );
}
