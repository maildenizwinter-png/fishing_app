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
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type === "invite") {
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
        setMode("signup");
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

  const handleSignUp = async () => {
    setLoading(true);
    setError("");

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

    if (data.session) {
      window.location.href = "/";
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl p-3 placeholder-gray-600";

  // ✨ BESTÄTIGUNGS-SEITE nach erfolgreicher Registrierung
  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">

          <div className="flex flex-col items-center gap-4">
            <img
              src="/admin-avatar.jpg"
              alt="Admin"
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-700 shadow-lg"
            />
            <h1 className="text-2xl font-bold text-white text-center">
              Ausgezeichnet – jetzt nur noch bestätigen!
            </h1>
            <p className="text-green-400 text-sm text-center">
              ✅ Registrierung erfolgreich! Bitte überprüfe deine E-Mails und bestätige deinen Account.
            </p>
          </div>

          <div className="text-center pt-4">
            <Link href="/login" className="text-blue-400 hover:text-blue-300 transition text-sm">
              ← Zurück zum Login
            </Link>
          </div>

        </div>
      </div>
    );
  }

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
        {mode === "signup" && (
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