"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

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
      setAvatarUrl(profile.avatar_url || null);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = () => {
        const maxSize = 400;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
      };
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const compressed = await compressImage(file);
    const fileName = `${user.id}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, compressed, { contentType: "image/jpeg" });

    if (uploadError) {
      alert("Upload fehlgeschlagen: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

    await supabase.from("profiles").upsert({
      id: user.id,
      avatar_url: data.publicUrl,
      updated_at: new Date().toISOString(),
    });

    setAvatarUrl(data.publicUrl);
    setUploading(false);
  };

  const removeAvatar = async () => {
    if (!confirm("Profilbild wirklich entfernen?")) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("profiles").upsert({
      id: user.id,
      avatar_url: null,
      updated_at: new Date().toISOString(),
    });

    setAvatarUrl(null);
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

  const requestPasswordReset = async () => {
    setResetLoading(true);
    setResetMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setResetMessage("❌ Fehler: " + error.message);
    } else {
      setResetMessage("✅ E-Mail mit Passwort-Reset Link wurde an " + email + " gesendet!");
    }

    setResetLoading(false);
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

      {/* AVATAR */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profilbild"
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl">
              👤
            </div>
          )}
          <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition">
            <span className="text-sm">📸</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
        </div>

        {uploading && <p className="text-gray-400 text-sm">⏳ Wird hochgeladen...</p>}

        {avatarUrl && !uploading && (
          <button
            onClick={removeAvatar}
            className="text-red-400 text-xs hover:text-red-300 transition"
          >
            ✕ Bild entfernen
          </button>
        )}

        <p className="text-gray-400 text-sm">{email}</p>
      </div>

      {/* PROFIL DATEN */}
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

      {/* PASSWORT RESET */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-gray-400 text-xs uppercase tracking-wider">🔒 Sicherheit</p>
        <p className="text-gray-400 text-sm">
          Du möchtest dein Passwort ändern? Wir senden dir eine E-Mail mit einem Link zum Zurücksetzen.
        </p>

        <button
          onClick={requestPasswordReset}
          disabled={resetLoading}
          className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white py-3 rounded-xl transition"
        >
          {resetLoading ? "⏳ Wird gesendet..." : "📧 Neues Passwort anfordern"}
        </button>

        {resetMessage && (
          <p className={`text-sm text-center ${resetMessage.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
            {resetMessage}
          </p>
        )}
      </div>

    </div>
  );
}