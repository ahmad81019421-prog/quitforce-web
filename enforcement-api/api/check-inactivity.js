const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  })
}

const db = admin.firestore()
const messaging = admin.messaging()

const INACTIVITY_HOURS = Number(process.env.INACTIVITY_HOURS || 24)
const MIN_HOURS_BETWEEN_PENALTIES = INACTIVITY_HOURS - 2 // guards against double-charging on every hourly cron tick

// Same escalating-rate logic as the client (src/lib/firestore.js#penaltyRateFor)
// — kept in sync manually since this runs in a separate deployable.
function penaltyRateFor(priorPenaltyCount) {
  if (priorPenaltyCount >= 2) return 0.20
  if (priorPenaltyCount === 1) return 0.10
  return 0.05
}

const NOTIFICATION_COPY = {
  stress: {
    title: 'QuitForce — checking in',
    body: "You haven't opened QuitForce today. If stress is building, this is exactly when the app helps most — come breathe through it."
  },
  habit: {
    title: 'QuitForce — your streak needs you',
    body: "It's been a day since you checked in. Don't let the habit loop win by default — open the app and log where you're at."
  },
  social: {
    title: 'QuitForce — your circle is waiting',
    body: "You've gone quiet for a day. A quick check-in keeps your accountability partner (and your wallet) on your side."
  },
  boredom: {
    title: 'QuitForce — don\u2019t drift',
    body: "A full day with no activity. Open QuitForce for two minutes — it's enough to keep your streak and your commitment alive."
  },
  default: {
    title: 'QuitForce — inactivity penalty applied',
    body: 'You missed a full day of check-ins, so a real penalty was deducted from your wallet. Open the app to see your progress.'
  }
}

function toMillis(ts) {
  if (!ts) return null
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  return new Date(ts).getTime()
}

module.exports = async (req, res) => {
  // Simple shared-secret check so random internet traffic can't trigger this.
  const provided = req.query.secret || req.headers['x-cron-secret']
  if (provided !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const now = Date.now()
  const inactivityMs = INACTIVITY_HOURS * 60 * 60 * 1000
  const cooldownMs = MIN_HOURS_BETWEEN_PENALTIES * 60 * 60 * 1000

  let usersSnap
  try {
    usersSnap = await db.collection('users').where('onboardingComplete', '==', true).get()
  } catch (err) {
    console.error('Failed to query users:', err.message)
    return res.status(500).json({ error: 'users_query_failed', message: err.message })
  }

  const results = []
  const errors = []

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id
    const user = userDoc.data()

    try {
      const lastActiveMs = toMillis(user.lastActiveAt)
      if (lastActiveMs === null) continue // never opened the app since onboarding — let the welcome flow handle that, not the penalty job
      if (now - lastActiveMs < inactivityMs) continue // still within the grace window

      const lastPenaltyMs = toMillis(user.lastInactivityPenaltyAt)
      if (lastPenaltyMs !== null && now - lastPenaltyMs < cooldownMs) continue // already penalized for this inactivity window

      const walletRef = db.collection('wallets').doc(uid)
      const walletSnap = await walletRef.get()
      const balance = walletSnap.exists ? (walletSnap.data().balance || 0) : 0
      const rate = penaltyRateFor(user.penaltyCount || 0)
      const amount = Math.round(balance * rate * 100) / 100

      const batch = db.batch()

      if (amount > 0) {
        batch.update(walletRef, { balance: admin.firestore.FieldValue.increment(-amount) })
        batch.set(walletRef.collection('transactions').doc(), {
          type: 'penalty',
          amount: -amount,
          reason: 'inactivity',
          rate,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }

      batch.update(userDoc.ref, {
        penaltyCount: admin.firestore.FieldValue.increment(1),
        lastInactivityPenaltyAt: admin.firestore.FieldValue.serverTimestamp()
        // Note: quitDate is intentionally NOT reset here. Going quiet on the
        // app costs you money, same as the spec asked for, but only a
        // self-reported relapse (DecisionStage -> recordRelapse) resets the
        // streak — those are deliberately different consequences.
      })
      batch.set(userDoc.ref.collection('cravingLogs').doc(), {
        outcome: 'inactivity-penalty',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })

      await batch.commit()

      if (user.fcmToken) {
        const copy = NOTIFICATION_COPY[user.trigger] || NOTIFICATION_COPY.default
        try {
          await messaging.send({
            token: user.fcmToken,
            notification: { title: copy.title, body: copy.body }
          })
        } catch (err) {
          // Push failure shouldn't fail the whole run — log + continue.
          console.error(`Push failed for ${uid}:`, err.message)
        }
      }

      results.push({ uid, penaltyRate: rate, penaltyAmount: amount })
    } catch (err) {
      // Per-user error isolation: one user's bad data / failed commit
      // must NOT abort the loop and skip every user after them.
      console.error(`Failed processing user ${uid}:`, err.message)
      errors.push({ uid, message: err.message })
    }
  }

  return res.status(200).json({
    checked: usersSnap.size,
    penalized: results.length,
    results,
    errors
  })
}
