/**
 * Generates /public/firebase-messaging-sw.js from .env so the service
 * worker can read the Firebase web config without import.meta.env.
 *
 * Run before every deploy: `npm run build:sw`
 * (Already wired into `npm run build` via the "prebuild" hook in package.json.)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// Load .env (silently fail if missing — the script will just emit placeholders).
if (existsSync(resolve(projectRoot, '.env'))) {
  loadEnv({ path: resolve(projectRoot, '.env') })
}

const envNames = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
]

const values = Object.fromEntries(
  envNames.map((k) => [k, process.env[k] || `__${k.replace(/^VITE_/, '')}__`])
)

const swPath = resolve(projectRoot, 'public', 'firebase-messaging-sw.js')

let tpl = readFileSync(swPath, 'utf8')
tpl = tpl
  .replace(/__FIREBASE_API_KEY__/g, values.VITE_FIREBASE_API_KEY)
  .replace(/__FIREBASE_AUTH_DOMAIN__/g, values.VITE_FIREBASE_AUTH_DOMAIN)
  .replace(/__FIREBASE_PROJECT_ID__/g, values.VITE_FIREBASE_PROJECT_ID)
  .replace(/__FIREBASE_STORAGE_BUCKET__/g, values.VITE_FIREBASE_STORAGE_BUCKET)
  .replace(/__FIREBASE_MESSAGING_SENDER_ID__/g, values.VITE_FIREBASE_MESSAGING_SENDER_ID)
  .replace(/__FIREBASE_APP_ID__/g, values.VITE_FIREBASE_APP_ID)

writeFileSync(swPath, tpl)
console.log('[gen-sw] Wrote', swPath, 'with', values.VITE_FIREBASE_API_KEY === '__FIREBASE_API_KEY__' ? 'placeholders' : 'real values')
