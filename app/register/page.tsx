"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "invite" | "signup">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type === "invite") {
        // Einladungsmodus
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

        if (error) {
          setError("Ungültiger Einladungslink ❌");
        } else if (data.session) {
          setMode("invite");
        } else {
          setError("Session konnte nicht erstellt werden ❌");
        }
      } else {
        // Selbst-Registrierungsmodus
        setMode("signup");
      }
    };

    checkSession();
  }, []);

  // Einladungsmodus: Passwort für bestehenden User setzen
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

  // Selbst-Registrierung: Neuen User anlegen
  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben ❌");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError("Fehler: " + error.message);
      setLoading(false);
      return;
    }

    // Wenn Email-Bestätigung aktiv ist, kommt keine Session zurück
    if (data.session) {
      // Kein Bestätigungsschritt nötig – direkt einloggen
      window.location.href = "/";
    } else {
      setSuccess("✅ Registrierung erfolgreich! Bitte überprüfe deine E-Mails und bestätige deinen Account.");
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl p-3 placeholder-gray-600";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
          <p className="text-5xl">🎣</p>
          <h1 className="text-2xl font-bold text-white">
            {mode === "invite" ? "Willkommen!" : "Registrieren"}
          </h1>
          <p className="text-gray-400 text-sm">
            {mode === "invite" ? "Lege dein Passwort fest" : "Erstelle deinen Account"}
          </p>
        </div>

        {mode === "loading" && !error && (
          <p className="text-gray-400 text-sm text-center">⏳ Lädt...</p>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {success && (
          <p className="text-green-400 text-sm text-center">{success}</p>
        )}

        {/* EINLADUNGSMODUS */}
        {mode === "invite" && !error && (
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

        {/* SELBST-REGISTRIERUNG */}
        {mode === "signup" && !success && (
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
                placeholder="mind. 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              onClick={handleSignUp}
              disabled={loading || !email || !password}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl text-lg transition"
            >
              {loading ? "⏳ Registrieren..." : "✅ Account erstellen"}
            </button>

            <div className="text-center pt-2">
              <p className="text-gray-500 text-sm">
                Bereits registriert?{" "}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 transition">
                  Anmelden
                </Link>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}