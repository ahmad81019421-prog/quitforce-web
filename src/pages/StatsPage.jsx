import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import PremiumGlassCard from '../components/PremiumGlassCard'
import BottomNav from '../components/BottomNav'
import { useStage } from '../hooks/useStage'
import { useAuth } from '../lib/AuthContext'
import { watchCravingLogs } from '../lib/firestore'

const HOURS = ['00', '03', '06', '09', '12', '15', '18', '21']
const DAY_KEYS = [0, 1, 2, 3, 4, 5, 6] // Sun..Sat, matches JS getDay()

function toJsDate(ts) {
  if (!ts) return null
  if (typeof ts.toDate === 'function') return ts.toDate() // Firestore Timestamp
  return new Date(ts)
}

/** Buckets craving logs into the last 14 days -> count per day, for the trend line. */
function buildTrend(logs) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return { key: d.toDateString(), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 }
  })
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]))
  logs.forEach((log) => {
    const date = toJsDate(log.createdAt)
    if (!date) return
    const key = date.toDateString()
    if (byKey[key]) byKey[key].count += 1
  })
  return days
}

/** Buckets logs into weekday x 3-hour-block counts, for the heatmap. */
function buildHeatmap(logs) {
  const grid = {}
  DAY_KEYS.forEach((d) => { grid[d] = HOURS.map(() => 0) })
  logs.forEach((log) => {
    const date = toJsDate(log.createdAt)
    if (!date) return
    const day = date.getDay()
    const hourBlock = Math.floor(date.getHours() / 3)
    grid[day][hourBlock] += 1
  })
  return grid
}

export default function StatsPage() {
  const { t } = useTranslation()
  const { tokens } = useStage()
  const { user } = useAuth()
  const [logs, setLogs] = useState([])

  // Pull day labels from i18n so they localize properly. Falls back to
  // English abbreviations if the key is missing.
  const DAY_LABELS = (() => {
    const arr = t('stats.days', { returnObjects: true })
    return Array.isArray(arr) && arr.length === 7 ? arr : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  })()

  useEffect(() => {
    if (!user) return
    const unsub = watchCravingLogs(user.uid, setLogs, 500)
    return unsub
  }, [user])

  const trend = buildTrend(logs)
  const heatmap = buildHeatmap(logs)
  const maxHeat = Math.max(1, ...DAY_KEYS.flatMap((d) => heatmap[d]))
  const resisted = logs.filter((l) => l.outcome === 'resisted').length
  const smoked = logs.filter((l) => l.outcome === 'smoked').length
  const compliance = resisted + smoked > 0 ? Math.round((resisted / (resisted + smoked)) * 100) : 100

  return (
    <div className="min-h-screen w-full bg-black pb-28">
      <div className="px-6 pt-6 max-w-2xl mx-auto space-y-5">
        <h1 className="font-display text-2xl font-semibold text-white">{t('stats.title')}</h1>

        {logs.length === 0 && (
          <p className="text-white/30 text-sm">— {t('stats.trend')} —</p>
        )}

        <PremiumGlassCard padding="p-5">
          <p className="text-sm text-white/60 mb-3">{t('stats.trend')}</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={9} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke={tokens.color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PremiumGlassCard>

        <PremiumGlassCard padding="p-5">
          <p className="text-sm text-white/60 mb-3">{t('stats.heatmap')}</p>
          <div className="grid grid-cols-9 gap-1 items-center">
            <span />
            {HOURS.map((h) => <span key={h} className="text-[9px] text-white/30 text-center">{h}</span>)}
            {DAY_KEYS.map((d) => (
              <Row key={d} label={DAY_LABELS[d]} values={heatmap[d]} max={maxHeat} color={tokens.color} />
            ))}
          </div>
        </PremiumGlassCard>

        <PremiumGlassCard padding="p-5">
          <p className="text-sm text-white/60 mb-1">{t('stats.compliance')}</p>
          <p className="font-num text-3xl font-semibold" style={{ color: tokens.color }}>{compliance}%</p>
          <p className="text-white/30 text-xs mt-1">{resisted} / {resisted + smoked} {t('stats.resistedCravings')}</p>
        </PremiumGlassCard>
      </div>
      <BottomNav />
    </div>
  )
}

function Row({ label, values, max, color }) {
  return (
    <>
      <span className="text-[9px] text-white/30">{label}</span>
      {values.map((v, i) => (
        <div key={i} className="aspect-square rounded-sm" style={{ background: color, opacity: 0.1 + (v / max) * 0.8 }} />
      ))}
    </>
  )
}
