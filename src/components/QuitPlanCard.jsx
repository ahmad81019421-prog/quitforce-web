import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useStage } from '../hooks/useStage'
import { buildReductionPlan } from '../lib/firestore'

function buildPlan(cigsPerDay) {
  return buildReductionPlan(cigsPerDay)
}

export default function QuitPlanCard({ cigsPerDay, streakDays }) {
  const { t } = useTranslation()
  const { tokens } = useStage()
  const plan = buildPlan(cigsPerDay)
  const currentWeek = Math.min(plan.length || 1, Math.floor(streakDays / 7) + 1)

  return (
    <div>
      <p className="text-xs text-white/40 mb-3">{t('dashboard.quitPlan')}</p>
      <div className="space-y-2">
        {plan.map(({ week, target }) => {
          const isPast = week < currentWeek
          const isCurrent = week === currentWeek
          return (
            <motion.div
              key={week}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: week * 0.05 }}
              className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{
                background: isCurrent ? `${tokens.color}1a` : 'transparent',
                border: `1px solid ${isCurrent ? tokens.color + '55' : 'rgba(255,255,255,0.08)'}`
              }}
            >
              <span className="text-sm text-white/70">
                {t('dashboard.week')} {week} {isPast && '✓'}
              </span>
              <span className="font-num text-sm" style={{ color: isCurrent ? tokens.color : 'white' }}>
                ≤ {target} {t('dashboard.cigsPerDayShort')}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
