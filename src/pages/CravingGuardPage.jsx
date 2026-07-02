import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import BreathingStage from './craving/BreathingStage'
import DistractionStage from './craving/DistractionStage'
import MiniTaskStage from './craving/MiniTaskStage'
import AccountabilityStage from './craving/AccountabilityStage'
import LossPreviewStage from './craving/LossPreviewStage'
import DecisionStage from './craving/DecisionStage'
import { useAuth } from '../lib/AuthContext'
import { getUserProfile, penaltyRateFor } from '../lib/firestore'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function CravingGuardPage() {
  const { user, streakDays: authStreakDays, profile } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const [trigger, setTrigger] = useState('habit')
  const [estimatedPenalty, setEstimatedPenalty] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    Promise.all([getUserProfile(user.uid), getDoc(doc(db, 'wallets', user.uid))])
      .then(([p, walletSnap]) => {
        if (cancelled) return
        if (p?.quitDate) {
          const days = Math.floor((Date.now() - new Date(p.quitDate).getTime()) / 86400000)
          setStreakDays(days)
        }
        if (p?.trigger) setTrigger(p.trigger)

        const balance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0
        const rate = penaltyRateFor(p?.penaltyCount || 0)
        setEstimatedPenalty(Math.round(balance * rate * 100) / 100)
      })
      .catch((err) => console.error('Failed to load craving-guard context:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user])

  // Prefer the freshly-loaded value from this page's effect, but fall back
  // to the live AuthContext streak if the effect hasn't resolved yet.
  const effectiveStreak = streakDays || authStreakDays

  // Stage 2 adapts to the smoking trigger identified at onboarding — per the
  // original spec: stress -> calming breathwork, habit -> focus game,
  // boredom -> physical micro-task, social -> accountability partner nudge.
  const STAGES =
    trigger === 'stress' ? ['breathing', 'stress-breathing', 'loss', 'decision']
    : trigger === 'boredom' ? ['breathing', 'task', 'loss', 'decision']
    : trigger === 'social' ? ['breathing', 'accountability', 'loss', 'decision']
    : ['breathing', 'distraction', 'loss', 'decision'] // habit (default)

  const step = STAGES[stepIndex]

  // useCallback keeps `next` referentially stable across renders, so child
  // effects depending on onComplete (e.g. DistractionStage's countdown)
  // don't re-fire on every parent re-render.
  const next = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, STAGES.length - 1))
  }, [STAGES.length])

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/40" />
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {step === 'breathing' && <BreathingStage onComplete={next} />}
        {step === 'stress-breathing' && (
          <BreathingStage onComplete={next} durationSeconds={90} subtitleKey="craving.breatheSubLong" />
        )}
        {step === 'distraction' && <DistractionStage onComplete={next} />}
        {step === 'task' && <MiniTaskStage onComplete={next} />}
        {step === 'accountability' && <AccountabilityStage onComplete={next} />}
        {step === 'loss' && <LossPreviewStage onComplete={next} walletPenalty={estimatedPenalty} streakDays={effectiveStreak} />}
        {step === 'decision' && <DecisionStage />}
      </motion.div>
    </AnimatePresence>
  )
}
