import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useStage } from '../hooks/useStage'

function toJsDate(ts) {
  if (!ts) return null
  if (typeof ts.toDate === 'function') return ts.toDate()
  return new Date(ts)
}

/**
 * Builds a day-by-day status map for the current calendar month:
 *  - 'relapse'  -> at least one 'smoked' log that day
 *  - 'clean'    -> on/after quitDate, no smoked log, and not in the future
 *  - 'future'   -> day hasn't happened yet
 *  - 'inactive' -> before the user's quitDate (not part of the journey yet)
 */
function buildMonthStatus(logs, quitDate) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayDate = now.getDate()
  const quit = quitDate ? new Date(quitDate) : null

  const relapseDays = new Set(
    logs
      .filter((l) => l.outcome === 'smoked')
      .map((l) => toJsDate(l.createdAt))
      .filter((d) => d && d.getFullYear() === year && d.getMonth() === month)
      .map((d) => d.getDate())
  )

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const date = new Date(year, month, day)
    if (day > todayDate) return { day, status: 'future' }
    if (relapseDays.has(day)) return { day, status: 'relapse' }
    if (quit && date < new Date(quit.getFullYear(), quit.getMonth(), quit.getDate())) return { day, status: 'inactive' }
    return { day, status: 'clean' }
  })
}

export default function MonthlyCalendar({ logs, quitDate }) {
  const { t, i18n } = useTranslation()
  const { tokens } = useStage()
  const days = buildMonthStatus(logs, quitDate)
  const monthLabel = new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar' : 'en', { month: 'long', year: 'numeric' })

  const colorFor = (status) => {
    if (status === 'relapse') return '#FF3B30'
    if (status === 'clean') return '#30D158'
    if (status === 'future') return 'rgba(255,255,255,0.08)'
    return 'rgba(255,255,255,0.04)'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40">{t('dashboard.monthlyCalendar')}</p>
        <p className="text-xs text-white/40 font-num">{monthLabel}</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ day, status }) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: day * 0.005 }}
            className="aspect-square rounded-md flex items-center justify-center text-[10px] font-num"
            style={{
              background: status === 'future' || status === 'inactive' ? 'transparent' : `${colorFor(status)}26`,
              border: `1px solid ${colorFor(status)}${status === 'future' || status === 'inactive' ? '40' : '70'}`,
              color: status === 'future' || status === 'inactive' ? 'rgba(255,255,255,0.25)' : 'white'
            }}
          >
            {day}
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-white/40">
        <Legend color="#30D158" label={t('dashboard.calendarClean')} />
        <Legend color="#FF3B30" label={t('dashboard.calendarRelapse')} />
        <Legend color="rgba(255,255,255,0.2)" label={t('dashboard.calendarFuture')} />
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}
