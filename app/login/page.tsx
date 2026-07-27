"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { Fish } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    setError("");
    setResetMsg("");
    if (!email) {
      setError("Bitte zuerst deine Email oben eingeben ☝️");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      setError("Reset-Mail konnte nicht gesendet werden: " + error.message);
      return;
    }
    // Aus Datenschutzgründen gibt Supabase auch bei unbekannter Email Erfolg zurück
    setResetMsg("📧 Falls ein Konto zu dieser Email existiert, ist ein Reset-Link unterwegs. Schau auch im Spam nach.");
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    // Alte tokens löschen
    Object.keys(localStorage).forEach(key => localStorage.removeItem(key));

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email oder Passwort falsch ❌");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  };

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl p-3 placeholder-gray-600";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto">
            <Fish className="w-7 h-7 text-teal-400" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Fishing App</h1>
          <p className="text-gray-400 text-sm">Melde dich an um fortzufahren</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-gray-400 text-sm">Email</label>
            <input
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label className="text-gray-400 text-sm">Passwort</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {resetMsg && (
            <p className="text-green-400 text-sm">{resetMsg}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-4 rounded-2xl text-lg transition"
          >
            {loading ? "Anmelden…" : "Anmelden"}
          </button>

          <div className="text-center">
            <button
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="text-gray-400 hover:text-gray-200 text-sm transition disabled:text-gray-600"
            >
              {resetLoading ? "⏳ Sende Reset-Link..." : "Passwort vergessen?"}
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-gray-500 text-sm">
              Noch kein Account?{" "}
              <Link href="/register" className="text-teal-400 hover:text-teal-300 transition">
                Jetzt registrieren
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}