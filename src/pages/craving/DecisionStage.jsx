import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import PremiumGlassCard from '../../components/PremiumGlassCard'
import { useAuth } from '../../lib/AuthContext'
import { logCraving, recordSmoke, restartStreak } from '../../lib/firestore'

const REASONS = ['stress', 'habit', 'social', 'boredom']

export default function DecisionStage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [outcome, setOutcome] = useState(null) // null | 'resisted' | 'smoked' | 'logged'
  const [confirmedSmoked, setConfirmedSmoked] = useState(false)
  const [count, setCount] = useState(1)
  const [reason, setReason] = useState('habit')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { overLimit, rate, amount, totalToday, limit }
  const [streakChoice, setStreakChoice] = useState(null) // null | 'restart' | 'keep'

  async function handleResisted() {
    setOutcome('resisted')
    if (user) {
      try { await logCraving(user.uid, { outcome: 'resisted' }) }
      catch (err) { console.error('Failed to log resisted craving:', err) }
    }
  }

  if (outcome === 'resisted') {
    return (
      <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2
          return (
            <motion.span
              key={i}
              className="absolute w-2 h-2 rounded-full bg-mint"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: Math.cos(angle) * 160, y: Math.sin(angle) * 160, opacity: 0, scale: 0.3 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          )
        })}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 12 }} className="text-6xl mb-6 relative z-10">
          🛡️
        </motion.div>
        <h2 className="text-white font-display text-xl mb-1 relative z-10">{t('craving.resultResistedTitle')}</h2>
        <p className="text-white/50 text-sm mb-8 relative z-10">{t('craving.resultResistedSub')}</p>
        <button onClick={() => navigate('/dashboard')} className="rounded-xl px-6 py-3 text-sm font-semibold text-black bg-mint relative z-10">
          {t('craving.backToDashboard')}
        </button>
      </div>
    )
  }

  if (outcome === 'smoked' || outcome === 'logged') {
    return (
      <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-6 relative">
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ filter: 'grayscale(1)' }}
        />
        <AnimatePresence mode="wait">
          {outcome === 'smoked' ? (
            <motion.div key="shatter" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }}
              transition={{ duration: 1.1, times: [0, 0.6, 1] }}
              onAnimationComplete={() => setOutcome('logged')}
              className="relative z-10 text-7xl">
              💔
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
              <PremiumGlassCard glow="none" padding="p-7" className="bg-white/[0.03]">
                <h2 className="text-white font-display text-lg mb-1">{t('craving.resultSmokedTitle')}</h2>
                <p className="text-white/40 text-sm mb-5">{t('craving.resultSmokedSub')}</p>

                <label className="text-sm text-white/60 block mb-1">{t('craving.howMany')}</label>
                <input
                  type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white font-num mb-4 outline-none"
                />

                <label className="text-sm text-white/60 block mb-1">{t('craving.reason')}</label>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {REASONS.map((r) => (
                    <button key={r} onClick={() => setReason(r)}
                      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                        reason === r ? 'border-white/60 text-white' : 'border-white/10 text-white/50'
                      }`}>
                      {t(`onboarding.triggers.${r}`)}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 mb-4 text-sm text-white/60">
                  <input
                    type="checkbox"
                    checked={confirmedSmoked}
                    onChange={(e) => setConfirmedSmoked(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5"
                  />
                  {t('craving.confirmSmokedCheckbox')}
                </label>

                {!result ? (
                  <button
                    onClick={async () => {
                      if (!user || submitting || !confirmedSmoked) return
                      setSubmitting(true)
                      try {
                        const r = await recordSmoke(user.uid, { count, reason })
                        setResult(r)
                      } catch (err) {
                        console.error('Failed to log smoke:', err)
                      } finally {
                        setSubmitting(false)
                      }
                    }}
                    disabled={submitting || !confirmedSmoked}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-black bg-white disabled:opacity-50"
                  >
                    {submitting ? '…' : t('craving.confirm')}
                  </button>
                ) : result.overLimit ? (
                  <div className="text-center">
                    <p className="text-stage-early font-num text-2xl font-semibold mb-1">
                      -{(result.rate * 100).toFixed(0)}% (${result.amount.toFixed(2)})
                    </p>
                    <p className="text-white/40 text-xs mb-4">
                      {t('craving.overLimit', { total: result.totalToday, limit: result.limit })}
                    </p>

                    {!streakChoice ? (
                      <>
                        <p className="text-white/60 text-sm mb-3">{t('craving.restartStreakQuestion')}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await restartStreak(user.uid)
                              setStreakChoice('restart')
                            }}
                            className="flex-1 rounded-xl py-3 text-sm font-semibold text-black bg-white"
                          >
                            {t('craving.restartYes')}
                          </button>
                          <button
                            onClick={() => setStreakChoice('keep')}
                            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white border border-white/20"
                          >
                            {t('craving.restartNo')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full rounded-xl py-3 text-sm font-semibold text-black bg-white mt-4"
                      >
                        {t('craving.backToDashboard')}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-mint font-num text-lg font-semibold mb-1">
                      {t('craving.withinLimit', { total: result.totalToday, limit: result.limit })}
                    </p>
                    <p className="text-white/40 text-xs mb-4">{t('craving.noPenalty')}</p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full rounded-xl py-3 text-sm font-semibold text-black bg-white"
                    >
                      {t('craving.backToDashboard')}
                    </button>
                  </div>
                )}
              </PremiumGlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-6 gap-4">
      <h2 className="text-white font-display text-xl mb-4">{t('craving.decisionTitle')}</h2>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleResisted}
        className="w-full max-w-xs rounded-2xl py-5 text-base font-semibold text-black"
        style={{ background: 'linear-gradient(135deg,#30D158,#1B6E33)' }}
      >
        {t('craving.resisted')}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setOutcome('smoked')}
        className="w-full max-w-xs rounded-2xl py-5 text-base font-semibold text-white border border-white/20"
      >
        {t('craving.smoked')}
      </motion.button>
    </div>
  )
}