import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useStage } from '../../hooks/useStage'

const DEFAULT_SECONDS = 30 // demo value; spec calls for 10 min in production

export default function BreathingStage({ onComplete, durationSeconds = DEFAULT_SECONDS, subtitleKey = 'craving.breatheSub' }) {
  const { t } = useTranslation()
  const { tokens } = useStage()
  const [remaining, setRemaining] = useState(durationSeconds)

  useEffect(() => {
    if (remaining <= 0) return
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining])

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-6">
      <motion.div
        className="w-44 h-44 rounded-full"
        style={{ background: `radial-gradient(circle, ${tokens.color}aa, ${tokens.color}11 70%)` }}
        animate={{ scale: [1, 1.35, 1] }}
        transition={{ duration: durationSeconds > 60 ? 7 : 5.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <p className="text-white font-display text-lg mt-8 text-center">{t('craving.breatheTitle')}</p>
      <p className="text-white/40 text-sm mt-1 text-center max-w-xs">{t(subtitleKey)}</p>

      <button
        onClick={onComplete}
        disabled={remaining > 0}
        className="mt-10 rounded-xl px-6 py-3 text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        style={{ background: `linear-gradient(135deg, ${tokens.color}, ${tokens.dim})` }}
      >
        {remaining > 0 ? `${t('craving.skipIn')} ${remaining}s` : t('craving.continue')}
      </button>
    </div>
  )
}
