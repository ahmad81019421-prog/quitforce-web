import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PremiumGlassCard from './PremiumGlassCard'
import { useAuth } from '../lib/AuthContext'
import { watchNotifications, markNotificationRead } from '../lib/firestore'
import { useTranslation } from 'react-i18next'

const KIND_COLOR = { info: '#64D2FF', success: '#30D158', warning: '#FF9F0A' }

export default function NotificationPopup() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [queue, setQueue] = useState([])

  useEffect(() => {
    if (!user) return
    const unsub = watchNotifications(user.uid, setQueue)
    return unsub
  }, [user])

  if (!queue.length) return null
  const current = queue[0]

  async function dismiss() {
    await markNotificationRead(user.uid, current.id)
  }

  const translated = current.i18nKey ? t(current.i18nKey, current.i18nParams || {}) : null
  const title = current.title || translated || ''
  const body = current.body || translated || ''

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
      <AnimatePresence>
        <motion.div key={current.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <PremiumGlassCard glow="none" padding="p-7" className="bg-white/[0.04] text-center">
            <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center text-lg"
              style={{ background: `${KIND_COLOR[current.kind] || '#fff'}22`, color: KIND_COLOR[current.kind] || '#fff' }}>
              🔔
            </div>
            <h3 className="text-white font-display text-lg mb-1">{title}</h3>
            <p className="text-white/50 text-sm mb-6">{body}</p>
            <button onClick={dismiss} className="w-full rounded-xl py-3 text-sm font-semibold text-black bg-white">
              {t('admin.confirm')}
            </button>
          </PremiumGlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}