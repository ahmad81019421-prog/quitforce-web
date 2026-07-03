/* eslint-disable no-undef */
// ⚠️ Service workers are plain static files served from /public — they
// can NOT read Vite's import.meta.env at runtime. Two options:
//   (a) Keep this file checked in with real Firebase web config values
//       pasted in (they're not secret — visible in browser network tab).
//   (b) Run `npm run build:sw` before deploying — it generates this
//       file from .env so the repo stays clean.
//
// Until you do one of the above, this SW will register but fail to
// initialize Firebase Messaging — the main app's messaging.js already
// no-ops gracefully when VITE_FCM_VAPID_KEY is missing, so this is fine
// for local development without push notifications.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// These placeholders are replaced by scripts/gen-sw.js during `npm run build:sw`.
// Replace them manually if you don't want to run the script.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAvKl66J1m99lBZn-Yqa1dUvwVpAUINBQU',
  authDomain: 'quitforce-4d280.firebaseapp.com',
  projectId: 'quitforce-4d280',
  storageBucket: 'quitforce-4d280.firebasestorage.app',
  messagingSenderId: '876124862054',
  appId: '1:876124862054:web:b9b2df3c460177e2885fa7'
}

try {
if (FIREBASE_CONFIG.apiKey.startsWith('__')) {    console.warn('[firebase-messaging-sw] Still using placeholders. Run `npm run build:sw` or paste real values into this file.')
  } else {
    firebase.initializeApp(FIREBASE_CONFIG)
    const messaging = firebase.messaging()

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || 'QuitForce'
      const body = payload.notification?.body || ''
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      })
    })
  }
} catch (err) {
  console.warn('[firebase-messaging-sw] Failed to initialize:', err.message)
}
