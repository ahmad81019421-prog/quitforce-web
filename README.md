# QuitForce — Web (React + Tailwind + Framer Motion + Firebase)

Fully wired to real Firebase Auth + Firestore, plus a free, no-credit-card
**active enforcement pipeline** (push notifications + automatic financial
penalties for inactivity) deployed on Vercel + cron-job.org.

## Setup (main app)

```bash
npm install
cp .env.example .env   # fill in your Firebase project keys
npm run dev
```

In the Firebase console: enable **Email/Password** and **Google** under
Authentication, create a **Firestore** database, then deploy the included
security rules (`firestore.rules`, via Console → Firestore → Rules or
`firebase deploy --only firestore:rules`).

For the active-enforcement pipeline (push notifications + auto-penalty for
going quiet), see **`enforcement-api/README.md`** — it's a fully free setup,
no credit card needed anywhere (Vercel, Firebase service account, and
cron-job.org are all free for this scale of usage).

## Promoting a user to Admin

The `/admin` route is protected by a custom Auth claim `{ role: 'admin' }`.
To grant it to a user, grab their UID from Firebase Auth Console and run:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY=$(cat /path/to/service-account.json) npm run set-admin -- <UID>
```

The user must sign out and back in for the claim to take effect.

## Build pipeline

```bash
npm run build      # runs prebuild (gen-sw) + vite build
npm run build:sw   # generates /public/firebase-messaging-sw.js from .env
npm run preview    # serve the production build locally
```

## Data model (Firestore)

```
users/{uid}
  name, email, onboardingComplete
  cigsPerDay, yearsSmoking, pricePerPack, trigger, profileType
  depositAmount, quitDate              ← resets only on a self-reported relapse
  penaltyCount                          ← drives the escalating 5%/10%/20% rate
                                          (SERVER-ONLY WRITE — never client)
  lastActiveAt, lastInactivityPenaltyAt ← read by the Vercel enforcement job
  fcmToken                              ← push notification device token
  commitmentSignature                   ← PNG data URL + signedAt timestamp
                                          captured at onboarding via SignaturePad
  users/{uid}/cravingLogs/{id}
    outcome ('resisted' | 'smoked' | 'inactivity-penalty' | 'contacted-partner')
    count, reason, createdAt

wallets/{uid}
  balance, lockedAmount
  wallets/{uid}/transactions/{id}
    type ('deposit' | 'penalty' | 'reward'), amount, rate, createdAt

posts/{id}
  uid, name, text, likedBy[], commentsCount, createdAt
```

## Security model (firestore.rules)

- **Users**: signed-in users can read profiles (Admin aggregation needs it);
  only the owner can write, and only to a whitelist of fields.
  `penaltyCount` and `lastInactivityPenaltyAt` can NEVER be written from the
  client — they're reserved for Cloud Functions / the enforcement API.
- **Wallets**: owner-only read; balance updates from the client are
  temporarily allowed so the demo `recordRelapse` / `depositToWallet`
  flows work. TODO before scaling: move every wallet write to a Callable
  Cloud Function and tighten this rule to read-only.
- **Posts**: signed-in users can read; only the author can create/delete;
  updates are restricted to the `likedBy` field ONLY (anyone can like /
  unlike, nobody can rewrite someone else's text).
- **Admin**: route is guarded by `AdminRoute` which checks the user's
  custom claim `role === 'admin'` (set via `npm run set-admin`).

## The five reinforcement additions

### 1. Real escalating penalty (5% → 10% → 20%)
`recordRelapse()` in `src/lib/firestore.js` reads the user's real wallet
balance and `penaltyCount`, applies a percentage (not a flat dollar amount),
and shows the exact rate + amount deducted on the Decision screen. The same
rate logic is duplicated server-side in the enforcement API so inactivity
penalties escalate identically. Every write is now done in a single
`writeBatch` so two rapid relapses can't both see the same prior count.

### 2. Monthly calendar on the Dashboard
`src/components/MonthlyCalendar.jsx` — a real month grid colored per day from
actual `cravingLogs` (green = clean, red = relapse, dim = upcoming/before
quitDate). Tells the day-by-day story at a glance instead of just a counter.

### 3. Real weekly reduction plan (Quit Plan)
`src/components/QuitPlanCard.jsx` — computes a 4-week linear taper from the
user's real `cigsPerDay` (e.g. 20 → 15 → 10 → 5 → 0), highlights the current
week against their real streak, and checks off completed weeks.

### 4. Active enforcement: push notifications + automatic penalty for going quiet
- `src/lib/messaging.js` + `public/firebase-messaging-sw.js`: real Firebase
  Cloud Messaging setup, asks permission once per session, saves the device
  token to the user's profile.
- The Dashboard pings `lastActiveAt` on load and every 5 minutes while open.
- A **separate, free Vercel serverless function** (`enforcement-api/`),
  triggered hourly by the free cron-job.org service, checks every user's
  `lastActiveAt`. If they've been silent past `INACTIVITY_HOURS` (default
  24), it deducts a real escalating-rate penalty from their wallet and sends
  them a real push notification — wording tailored to their `trigger`
  (stress/habit/social/boredom). Each user is processed in its own try/catch
  so one bad user can't abort the whole run.
- **Important distinction documented for the defense:** inactivity costs
  money but does **not** reset the quit streak — only a self-reported "I
  Smoked" does that. This is a deliberate design choice (going quiet isn't
  proof of relapse), not an oversight — see `enforcement-api/README.md`.

### 5. Craving Guard adapts to the user's real `profileType`/`trigger`
`CravingGuardPage.jsx` now picks Stage 2 based on what the user told the app
at onboarding, per the original spec:
- **stress** → a longer, deeper breathing lock (`BreathingStage` reused with
  `durationSeconds={90}`) instead of a game — calms the nervous system.
- **habit** → the existing shape-matching distraction game — breaks the
  automatic loop.
- **boredom** → `MiniTaskStage.jsx` — a short physical micro-task (stand up,
  stretch) instead of a screen-based game.
- **social** → `AccountabilityStage.jsx` — nudges the user to message a real
  support person instead of playing a game.

## Everything from the previous round (still real, still wired)

- Auth (Email/Password + Google), routes new users to Onboarding, returning
  users straight to Dashboard. `updateProfile` is now called on register so
  `user.displayName` is populated (used by Community posts).
- Onboarding writes the real profile + the user's signature (PNG data URL
  captured via `SignaturePad`) + creates the wallet with the initial deposit
  as a real transaction — all in one atomic `writeBatch`.
- Dashboard timer/savings/risk/streak computed live from `quitDate`.
- `streakDays` lives in `AuthContext` and flows into `StageProvider` so
  the ambient color is correct on every page, not just Dashboard.
- Wallet balance + transaction history as a live Firestore subscription
  (with skeleton-loading state while the doc resolves).
- Journey milestones marked achieved/locked against the real streak.
- Stats trend/heatmap/compliance derived from real `cravingLogs`. Day
  labels in the heatmap now localize via i18n.
- Community posts/likes as a real shared Firestore collection.
- Passport aggregates real totals + displays the user's commitment
  signature + exports a real PDF (`jsPDF`) on button click.
- Admin reads every user's profile client-side for total users / success
  rate / risk-bucket breakdown (documented as a demo-scale simplification).
  The route is protected by a custom-claim role check.
- Full Arabic/English with live RTL/LTR switching — no LTR→RTL flash on
  reload thanks to a pre-paint script in `index.html`.

## Code-splitting

Every protected page is `React.lazy`-loaded, and the heavy vendors
(Firebase, recharts, framer-motion, lucide-react) are split into separate
chunks via `manualChunks` in `vite.config.js`. Initial bundle is ~116 KB
gzipped (down from ~352 KB before splitting).

## Known simplifications (still true, still worth knowing for the defense)

- Wallet writes still happen from the client (gated by tight field-scoped
  rules). Move to Callable Cloud Functions before scaling.
- Admin aggregation is client-side — fine for a class demo, not production
  scale. Already capped at `limit(500)` to bound cost.
- iOS Web Push requires the site to be installed to the Home Screen
  (Apple's platform restriction, not something this project controls).
- The distraction mini-game's difficulty and the breathing lock's demo
  duration (30s vs. the spec's 10min) are tunable constants.
