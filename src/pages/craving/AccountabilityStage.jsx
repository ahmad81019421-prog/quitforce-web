import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useStage } from '../../hooks/useStage'
import { useAuth } from '../../lib/AuthContext'
import { logCraving } from '../../lib/firestore'

export default function AccountabilityStage({ onComplete }) {
  const { t } = useTranslation()
  const { tokens } = useStage()
  const { user } = useAuth()
  const [contacted, setContacted] = useState(false)

  async function handleContacted() {
    setContacted(true)
    if (user) {
      try { await logCraving(user.uid, { outcome: 'contacted-partner' }) }
      catch (err) { console.error('Failed to log accountability contact:', err) }
    }
  }

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-6xl mb-6"
      >
        🤝
      </motion.div>
      <p className="text-white font-display text-lg mb-1 max-w-xs">{t('craving.accountabilityTitle')}</p>
      <p className="text-white/40 text-sm max-w-xs mb-8">{t('craving.accountabilitySub')}</p>

      {!contacted ? (
        <button
          onClick={handleContacted}
          className="rounded-xl px-6 py-3 text-sm font-semibold text-black mb-3"
          style={{ background: `linear-gradient(135deg, ${tokens.color}, ${tokens.dim})` }}
        >
          {t('craving.accountabilityContact')}
        </button>
      ) : (
        <p className="text-mint text-sm mb-4">✓ {t('craving.accountabilityDone')}</p>
      )}

      <button onClick={onComplete} className="text-white/50 text-sm underline">
        {t('craving.continue')}
      </button>
    </div>
  )
}
