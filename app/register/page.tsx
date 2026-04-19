"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // Erst prüfen ob bereits eine Session existiert
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        return;
      }

      // token_hash aus URL Query Parametern lesen
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      console.log("token_hash:", tokenHash);
      console.log("type:", type);

      if (tokenHash && type === "invite") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

        if (error) {
          console.log("OTP Fehler:", error.message);
          setError("Ungültiger Einladungslink ❌");
        } else {
          setReady(true);
        }
      } else {
        setError("Ungültiger Einladungslink ❌");
      }
    };

    checkSession();
  }, []);

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

        {!ready && !error && (
          <p className="text-gray-400 text-sm text-center">⏳ Link wird überprüft...</p>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {ready && (
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

            <button
              onClick={handleSetPassword}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl text-lg transition"
            >
              {loading ? "⏳ Wird gespeichert..." : "✅ Passwort festlegen"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}