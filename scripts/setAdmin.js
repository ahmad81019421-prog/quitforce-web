/**
 * Promotes a user to QuitForce admin by setting a custom claim
 * { role: 'admin' } on their Firebase Auth user. The AuthContext in
 * the web app reads this claim via getIdTokenResult() and exposes it
 * as `role`; the AdminRoute component redirects non-admins away
 * from /admin.
 *
 * Usage:
 *   1. Place a service account JSON somewhere safe.
 *   2. `FIREBASE_SERVICE_ACCOUNT_KEY=$(cat /path/to/key.json) npm run set-admin -- <UID>`
 *
 * Re-running this on an existing admin is safe — it's idempotent.
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
if (!rawKey) {
  console.error('Missing env var FIREBASE_SERVICE_ACCOUNT_KEY.')
  console.error('Generate one from Firebase Console → Project settings → Service accounts → Generate new private key, then:')
  console.error('  FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) npm run set-admin -- <UID>')
  process.exit(1)
}

const uid = process.argv[2]
if (!uid) {
  console.error('Usage: npm run set-admin -- <UID>')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(rawKey)) })

const auth = getAuth()
await auth.setCustomUserClaims(uid, { role: 'admin' })
console.log(`✓ User ${uid} is now an admin. They must sign out + back in for the claim to take effect.`)
