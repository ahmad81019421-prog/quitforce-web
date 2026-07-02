import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/AuthContext'
import { recordSmoke, recordNoSmoke, restartStreak } from '../lib/firestore'
import PremiumGlassCard from './PremiumGlassCard'

const REASONS = ['stress', 'habit', 'social', 'boredom']

export default function DailyCheckinModal({ onDone }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [step, setStep] = useState('ask') // ask | form | result
  const [count, setCount] = useState(1)
  const [reason, setReason] = useState('habit')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [streakChoice, setStreakChoice] = useState(null)

  async function handleNo() {
    if (!user || submitting) return
    setSubmitting(true)
    try {
      await recordNoSmoke(user.uid)
      onDone()
    } catch (err) {
      console.error('Failed to record no-smoke check-in:', err)
      setSubmitting(false)
    }
  }

  async function handleConfirmSmoked() {
    if (!user || submitting) return
    setSubmitting(true)
    try {
      const r = await recordSmoke(user.uid, { count, reason })
      setResult(r)
      setStep('result')
    } catch (err) {
      console.error('Failed to record smoke check-in:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="w-full max-w-sm"
        >
          <PremiumGlassCard glow="none" padding="p-7" className="bg-white/[0.04]">
            {step === 'ask' && (
              <>
                <h2 className="text-white font-display text-lg mb-1">{t('checkin.title')}</h2>
                <p className="text-white/40 text-sm mb-6">{t('checkin.subtitle')}</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleNo}
                    disabled={submitting}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-black"
                    style={{ background: 'linear-gradient(135deg,#30D158,#1B6E33)' }}
                  >
                    {submitting ? '…' : t('checkin.no')}
                  </button>
                  <button
                    onClick={() => setStep('form')}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white border border-white/20"
                  >
                    {t('checkin.yes')}
                  </button>
                </div>
              </>
            )}

            {step === 'form' && (
              <>
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

                <button
                  onClick={handleConfirmSmoked}
                  disabled={submitting}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-black bg-white disabled:opacity-50"
                >
                  {submitting ? '…' : t('craving.confirm')}
                </button>
              </>
            )}

            {step === 'result' && result && (
              <div className="text-center">
                {result.overLimit ? (
                  <>
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
                            onClick={async () => { await restartStreak(user.uid); setStreakChoice('restart') }}
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
                      <button onClick={onDone} className="w-full rounded-xl py-3 text-sm font-semibold text-black bg-white mt-2">
                        {t('craving.backToDashboard')}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-mint font-num text-lg font-semibold mb-1">
                      {t('craving.withinLimit', { total: result.totalToday, limit: result.limit })}
                    </p>
                    <p className="text-white/40 text-xs mb-4">{t('craving.noPenalty')}</p>
                    <button onClick={onDone} className="w-full rounded-xl py-3 text-sm font-semibold text-black bg-white">
                      {t('craving.backToDashboard')}
                    </button>
                  </>
                )}
              </div>
            )}
          </PremiumGlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}