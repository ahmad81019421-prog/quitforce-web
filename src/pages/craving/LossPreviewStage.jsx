import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const COIN_COUNT = 10

export default function LossPreviewStage({ walletPenalty = 12.5, streakDays = 5, onComplete }) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-6 overflow-hidden relative">
      <div aria-hidden className="absolute inset-0 opacity-40"
        style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,59,48,0.25), transparent 60%)' }} />

      <motion.h2
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="font-display text-xl text-white mb-1 relative z-10 text-center"
      >
        {t('craving.lossTitle')}
      </motion.h2>
      <p className="text-white/40 text-sm mb-8 relative z-10 text-center">{t('craving.lossSub')}</p>

      <div className="relative w-64 h-40 mb-6">
        {Array.from({ length: COIN_COUNT }).map((_, i) => {
          const angle = (i / COIN_COUNT) * Math.PI * 2
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 text-2xl"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos(angle) * 90,
                y: Math.sin(angle) * 60 + 20,
                opacity: 0,
                rotate: 180
              }}
              transition={{ duration: 1.6, delay: 0.2, ease: 'easeOut' }}
            >
              🪙
            </motion.span>
          )
        })}
        <motion.div
          className="absolute inset-0 flex items-center justify-center font-num text-2xl text-stage-early"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0.3] }}
          transition={{ duration: 1.8, times: [0, 0.5, 1] }}
        >
          -${walletPenalty.toFixed(2)}
        </motion.div>
      </div>

      <motion.div
        className="flex items-center gap-2 mb-8 relative z-10"
        initial={{ filter: 'brightness(1)' }}
        animate={{ filter: 'brightness(0.3)' }}
        transition={{ duration: 2, delay: 0.5 }}
      >
        <span className="text-3xl">🔥</span>
        <span className="font-num text-white text-lg line-through">{streakDays} {t('dashboard.streak')}</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 1, filter: 'blur(0px)' }}
        animate={{ opacity: 0.15, filter: 'blur(2px)' }}
        transition={{ duration: 2.4, delay: 0.8 }}
        className="text-white/60 text-sm mb-10 relative z-10 text-center"
      >
        {t('craving.lossProgress')}
      </motion.p>

      <button
        onClick={onComplete}
        className="relative z-10 rounded-xl px-6 py-3 text-sm font-semibold text-black"
        style={{ background: 'linear-gradient(135deg,#FF3B30,#7A1410)' }}
      >
        {t('craving.continue')}
      </button>
    </div>
  )
}
