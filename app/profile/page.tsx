"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUsername(profile.username || "");
      setFullName(profile.full_name || "");
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        username,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      alert("Fehler: " + error.message);
    } else {
      setSuccess(true);
    }

    setSaving(false);
  };

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl p-3 placeholder-gray-600";
  const labelClass = "text-gray-400 text-sm";

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">

      <div className="pt-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition"
        >
          ← Zurück
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-4xl">
          👤
        </div>
        <p className="text-gray-400 text-sm">{email}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className={labelClass}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="z.B. DerAngler"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Vollständiger Name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="z.B. Max Mustermann"
            className={inputClass}
          />
        </div>
      </div>

      {success && (
        <p className="text-green-400 text-sm text-center">✅ Profil gespeichert!</p>
      )}

      <button
        onClick={saveProfile}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl text-lg transition"
      >
        {saving ? "⏳ Wird gespeichert..." : "💾 Profil speichern"}
      </button>

    </div>
  );
}