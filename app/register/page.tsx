"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSetPassword = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Fehler: " + error.message);
      setLoading(false);
      return;
    }

    router.push("/");
  };

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl p-3 placeholder-gray-600";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
          <p className="text-5xl">🎣</p>
          <h1 className="text-2xl font-bold text-white">Willkommen!</h1>
          <p className="text-gray-400 text-sm">Lege dein Passwort fest</p>
        </div>

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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSetPassword}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl text-lg transition"
          >
            {loading ? "⏳ Wird gespeichert..." : "✅ Passwort festlegen"}
          </button>
        </div>

      </div>
    </div>
  );
}