import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useStage } from '../../hooks/useStage'

const TASK_SECONDS = 20

export default function MiniTaskStage({ onComplete }) {
  const { t } = useTranslation()
  const { tokens } = useStage()
  const [remaining, setRemaining] = useState(TASK_SECONDS)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (remaining <= 0) return
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining])

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        animate={{ rotate: done ? 0 : [0, 8, -8, 0] }}
        transition={{ repeat: done ? 0 : Infinity, duration: 1.2 }}
        className="text-6xl mb-6"
      >
        {done ? '✅' : '🧍'}
      </motion.div>
      <p className="text-white font-display text-lg mb-1">{t('craving.taskTitle')}</p>
      <p className="text-white/40 text-sm max-w-xs mb-8">{t('craving.taskSub')}</p>

      <button
        onClick={() => setDone(true)}
        disabled={done}
        className="rounded-xl px-6 py-3 text-sm font-semibold text-black mb-3 disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${tokens.color}, ${tokens.dim})` }}
      >
        {done ? t('craving.taskDone') : t('craving.taskMarkDone')}
      </button>

      <button
        onClick={onComplete}
        disabled={remaining > 0 && !done}
        className="text-white/50 text-sm underline disabled:opacity-30"
      >
        {remaining > 0 && !done ? `${t('craving.skipIn')} ${remaining}s` : t('craving.continue')}
      </button>
    </div>
  )
}
