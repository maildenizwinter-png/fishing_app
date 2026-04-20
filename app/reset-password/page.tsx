"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl p-3 placeholder-gray-600";

  useEffect(() => {
    // Token aus URL Hash lesen und Session setzen
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          setError("Link ungültig oder abgelaufen ❌");
        } else {
          setReady(true);
        }
      });
    } else {
      setError("Kein gültiger Reset-Link ❌");
    }
  }, []);

  const handleReset = async () => {
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein ❌");
      return;
    }
    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben ❌");
      return;
    }

    setSaving(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Fehler: " + error.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
          <p className="text-5xl">🔑</p>
          <h1 className="text-2xl font-bold text-white">Neues Passwort</h1>
          <p className="text-gray-400 text-sm">Gib dein neues Passwort ein</p>
        </div>

        {success ? (
          <p className="text-green-400 text-center">✅ Passwort geändert! Du wirst weitergeleitet...</p>
        ) : !ready ? (
          <p className="text-gray-400 text-center">{error || "⏳ Link wird geprüft..."}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">Neues Passwort</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label className="text-gray-400 text-sm">Passwort bestätigen</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleReset}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl text-lg transition"
            >
              {saving ? "⏳ Wird gespeichert..." : "💾 Passwort speichern"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}