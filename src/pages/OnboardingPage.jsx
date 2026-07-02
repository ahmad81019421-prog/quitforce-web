import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import PremiumGlassCard from '../components/PremiumGlassCard'
import SignaturePad from '../components/SignaturePad'
import { useAuth } from '../lib/AuthContext'
import { completeOnboarding } from '../lib/firestore'

const TRIGGERS = ['stress', 'habit', 'social', 'boredom']

function classify({ cigsPerDay, yearsSmoking, trigger }) {
  if (trigger === 'stress') return 'stress_smoker'
  if (trigger === 'social') return 'social_smoker'
  if (cigsPerDay >= 20 || yearsSmoking >= 10) return 'heavy_addicted'
  return 'habit_smoker'
}

const PROFILE_COPY = {
  stress_smoker: { en: 'Stress Smoker', ar: 'مدخّن بسبب التوتر' },
  social_smoker: { en: 'Social Smoker', ar: 'مدخّن اجتماعي' },
  heavy_addicted: { en: 'Heavy Addicted', ar: 'إدمان مرتفع' },
  habit_smoker: { en: 'Habit Smoker', ar: 'مدخّن بالعادة' }
}

export default function OnboardingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState('assessment') // assessment -> scanning -> profile -> contract
  const [form, setForm] = useState({ cigsPerDay: 10, yearsSmoking: 3, pricePerPack: 5, trigger: 'habit' })
  const [deposit, setDeposit] = useState(50)
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const glowIntensity = Math.min(form.cigsPerDay / 40, 1) // darkens ambient as count rises

  function startAssessmentSubmit() {
    setStep('scanning')
    setTimeout(() => setStep('profile'), 2200)
  }

  const profileKey = classify(form)

  // Reject obviously invalid deposits (negative, NaN, or absurdly large).
  const depositValid = Number.isFinite(deposit) && deposit >= 0 && deposit <= 100000

  async function handleConfirmCommitment() {
    if (!user || saving || !signatureDataUrl || !depositValid) return
    if (deposit <= 0) {
      setError(t('onboarding.depositRequired'))
      return
    }
    setError('')
    setSaving(true)
    try {
      
      await completeOnboarding(user.uid, {
        cigsPerDay: form.cigsPerDay,
        yearsSmoking: form.yearsSmoking,
        pricePerPack: form.pricePerPack,
        trigger: form.trigger,
        profileType: profileKey,
        depositAmount: deposit,
        signatureDataUrl
      })
      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to save onboarding data:', err)
      setSaving(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full bg-black flex items-center justify-center px-6 py-10 transition-colors duration-700"
      style={{
        background: `radial-gradient(circle at 50% 0%, rgba(255,59,48,${0.08 + glowIntensity * 0.22}), transparent 60%), #000`
      }}
    >
      <AnimatePresence mode="wait">
        {step === 'assessment' && (
          <motion.div key="assessment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md">
            <PremiumGlassCard glow="danger" padding="p-8">
              <h1 className="font-display text-2xl font-semibold text-white mb-6">{t('onboarding.title')}</h1>

              <Field label={t('onboarding.cigsPerDay')} value={form.cigsPerDay} min={1} max={40}
                onChange={(v) => setForm((f) => ({ ...f, cigsPerDay: v }))} />
              <Field label={t('onboarding.yearsSmoking')} value={form.yearsSmoking} min={0} max={40}
                onChange={(v) => setForm((f) => ({ ...f, yearsSmoking: v }))} />
              <Field label={t('onboarding.pricePerPack')} value={form.pricePerPack} min={1} max={20} step={0.5}
                onChange={(v) => setForm((f) => ({ ...f, pricePerPack: v }))} prefix="$" />

              <p className="text-sm text-white/60 mt-5 mb-2">{t('onboarding.trigger')}</p>
              <div className="grid grid-cols-2 gap-2 mb-8">
                {TRIGGERS.map((tr) => (
                  <button
                    key={tr}
                    onClick={() => setForm((f) => ({ ...f, trigger: tr }))}
                    className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      form.trigger === tr
                        ? 'border-stage-early bg-stage-early/10 text-white'
                        : 'border-white/10 text-white/60 hover:border-white/25'
                    }`}
                  >
                    {t(`onboarding.triggers.${tr}`)}
                  </button>
                ))}
              </div>

              <button
                onClick={startAssessmentSubmit}
                className="w-full rounded-xl py-3 text-sm font-semibold text-black"
                style={{ background: 'linear-gradient(135deg,#FF3B30,#7A1410)' }}
              >
                {t('onboarding.next')}
              </button>
            </PremiumGlassCard>
          </motion.div>
        )}

        {step === 'scanning' && (
          <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6">
            <motion.div
              className="w-28 h-28 rounded-full border-2 border-stage-early"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              style={{ borderTopColor: 'transparent' }}
            />
            <p className="font-mono text-sm text-white/60 tracking-wide">{t('onboarding.generating')}</p>
          </motion.div>
        )}

        {step === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, rotateY: -30 }} animate={{ opacity: 1, rotateY: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }} className="w-full max-w-sm" style={{ perspective: 1000 }}>
            <PremiumGlassCard glow="danger" padding="p-8" className="text-center">
              <p className="text-xs uppercase tracking-widest text-white/40 mb-2">{t('onboarding.profileTitle')}</p>
              <h2 className="font-display text-3xl font-bold text-white mb-6">
                {PROFILE_COPY[profileKey][i18n.language === 'ar' ? 'ar' : 'en']}
              </h2>
              <div className="grid grid-cols-2 gap-3 text-left font-mono text-xs text-white/60 mb-8">
                <Stat label={t('onboarding.cigsPerDay')} value={form.cigsPerDay} />
                <Stat label={t('onboarding.yearsSmoking')} value={form.yearsSmoking} />
              </div>
              <button
                onClick={() => setStep('contract')}
                className="w-full rounded-xl py-3 text-sm font-semibold text-black"
                style={{ background: 'linear-gradient(135deg,#FFD700,#B8860B)' }}
              >
                {t('onboarding.signContract')}
              </button>
            </PremiumGlassCard>
          </motion.div>
        )}

        {step === 'contract' && (
          <motion.div key="contract" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md">
            <PremiumGlassCard glow="success" padding="p-8">
              <h2 className="font-display text-xl font-semibold text-white mb-4">{t('onboarding.signContract')}</h2>

              <label className="text-sm text-white/60 block mb-1">{t('onboarding.depositAmount')}</label>
              <input
                type="number" min={1} value={deposit} onChange={(e) => {
                  setDeposit(Number(e.target.value))
                  setError('')
                }}
                className={`w-full rounded-xl bg-white/5 border px-4 py-2.5 text-white font-num mb-1 outline-none ${
                  depositValid ? 'border-white/10 focus:border-mint' : 'border-stage-early'
                }`}
              />
              {(error || !depositValid) && (
                <p className="text-xs text-stage-early mb-3">{error || t('onboarding.depositInvalid')}</p>
              )}
              {!error && depositValid && <div className="mb-4" />}

              <p className="text-sm text-white/60 mb-2">{t('onboarding.signHere')}</p>
              <SignaturePad onChange={setSignatureDataUrl} height={180} />

              <button
                onClick={handleConfirmCommitment}
                disabled={saving || !signatureDataUrl || !depositValid}
                className="w-full rounded-xl py-3 text-sm font-semibold text-black mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#30D158,#1B6E33)' }}
              >
                {saving
                  ? '…'
                  : !signatureDataUrl
                    ? t('onboarding.signFirst')
                    : !depositValid
                      ? t('onboarding.depositInvalid')
                      : t('onboarding.confirmCommitment')}
              </button>
            </PremiumGlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, value, min, max, step = 1, onChange, prefix = '' }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-white/60">{label}</span>
        <span className="font-num text-white">{prefix}{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-stage-early"
      />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <p className="text-white/40 mb-0.5">{label}</p>
      <p className="text-white text-sm">{value}</p>
    </div>
  )
}
