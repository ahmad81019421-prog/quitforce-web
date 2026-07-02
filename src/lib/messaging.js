import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { app } from './firebase'
import { saveFcmToken } from './firestore'

let requestedThisSession = false

/**
 * Asks the browser for notification permission (only once per session to
 * avoid nagging), registers the FCM service worker, and saves the resulting
 * device token onto the user's profile so the Vercel inactivity-check
 * endpoint (see /enforcement-api) can push to them later.
 *
 * Silently no-ops on unsupported browsers/contexts (e.g. iOS Safari without
 * the site installed as a Home Screen app, or when VITE_FCM_VAPID_KEY isn't
 * configured yet) — this is expected, not a bug.
 */
export async function requestNotificationPermission(uid) {
  if (requestedThisSession) return
  requestedThisSession = true

  try {
    const supported = await isSupported()
    if (!supported) return
    if (!import.meta.env.VITE_FCM_VAPID_KEY) {
      console.warn('VITE_FCM_VAPID_KEY not set — skipping push notification setup.')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
      serviceWorkerRegistration: registration
    })

    if (token) await saveFcmToken(uid, token)

    // Foreground messages (app open in an active tab) — show a quick in-app toast-like alert.
    onMessage(messaging, (payload) => {
      console.log('Foreground push received:', payload)
    })
  } catch (err) {
    console.warn('Push notification setup skipped:', err.message)
  }
}
