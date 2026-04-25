"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { getUserFilter } from "../../lib/getUserId";

function CatchesContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const [catches, setCatches] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const catchRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [fish, setFish] = useState("");
  const [subFish, setSubFish] = useState("");
  const [subFishOptions, setSubFishOptions] = useState<string[]>([]);
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [waterTemp, setWaterTemp] = useState("");
  const [notes, setNotes] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLon, setEditLon] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const [galleryImage, setGalleryImage] = useState<string | null>(null);

  const [filterLocation, setFilterLocation] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFish, setFilterFish] = useState("");

  const load = async () => {
    const filter = await getUserFilter();

    let query = supabase
      .from("catches")
      .select("*, sessions(location)")
      .order("created_at", { ascending: false });

    if (filter.mode === "user") {
      if (!filter.userId) return;
      query = query.eq("user_id", filter.userId);
    }

    const { data } = await query;
    setCatches(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (highlightId && catches.length > 0) {
      const id = Number(highlightId);
      const el = catchRefs.current[id];
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedId(id);
          setTimeout(() => setHighlightedId(null), 3000);
        }, 200);
      }
    }
  }, [highlightId, catches]);

  const formatTime = (date: string) => {
    if (!date) return "-";
    try {
      const d = new Date(date.replace(" ", "T"));
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
    } catch { return "-"; }
  };

  const toLocalDatetimeString = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return "";
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
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
    setEditTime(toLocalDatetimeString(c.created_at));
    setEditLat(c.latitude?.toString() || "");
    setEditLon(c.longitude?.toString() || "");
    setEditImageUrl(c.image_url || null);
    setEditImageFile(null);
    setEditImagePreview(null);
    handleFishChange(c.fish);
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

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    const compressedFile = new File([compressed], file.name, { type: "image/jpeg" });
    setEditImageFile(compressedFile);
    setEditImagePreview(URL.createObjectURL(compressed));
  };

  const uploadEditImage = async (): Promise<string | null> => {
    if (!editImageFile) return editImageUrl;
    const fileName = `${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("catch-images").upload(fileName, editImageFile);
    if (error) { console.error("Bild-Upload Fehler:", error.message); return editImageUrl; }
    const { data } = supabase.storage.from("catch-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const saveEdit = async (id: number) => {
    const imageUrl = await uploadEditImage();
    await supabase.from("catches").update({
      fish,
      sub_fish: subFish,
      length_cm: length ? Number(length) : null,
      weight_g: weight ? Number(weight) : null,
      method,
      status,
      location_detail: locationDetail,
      water_temp: waterTemp ? Number(waterTemp) : null,
      notes,
      created_at: editTime ? new Date(editTime).toISOString() : undefined,
      latitude: editLat ? Number(editLat) : null,
      longitude: editLon ? Number(editLon) : null,
      image_url: imageUrl,
    }).eq("id", id);
    setEditingId(null);
    load();
  };

  const deleteCatch = async (id: number) => {
    if (!confirm("Fang wirklich löschen?")) return;
    await supabase.from("catches").delete().eq("id", id);
    load();
  };

  const getLocation = (c: any) => {
    const gewässer = c.sessions?.location || "";
    const stelle = c.location_detail || "";
    if (gewässer && stelle) return `${gewässer} – ${stelle}`;
    if (gewässer) return gewässer;
    if (stelle) return stelle;
    return null;
  };

  const openInMaps = (lat: number, lon: number, fish: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?q=${encodeURIComponent(fish)}&ll=${lat},${lon}`
      : `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(url, "_blank");
  };

  const uniqueLocations = Array.from(
    new Set(catches.map((c) => c.sessions?.location).filter(Boolean))
  );

  const uniqueYears = Array.from(
    new Set(catches.map((c) => {
      if (!c.created_at) return null;
      return new Date(c.created_at.replace(" ", "T")).getFullYear().toString();
    }).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a));

  const uniqueFish = Array.from(
    new Set(catches.map((c) => c.fish).filter(Boolean))
  );

  const filtered = catches.filter((c) => {
    if (filterLocation && c.sessions?.location !== filterLocation) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterFish && c.fish !== filterFish) return false;
    if (filterYear) {
      if (!c.created_at) return false;
      const year = new Date(c.created_at.replace(" ", "T")).getFullYear().toString();
      if (year !== filterYear) return false;
    }
    return true;
  });

  const inputClass = "bg-gray-700 text-white border border-gray-600 rounded-xl p-2 text-sm";

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">

      {galleryImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setGalleryImage(null)}
        >
          <img src={galleryImage} alt="Fang" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button
            className="absolute top-4 right-4 bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"
            onClick={() => setGalleryImage(null)}
          >✕</button>
        </div>
      )}

      <div className="pt-4">
        <h1 className="text-2xl font-bold text-white">🐟 Alle Fänge</h1>
        <p className="text-gray-400 text-sm">{filtered.length} von {catches.length} Fängen</p>
      </div>

      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-gray-400 text-xs uppercase tracking-wider">Filter</p>

        <div className="grid grid-cols-2 gap-2">
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className={inputClass + " w-full"}>
            <option value="">Alle Gewässer</option>
            {uniqueLocations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputClass + " w-full"}>
            <option value="">Alle Status</option>
            <option>Entnommen</option>
            <option>Zurückgesetzt</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select value={filterFish} onChange={(e) => setFilterFish(e.target.value)} className={inputClass + " w-full"}>
            <option value="">Alle Fischarten</option>
            {uniqueFish.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>

          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={inputClass + " w-full"}>
            <option value="">Alle Jahre</option>
            {uniqueYears.map((y) => <option key={y} value={y!}>{y}</option>)}
          </select>
        </div>

        {(filterLocation || filterStatus || filterYear || filterFish) && (
          <button
            onClick={() => { setFilterLocation(""); setFilterStatus(""); setFilterYear(""); setFilterFish(""); }}
            className="text-red-400 text-sm hover:text-red-300 transition"
          >
            ✕ Filter zurücksetzen
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm">Keine Fänge für diesen Filter.</p>
      )}

      {filtered.map((c: any) => (
        <div
          key={c.id}
          ref={(el) => { catchRefs.current[c.id] = el; }}
          className={`bg-gray-800 rounded-2xl overflow-hidden transition-all duration-500 ${
            highlightedId === c.id ? "ring-4 ring-blue-500 shadow-lg shadow-blue-500/50" : ""
          }`}
        >

          {c.image_url && editingId !== c.id && (
            <img
              src={c.image_url}
              alt={c.fish}
              className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition"
              onClick={() => setGalleryImage(c.image_url)}
            />
          )}

          <div className="p-4 space-y-3">
            {editingId === c.id ? (
              <>
                <select value={fish} onChange={(e) => handleFishChange(e.target.value)} className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2">
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
                  <select value={subFish} onChange={(e) => setSubFish(e.target.value)} className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2">
                    {subFishOptions.map((f) => <option key={f}>{f}</option>)}
                  </select>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="Länge cm" className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2" />
                  <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Gewicht g" className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2" />
                </div>

                <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2">
                  <option value="">Angelart wählen</option>
                  <option>Spinnfischen</option>
                  <option>Grund</option>
                  <option>Pose</option>
                  <option>Fliege</option>
                </select>

                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2">
                  <option>Entnommen</option>
                  <option>Zurückgesetzt</option>
                </select>

                <input value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="Stelle (z.B. Unter der Brücke)" className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2" />

                <input value={waterTemp} onChange={(e) => setWaterTemp(e.target.value)} placeholder="Wassertemperatur °C" className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2" />

                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notizen" className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2" />

                <div className="space-y-1">
                  <p className="text-gray-400 text-xs">🕒 Zeitpunkt</p>
                  <input type="datetime-local" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2" />
                </div>

                <div className="space-y-1">
                  <p className="text-gray-400 text-xs">📍 GPS Koordinaten</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editLat} onChange={(e) => setEditLat(e.target.value)} placeholder="Breitengrad" type="number" step="any" className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2 text-sm" />
                    <input value={editLon} onChange={(e) => setEditLon(e.target.value)} placeholder="Längengrad" type="number" step="any" className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2 text-sm" />
                  </div>
                  <button
                    onClick={() => {
                      if (!navigator.geolocation) return;
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setEditLat(pos.coords.latitude.toString());
                        setEditLon(pos.coords.longitude.toString());
                      });
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-xl text-sm transition"
                  >
                    📍 Aktuellen Standort verwenden
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-gray-400 text-xs">📸 Foto</p>
                  {(editImagePreview || editImageUrl) && (
                    <div className="relative">
                      <img src={editImagePreview || editImageUrl!} alt="Vorschau" className="w-full rounded-xl object-cover max-h-48" />
                      <button
                        onClick={() => { setEditImageFile(null); setEditImagePreview(null); setEditImageUrl(null); }}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
                      >✕</button>
                    </div>
                  )}
                  <label className="w-full bg-gray-700 border border-gray-600 border-dashed rounded-xl p-4 flex flex-col items-center gap-1 cursor-pointer hover:bg-gray-600 transition">
                    <span className="text-2xl">📸</span>
                    <span className="text-gray-400 text-sm">{editImageUrl || editImagePreview ? "Foto ersetzen" : "Foto hinzufügen"}</span>
                    <input type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" />
                  </label>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => saveEdit(c.id)} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl transition">
                    💾 Speichern
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-xl transition">
                    Abbrechen
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-bold text-lg">
                      {c.fish || "-"}
                      {c.sub_fish && <span className="text-gray-400 font-normal text-sm ml-2">{c.sub_fish}</span>}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {c.length_cm ? `📏 ${c.length_cm} cm` : ""}
                      {c.weight_g ? `  ⚖️ ${c.weight_g} g` : ""}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.status === "Zurückgesetzt"
                      ? "bg-blue-600/20 text-blue-400"
                      : "bg-orange-600/20 text-orange-400"
                  }`}>
                    {c.status || "-"}
                  </span>
                </div>

                {getLocation(c) && <p className="text-gray-400 text-sm">📍 {getLocation(c)}</p>}

                <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                  {c.method && <span>🎣 {c.method}</span>}
                  {c.bait && <span>🪱 {c.bait}</span>}
                  {c.water_temp && <span>💧 {c.water_temp}°C Wasser</span>}
                  {c.temperature && <span>🌡️ {c.temperature}°C Luft</span>}
                  {c.pressure && <span>💨 {c.pressure} hPa</span>}
                  {c.weather && <span>🌦️ {c.weather}</span>}
                </div>

                {c.latitude && c.longitude && (
                  <p className="text-gray-600 text-xs">🛰️ {Number(c.latitude).toFixed(5)}, {Number(c.longitude).toFixed(5)}</p>
                )}

                {c.notes && <p className="text-gray-500 text-sm italic">"{c.notes}"</p>}

                <p className="text-gray-600 text-xs">{formatTime(c.created_at)}</p>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => startEdit(c)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl text-sm transition">
                    ✏️ Bearbeiten
                  </button>
                  <button onClick={() => deleteCatch(c.id)} className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 py-2 rounded-xl text-sm transition">
                    🗑️ Löschen
                  </button>
                </div>

                {c.latitude && c.longitude && (
                  <button
                    onClick={() => openInMaps(c.latitude, c.longitude, c.fish)}
                    className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 py-2 rounded-xl text-sm transition"
                  >
                    🗺️ In Maps öffnen
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CatchesPage() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-400">Laden...</div>}>
      <CatchesContent />
    </Suspense>
  );
}