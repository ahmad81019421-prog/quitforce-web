import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { getUserProfile, createUserProfile } from '../lib/firestore'
import LanguageSwitch from '../components/LanguageSwitch'

export default function AuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

async function routeAfterAuth(user) {
  const token = await user.getIdTokenResult()
  if (token.claims.role === 'admin') {
    navigate('/admin')
    return
  }
  const profile = await getUserProfile(user.uid)
  navigate(profile?.onboardingComplete ? '/dashboard' : '/onboarding')
}
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
     if (mode === 'login') {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await routeAfterAuth(cred.user)
}else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        // Persist the display name on the Auth user object itself, so
        // community posts and future `user.displayName` reads work
        // without an extra Firestore lookup.
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() })
        }
        await createUserProfile(cred.user.uid, {
          name: name.trim(),
          email,
          onboardingComplete: false
        })
        navigate('/onboarding')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

async function handleGoogle() {
  setError('')
  setLoading(true)
  try {
    const cred = await signInWithPopup(auth, googleProvider)
    const token = await cred.user.getIdTokenResult()

    if (token.claims.role === 'admin') {
      navigate('/admin')
      return
    }

    const existing = await getUserProfile(cred.user.uid)
    if (!existing) {
      await createUserProfile(cred.user.uid, {
        name: cred.user.displayName || '',
        email: cred.user.email,
        onboardingComplete: false
      })
    }
    await routeAfterAuth(cred.user)
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="relative min-h-screen w-full bg-black flex items-center justify-center px-6 overflow-hidden">
      {/* ambient mesh glow, neutral until a stage exists */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, rgba(191,90,242,0.18), transparent 55%), radial-gradient(circle at 80% 80%, rgba(255,59,48,0.12), transparent 50%)'
        }}
      />

      <div className="absolute top-6 inset-x-6 flex justify-between items-center">
        <span className="font-display font-semibold tracking-tight text-white/90">{t('app.name')}</span>
        <LanguageSwitch />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8"
      >
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white mb-1">
          {mode === 'login' ? t('auth.login') : t('auth.register')}
        </h1>
        <p className="text-sm text-white/50 mb-6">{t('auth.tagline')}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <AnimatePresence>
            {mode === 'register' && (
              <motion.input
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.name')}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--stage-color,#BF5AF2)] outline-none transition-colors"
              />
            )}
          </AnimatePresence>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email')}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--stage-color,#BF5AF2)] outline-none transition-colors"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.password')}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--stage-color,#BF5AF2)] outline-none transition-colors"
          />

          {error && <p className="text-xs text-stage-early">{error}</p>}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-xl py-3 text-sm font-semibold text-black mt-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #BF5AF2, #7C3AED)' }}
          >
            {loading ? '…' : mode === 'login' ? t('auth.login') : t('auth.register')}
          </motion.button>
        </form>

        <button
          onClick={handleGoogle}
          className="w-full mt-3 rounded-xl py-3 text-sm font-medium text-white/80 border border-white/10 hover:bg-white/5 transition-colors"
        >
          {t('auth.continueWithGoogle')}
        </button>

        <p className="text-center text-xs text-white/40 mt-6">
          {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-white/80 underline underline-offset-2"
          >
            {mode === 'login' ? t('auth.register') : t('auth.login')}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
