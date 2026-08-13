# 05 · Setup, Build & Release (Bare RN)

For first-time native project generation and Firebase/native wiring, see
**[07 · Native Setup](07-NATIVE-SETUP.md)** — do that first.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node | 18+ |
| JDK | 17 (RN 0.74 requirement) |
| Android Studio | with SDK 34, NDK, emulator |
| Xcode | 15+ (macOS only), CocoaPods |
| Ruby | for CocoaPods |

---

## Daily development

```bash
npm install
cd ios && pod install && cd ..     # macOS only

npm start                          # Metro, terminal 1
npm run android                    # terminal 2
# or
npm run ios
```

Ships with `USE_MOCK=true`, so **every screen works before your backend exists** —
realistic fixtures, simulated latency, and a mock stream that drifts prices every 5s.
Sign in with any email/password.

---

## Environments

| Env | API | Mock | Build |
|---|---|---|---|
| Local | `10.0.2.2:8080` (emulator) | usually `true` | debug |
| Staging | staging host | `false` | internal release |
| Production | prod host, HTTPS/WSS | `false` | store release |

```bash
ENVFILE=.env.production npm run android
```

**`react-native-config` is build-time.** Editing `.env` and reloading Metro changes
nothing — rebuild.

---

## Host addresses that actually work

| Running on | Use |
|---|---|
| Android emulator | `http://10.0.2.2:8080` |
| iOS simulator | `http://localhost:8080` |
| Physical device | `http://<LAN-IP>:8080` (same Wi-Fi, plus cleartext config) |

---

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Metro bundler |
| `npm run android` / `ios` | build + launch |
| `npm run typecheck` | `tsc --noEmit` — run before every commit |
| `npm run lint` | ESLint |
| `npm run clean:android` | Gradle clean (fixes most build weirdness) |
| `npm run build:android` | release APK |
| `npm run bundle:android` | AAB for Play Store |

---

## Release checklist

- [ ] `USE_MOCK=false` in the production env file — **shipping mock data would display
      fabricated market numbers**, the worst possible bug in this app
- [ ] URLs are `https://` and `wss://`
- [ ] Cleartext/ATS development exceptions removed
- [ ] `npm run typecheck` and lint clean
- [ ] Version name + build number bumped
- [ ] Keystore (Android) / signing profile (iOS) configured, secrets not committed
- [ ] Push tested in all three states: foreground, background, killed
- [ ] Airplane-mode test: banner + cached data, no crash
- [ ] Backend-down test: error card with retry, no crash loop
- [ ] Disclaimer visible on Dashboard, Login, Settings
- [ ] Store listing describes analytics/education, not advice

---

## Common build failures

| Error | Fix |
|---|---|
| `Config.X` undefined | `dotenv.gradle` not applied / iOS run-script phase misplaced |
| Duplicate class, merge errors | `npm run clean:android` |
| `RNKeychain could not be found` | `cd ios && pod install` |
| Metro serving stale code | `npm start -- --reset-cache` |
| `TextEncoder is not defined` | `import './src/polyfills'` must be first in `index.js` |
| Gradle JDK error | must be JDK 17 for RN 0.74 |
