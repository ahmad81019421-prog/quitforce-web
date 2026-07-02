# QuitForce Enforcement API (Vercel — free, no credit card)

This is a **separate, standalone deployable** from the main React app. It's a
single serverless function that runs the "did the user go quiet?" check and
applies a real penalty + push notification. It does not need a credit card
on Vercel, Firebase, or cron-job.org.

## What it does

1. Reads every onboarded user's `lastActiveAt` (set by the main app every
   time the Dashboard loads, and every 5 minutes while it stays open).
2. If a user has been silent for `INACTIVITY_HOURS` (default 24) and hasn't
   already been penalized for this specific silence window, it:
   - Deducts a real percentage of their wallet balance (same escalating
     5% / 10% / 20% rule as a self-reported relapse).
   - Logs an `inactivity-penalty` entry in their `cravingLogs` (shows up on
     the Stats page).
   - Sends them a real push notification via Firebase Cloud Messaging, with
     wording tailored to their `trigger` (stress/habit/social/boredom).
3. **Does NOT reset their quit streak.** Going quiet costs money — exactly
   like the brief asked for — but only a self-reported "I Smoked" resets the
   streak. Those are deliberately different consequences; explain this
   distinction if asked, it's a design choice, not an oversight.

## One-time setup (all free, no card anywhere)

### 1. Get a Firebase service account key
Firebase Console → Project settings → **Service accounts** tab → "Generate
new private key" → downloads a `.json` file. This is separate from (and free
regardless of) the Blaze plan — generating this key costs nothing and needs
no card.

### 2. Deploy this folder to Vercel
- Push this `enforcement-api/` folder to its own GitHub repo (or a subfolder
  of your existing one, importing just this folder as the Vercel "Root
  Directory").
- vercel.com → sign up with GitHub/email, no card required for the Hobby plan.
- Import the repo. In the project's Environment Variables, add:
  - `FIREBASE_SERVICE_ACCOUNT_KEY` — paste the entire downloaded JSON as one line
  - `CRON_SECRET` — make up any long random string
  - `INACTIVITY_HOURS` — `24` (or whatever you want for the demo, e.g. `1` to test fast)
- Deploy. You'll get a URL like `https://quitforce-enforcement.vercel.app`.

### 3. Schedule the check with cron-job.org (free, no card)
- Sign up at cron-job.org (email only).
- Create a new cron job:
  - URL: `https://quitforce-enforcement.vercel.app/api/check-inactivity?secret=YOUR_CRON_SECRET`
  - Schedule: every hour (or every 15 min while testing)
- Save. That's it — it's now running for real, for free, forever.

### 4. Get the VAPID key for push notifications (back in the main app)
Firebase Console → Project settings → **Cloud Messaging** tab → "Web Push
certificates" → Generate key pair → copy it into the main app's `.env` as
`VITE_FCM_VAPID_KEY`, and paste your Firebase web config values into
`public/firebase-messaging-sw.js` in the main `quitforce-web` project.

## Testing it without waiting 24 hours

Temporarily set `INACTIVITY_HOURS=0` in the Vercel env vars and redeploy
(or just hit the URL manually with `&secret=...` in a browser) — every
onboarded user with a `lastActiveAt` older than "right now" will get
penalized immediately, so you can demo it live.

## Platform note

Push notifications work out of the box on Android and desktop browsers.
On iOS, Web Push only works if the user has installed the site to their
Home Screen (Add to Home Screen) and is on iOS 16.4+ — this is an Apple
platform restriction, not something this project can work around.
