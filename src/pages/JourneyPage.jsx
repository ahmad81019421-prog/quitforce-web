import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../lib/AuthContext'

const WORLDS = {
  early:    { color: '#FF3B30', dim: '#7A1410', emoji: '🌋' },
  progress: { color: '#BF5AF2', dim: '#4B1A66', emoji: '🪐' },
  freedom:  { color: '#FFD700', dim: '#6B5800', emoji: '☀️' }
}

const MILESTONE_DAYS = [1, 3, 7, 14, 21, 30, 60, 90]

function worldFor(day) {
  if (day >= 30) return WORLDS.freedom
  if (day >= 7) return WORLDS.progress
  return WORLDS.early
}
function worldKeyFor(day) {
  if (day >= 30) return 'freedom'
  if (day >= 7) return 'progress'
  return 'early'
}

export default function JourneyPage() {
  const { t } = useTranslation()
  const { streakDays } = useAuth()

  return (
    <div className="min-h-screen w-full bg-black pb-28">
      <div className="px-6 pt-6 max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-semibold text-white mb-1">{t('journey.title')}</h1>
        <p className="text-white/40 text-sm mb-2">{t('dashboard.streak')}: {streakDays}</p>

        <div className="relative mt-8 pl-8 border-l border-white/10 space-y-10">
          {MILESTONE_DAYS.map((day, i) => {
            const world = worldFor(day)
            const achieved = streakDays >= day
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 150, damping: 16, delay: i * 0.03 }}
                className="relative"
              >
                <span
                  className="absolute -left-[2.65rem] top-0 w-5 h-5 rounded-full"
                  style={{
                    background: achieved ? world.color : 'rgba(255,255,255,0.1)',
                    boxShadow: achieved ? `0 0 18px ${world.color}88` : 'none'
                  }}
                />
                <div
                  className={`rounded-2xl p-4 border ${achieved ? 'border-white/10' : 'border-white/5'}`}
                  style={{ background: achieved ? `linear-gradient(135deg, ${world.dim}33, transparent)` : 'transparent', opacity: achieved ? 1 : 0.4 }}
                >
                  <p className="text-xs text-white/40 mb-1">{t('journey.day')} {day}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-display">{t(`journey.${worldKeyFor(day)}`)}</span>
                    <span className="text-2xl">{world.emoji}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
