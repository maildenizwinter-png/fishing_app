@AGENTS.md

# Fishing App – Projekt-Übergabe

## Über das Projekt
Digitales Angelbuch. User können Fangsessions starten, Fische mit Foto und GPS erfassen, Wetterdaten (Luftdruck, Temperatur) werden automatisch gespeichert und ausgewertet. Zeigt Karten, Statistiken, Verläufe. Admin kann alle User verwalten.

## Live-URL
- App: https://fishing-app-beta.vercel.app
- Repo: https://github.com/maildenizwinter-png/fishing_app
- Auto-Deploy: Push zu `main` → Vercel deployt automatisch

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Supabase (Datenbank + Auth + Storage)
- **Maps:** Leaflet + react-leaflet
- **Charts:** recharts
- **Excel Export:** xlsx (SheetJS)
- **Wetter API:** OpenWeatherMap
- **E-Mail (Passwort-Reset, Bestätigung):** Brevo SMTP (in Supabase konfiguriert)
- **Hosting:** Vercel

## Environment Variables (`.env.local`)
Die Datei `.env.local` ist über `.gitignore` ausgeschlossen und wird NICHT eingecheckt.
Benötigte Variablen (Werte siehe lokale `.env.local` bzw. Vercel-Projekt-Settings):

```
NEXT_PUBLIC_SUPABASE_URL=https://iawhknrsvruweoxjdoss.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase anon/publishable key>
NEXT_PUBLIC_WEATHER_API_KEY=<openweathermap key>
```

## Projekt-Struktur
```
app/
├── page.tsx                     Dashboard mit Pull-to-Refresh
├── layout.tsx                   Root Layout + BottomNav + ImpersonateBanner
├── session/page.tsx             Session starten/stoppen (mit Nachtragen-Option)
├── sessions/page.tsx            Session-Liste (editierbar: Start/Ende/Ort/Begleiter)
├── sessions/[id]/page.tsx       Session-Detail: Toggle Luftdruck/Temperatur, Kartenansicht
├── catches/page.tsx             Fänge-Liste mit Filter (Jahr, Gewässer, Status, Fischart)
│                                Highlight per URL-Parameter ?id=X
├── new/page.tsx                 Neuer Fang (mit GPS, Foto, Wetter)
├── stats/page.tsx               9 Charts + Excel Export + Karten-Link
├── map/page.tsx                 Karte aller Fänge (mit "Zum Fang" Button)
├── login/page.tsx               Login
├── register/page.tsx            Registrierung (Username Pflicht) + Einladungs-Modus
├── reset-password/page.tsx      Passwort zurücksetzen
├── profile/page.tsx             Profil (Avatar-Upload, Name, Passwort-Reset)
├── admin/page.tsx               Admin Dashboard (User-Liste + Impersonation)
└── components/
    ├── BottomNav.tsx            Nav-Leiste (Admin-Tab nur für Admins)
    ├── ImpersonateBanner.tsx    Gelber Banner beim Impersonieren
    ├── MapView.tsx              Alle Fänge auf Karte
    └── SessionMap.tsx           Session-Karte mit Route
lib/
├── supabaseClient.ts            Supabase Client
└── getUserId.ts                 Helper: getActiveUserId() + getUserFilter()
public/
└── admin-avatar.jpg             Bild des Admins (auf Registrierungs-Bestätigung)
middleware.ts                     DEAKTIVIERT (returns NextResponse.next())
```

## Datenbank (Supabase)
### Tabellen
- **profiles:** id (uuid, FK→auth.users), username, full_name, avatar_url, role ('user'|'admin'), created_at, updated_at
- **sessions:** id, start_time, end_time, location, companion, temperature, pressure, weather, latitude, longitude, user_id (FK→auth.users)
- **catches:** id, created_at, fish, sub_fish, length_cm, weight_g, method, bait, status, location_detail, water_temp, notes, image_url, session_id (NULLABLE, FK→sessions), user_id, temperature, pressure, weather, latitude, longitude, **is_foreign** (bool, default false – Begleiter-Fang), **angler_name** (text, NULLABLE – wer gefangen hat)
- **session_logs:** id, session_id (FK→sessions, CASCADE), created_at, latitude, longitude, temperature, pressure, weather

### Storage Buckets
- `catch-images` – public
- `avatars` – public

### Wichtige SQL Funktionen
```sql
-- Rekursions-freie Admin-Prüfung
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'); $$;

-- Auto-Erstellung von profiles bei neuer Registrierung
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, created_at, updated_at)
  VALUES (NEW.id, 'user', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### RLS Policies
- User: `auth.uid() = user_id` (sehen nur eigene Daten)
- Admin: `is_admin()` (sieht alle Daten)
- profiles: `admin read all profiles` (via is_admin)

## User & Rollen
- **Admin (Deniz Winter):** UUID `6f1e8ca7-834c-4a1a-b943-db5eb9a90ea6` – role = 'admin'
- **Demo User (Deniz Schneider):** UUID `3ab1ac06-3acb-4b58-85b5-f0e9e43fe594`
- Neue User werden über Selbst-Registrierung angelegt (mit Email-Bestätigung)

## Admin-System (Impersonation)
- Admin sieht in Stats **alle User-Daten kombiniert**
- Admin kann in `/admin` einen User auswählen und als dieser agieren
- Impersonation über `localStorage.impersonateUserId`
- Helper `getUserFilter()` in `lib/getUserId.ts`:
  - mode "all" = kein Filter (Admin ohne Impersonation)
  - mode "user" = filter auf spezifische user_id

## Wichtige Design-Entscheidungen
- **Middleware disabled** – Auth-Check erfolgt in jeder Page mit Redirect auf `/login`
- **`createClient` nicht `createBrowserClient`** – letzterer verursachte Login-Hänger
- **Session-Ende hat kein GPS** – letzter session_log wird als Ende-Pin verwendet
- **Fang ohne Session möglich** – session_id ist NULLABLE
- **Bilder werden komprimiert** – Fangfotos max 1200px, Avatars max 400x400
- **Email-Templates** nutzen `{{ .TokenHash }}` + `verifyOtp({token_hash, type})` Pattern
- **Begleiter-Fänge** (`is_foreign = true`): Fänge von Angel-Begleitern. Gehören dem
  eingeloggten User (`user_id` = ich), sind aber als fremd markiert. Werden **überall**
  aus der eigenen Auswertung ausgeschlossen (Fisch-Zähler, „Letzter Fang", 9 Charts).
  Separate Auswertung in `/stats` (Sektion „👥 Begleiter-Auswertung") + Filter in
  `/catches` (Meine/Begleiter/Alle) + Umschalter auf der Karte. `angler_name` wird beim
  Erfassen aus bereits vergebenen Namen vorgeschlagen (gleiche Schreibweise → matchbar).

## Bekannte Themen / Offene Punkte
- Impersonate-Banner spinnt manchmal (kommt nicht immer, bleibt nach Logout sichtbar) – ist noch nicht sauber gefixt
- PWA-Icons/Manifest noch nicht optimiert
- Push-Notifications sind noch nicht implementiert

## Deploy Workflow
```bash
git add .
git commit -m "Beschreibung der Änderung"
git push
```
→ Vercel deployt automatisch nach ca. 1-2 Minuten

## Supabase Keep-Alive (verhindert Pausieren)
Status: ✅ AKTIV (eingerichtet & erfolgreich getestet am 2026-07-27).
Supabase Free-Tier pausiert Projekte nach 7 Tagen Inaktivität → man muss sich
sonst manuell im Dashboard einloggen und reaktivieren.
Gelöst per GitHub-Actions Cron-Ping (kein Vercel, kostenlos, keine App-Änderung):
- Workflow: `.github/workflows/keep-alive.yml`
- Läuft täglich um 06:17 UTC (+ manuell via Actions-Tab, `workflow_dispatch`)
- Macht eine winzige `SELECT`-Anfrage an die Supabase REST-API → zählt als Aktivität
- Benötigt zwei **GitHub Repo-Secrets** (Settings → Secrets and variables → Actions):
  - `SUPABASE_URL` = `https://iawhknrsvruweoxjdoss.supabase.co`
  - `SUPABASE_ANON_KEY` = der publishable Anon-Key (siehe `.env.local`)
- `curl --fail` → Job schlägt fehl (GitHub-Mail) wenn der Ping kaputt ist
- Achtung: Ein **bereits pausiertes** Projekt weckt der Ping NICHT auf → einmalig
  im Dashboard reaktivieren, danach hält der tägliche Ping es wach
- GitHub deaktiviert Cron-Workflows nach 60 Tagen komplett ohne Repo-Aktivität

## Feature-Historie (chronologisch)
1. Grundstruktur mit Dashboard, Fang-Erfassung, Session-Tracking
2. Supabase Auth + Login/Register/Reset
3. Fotos + GPS für Fänge + Wetter-Integration
4. Sessions-Detail mit Luftdruck-/Temperatur-Chart (Toggle)
5. Kartenansicht aller Fänge + Session-Karte mit Route
6. Statistiken mit 9 Charts + Excel Export
7. Pull-to-Refresh
8. Admin-System mit Impersonation
9. Selbst-Registrierung
10. Profilbild-Upload + Passwort-Reset im Profil
11. "Zum Fang"-Navigation von Karte zu Fänge-Seite
12. Begleiter-Fänge: fremde Fänge erfassen (is_foreign/angler_name), getrennt auswerten

## Wichtig für nächste Iteration
- **Immer** aktuellen Code der zu ändernden Datei lesen (kein Blind-Editieren)
- **Immer** nach Änderung testen ob Build erfolgreich ist
- Bei `useSearchParams` immer `<Suspense>` Boundary verwenden (Next.js 15+)
- Bei RLS-Änderungen auf Rekursions-Fehler achten – lieber SECURITY DEFINER Function nutzen
