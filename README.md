# S-IT Hub

A phone app for the IT manager of a Tunisian public hospital: keep track of
**devices that are out for repair**, **late returns**, and the **papers** that
go with them.

It is **offline-first**: everything works with no internet and is saved on the
phone first. When there is internet, changes sync quietly to the cloud. Nothing
is ever lost and every delete can be undone for 10 seconds.

- One code base, **Android first** (iOS builds too).
- Languages: **Français (default), العربية, English** — switch any time, no
  restart. Arabic mirrors the layout right-to-left.
- Dates are `dd/mm/yyyy`. Money is TND with 3 decimals.
- Android 10+ (minSdk 26), 64-bit (arm64).

---

## What it does (and what it does not)

**Does:** device register, send a device to a repair company, expected return
date from the contract, late/urgent alerts, returned-device flow, loan of a
spare device, repair companies + contracts, papers (scan, keep, read the text),
CSV import from an existing list, a simple board, a voice/file assistant, local
notifications in each language, PDF export.

**Does not** (this is not the classmate app): no problem *reporting* by staff, no
write-off / disposal papers. The only shared idea is CSV import.

---

## Requirements

- Node 22+ (`node -v`)
- Java 17 + Android Studio (for a real phone build), or the free **Expo Go** app
  for a quick look (some native parts need a dev build — see below).

## Get it running

```powershell
cd sit-hub
npm install
npm run typecheck      # should be clean
npm start              # then press "a" for Android
```

For a full native build (camera scanner, ML Kit text reading, notifications):

```powershell
npx expo prebuild --clean
npm run android
```

### Packages

Versions are **pinned to Expo SDK 57** (`expo install --check` stays green):
Expo 57, React Native 0.86.3, React 19.2.3, Reanimated 4.5.1, worklets 0.10.1,
react-native-screens 4.26, safe-area-context 5.7. If you upgrade one, run
`npx expo install --check` and let it pick the versions it wants.

---

## Project layout

```
App.tsx                     providers, fonts, first-run demo data, notifications
src/
  theme/                    colours, spacing, text sizes, fonts (light/dark)
  i18n/                     fr.ts, ar.ts, en.ts  (all words live here only)
  db/                       SQLite open/migrate, tiny repo helpers
  data/                     demo seed + read queries (DeviceWithTrip, ...)
  store/                    settings (zustand) + loaded work data
  lib/                      dates, money, status helpers
  services/                 supabase, sync, notifications, speech, pdf, papers,
                            ocr, scanner, csv, ai, reminders, feedback
  components/               shared UI (Button, Card, Icon, ...) + SwipeRow,
                            Gradient, Logo, Motion, Confetti, ProgressBar,
                            StatTile, Mascot, AnimatedSplash
  navigation/               tabs + stack
  screens/                  the 16 screens
server/ai-proxy.mjs         local stand-in for the AI function (browser preview)
supabase/
  schema.sql                tables + RLS + storage bucket (mirror of the phone)
  functions/assistant/      AI edge function (key stays on the server)
scripts/gen-assets.js       regenerate placeholder chimes
scripts/gen-icons.js        draw the app icon / adaptive icon / splash
```

The classmate coffee page stays at the workspace root (`index.html`) and is
untouched.

---

## Cloud + AI (optional)

The app is fully usable with an empty cloud. To turn sync and the online
assistant on:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Deploy the assistant:
   ```powershell
   supabase functions deploy assistant
   supabase secrets set AI_API_KEY=... AI_MODEL=gpt-4o-mini AI_BASE_URL=https://api.openai.com/v1
   ```
4. Put the project URL and the **public anon key** in `app.json` under
   `expo.extra`:
   ```json
   "extra": { "supabaseUrl": "https://xxxx.supabase.co", "supabaseAnonKey": "eyJ...", "aiFunctionName": "assistant" }
   ```

The AI key is **never** in the app — the phone only sends a short text summary
of late/critical devices to the server function. The assistant always asks
before it opens a screen or changes anything.

Nova can answer questions from live inventory data, open devices and companies,
navigate to app sections, and prepare the existing send/return forms. The user
reviews and saves those forms; Nova cannot write app source code or run arbitrary
commands. Online answers require an OpenAI API key with available API credits;
the browser assistant links to OpenAI billing when the account has no credits.

### Try the real assistant in the browser (no phone needed)

The browser preview can talk to the real OpenAI assistant through the little
Node proxy in `server/ai-proxy.mjs` (it plays the part of the Supabase
function, so the key still never enters the app bundle).

1. Copy the example env file and add your key — **do not** paste the key into
   any chat, and do not commit this file (it is git-ignored):
   ```powershell
   copy .env.example .env.local
   # then edit .env.local and set OPENAI_API_KEY=sk-...
   ```
2. Start the proxy in one terminal:
   ```powershell
   npm run ai
   ```
   It prints `key: loaded ✓` when it can see the key.
3. Start the web app in another terminal, pointing it at the proxy:
   ```powershell
   $env:EXPO_PUBLIC_AI_PROXY = "http://localhost:8787"
   npm run web
   ```
   Without the proxy, the assistant still works for the built-in offline
   commands ("en retard", "الطوارئ", "INV-0012", "scan").

The same prompt and JSON contract live in both places:
`supabase/functions/assistant/index.ts` (production) and
`server/ai-proxy.mjs` (local preview).

### How sync behaves

- Newest `updated_at` wins for simple fields.
- Deletes are soft (`deleted_at`) and can be undone.
- Files (scanned papers) upload separately and retry; there is a Wi-Fi-only
  setting.
- One table failing to sync never stops the others.

---

## Languages

`fr.ts`, `ar.ts`, `en.ts` must always have the **same keys**. `fr.ts` is the
reference. Arabic is shown with a manually mirrored layout (flex direction,
text alignment) so it switches instantly with no app restart.

## Alerts and sounds

Each alert type has its own notification channel and its own sound:
`device_late`, `critical_waiting`, `due_tomorrow`, `contract_ending`, `done`,
`morning`, `sync_problem`, `success`, `error`, plus spoken ones. The placeholder
tones/voices come from `scripts/gen-assets.js`; replace them with real audio in
`assets/sounds/` when you have it.

## Accessibility

Buttons are at least 48 px, body text at least 16 px, and colour is never the
only signal (every colour also has an icon and a word). There is a
Reduce-motion switch and a larger text size in Settings.

---

## Testing it yourself

1. **First open** — the phone fills with demo data (6 departments, 40 devices,
   3 companies, 5 devices at companies incl. 2 late, 3 papers). Turn on
   airplane mode: it all still works.
2. **Send a device** — Today → tap a device → Send (3 taps). Pick the company,
   check the expected return date (from the contract), confirm.
3. **Late / urgent** — Today shows the late and urgent cards. Tap for details.
4. **Return** — swipe a card to mark it returned; or open the device → Return.
5. **Undo** — delete anything; a bar appears for 10 seconds with Undo.
6. **Language** — Settings → Français / العربية / English. Arabic mirrors with
   no restart.
7. **Scan a paper** — tap the big ＋ → Scan. Camera scans the page, finds the
   text, guesses the type/amount. Add it to a device or company.
8. **CSV import** — Settings → Import CSV. It matches on the inventory number
   and never deletes rows that are missing from the file.
9. **Assistant** — the mic button. Offline it understands a few commands
   ("en retard", "الطوارئ", "INV-0012", "scan"); online it uses the server
   function. It always asks first.
10. **Sync** — the little cloud badge shows pending changes; tap → Send now.

## Regenerating placeholder assets

```powershell
node scripts/gen-assets.js
```
