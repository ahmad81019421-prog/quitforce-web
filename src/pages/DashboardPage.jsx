import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import PremiumGlassCard from '../components/PremiumGlassCard'
import SpringCounter from '../components/SpringCounter'
import LanguageSwitch from '../components/LanguageSwitch'
import BottomNav from '../components/BottomNav'
import MonthlyCalendar from '../components/MonthlyCalendar'
import QuitPlanCard from '../components/QuitPlanCard'
import { useStage } from '../hooks/useStage'
import { useAuth } from '../lib/AuthContext'
import { watchUserProfile, watchWallet, watchCravingLogs, pingActive, needsDailyCheckin } from '../lib/firestore'
import { requestNotificationPermission } from '../lib/messaging'
import DailyCheckinModal from '../components/DailyCheckinModal'
export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, profile: authProfile } = useAuth()
  const { tokens, setStreakDays } = useStage()
const [showCheckin, setShowCheckin] = useState(false)
  // Keep a local profile mirror so we can read cigsPerDay / pricePerPack
  // without reaching into AuthContext for fields it doesn't expose.
  const [profile, setProfile] = useState(authProfile)
  const [wallet, setWallet] = useState(null)
  const [logs, setLogs] = useState([])
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!user) return
    const unsubProfile = watchUserProfile(user.uid, (p) => {
      setProfile(p)
      if (!p?.onboardingComplete) navigate('/onboarding', { replace: true })
    })

    
    const unsubWallet = watchWallet(user.uid, setWallet)
    const unsubLogs = watchCravingLogs(user.uid, setLogs, 200)
    return () => { unsubProfile(); unsubWallet(); unsubLogs() }
  }, [user, navigate])
useEffect(() => {
  if (profile && needsDailyCheckin(profile)) setShowCheckin(true)
}, [profile])
  // Heartbeat: every visit (and every 5 min while the tab stays open) marks
  // the user as "active". The Vercel inactivity-check endpoint reads this
  // field to decide whether to penalize + push-notify someone who has gone
  // quiet — see /enforcement-api/api/check-inactivity.js.
  useEffect(() => {
    if (!user) return
    pingActive(user.uid)
    requestNotificationPermission(user.uid)
    const id = setInterval(() => pingActive(user.uid), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [user])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const quitDateMs = profile?.quitDate ? new Date(profile.quitDate).getTime() : now
  const cigsPerDay = profile?.cigsPerDay ?? 0
  const pricePerPack = profile?.pricePerPack ?? 0
  const pricePerCig = pricePerPack / 20

  const elapsedMs = Math.max(0, now - quitDateMs)
  const elapsedHours = elapsedMs / 36e5
  const cigsAvoided = (elapsedHours / 24) * cigsPerDay
  const moneySaved = cigsAvoided * pricePerCig
  const streakDays = Math.floor(elapsedHours / 24)
  const risk = Math.max(8, 70 - streakDays * 4)

  // Sync the computed streak up into StageProvider so the ambient color
  // on every page (and BottomNav) follows the user's real progress.
  useEffect(() => { setStreakDays(streakDays) }, [streakDays, setStreakDays])

  const { d, h, m, s } = useMemo(() => {
    const totalSec = Math.floor(elapsedMs / 1000)
    return {
      d: Math.floor(totalSec / 86400),
      h: Math.floor((totalSec % 86400) / 3600),
      m: Math.floor((totalSec % 3600) / 60),
      s: totalSec % 60
    }
  }, [elapsedMs])

  const riskLabel = risk > 60 ? t('dashboard.high') : risk > 30 ? t('dashboard.medium') : t('dashboard.low')

  if (!profile) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white/40" />
      </div>
    )
  }

  return (
    <div className="ambient-bg min-h-screen w-full pb-28 transition-colors duration-1000">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15" />
          <span
            className="text-xs font-medium rounded-full px-3 py-1 border"
            style={{ color: tokens.color, borderColor: `${tokens.color}55`, background: `${tokens.color}15` }}
          >
            {tokens.label[i18n.language === 'ar' ? 'ar' : 'en']}
          </span>
        </div>
        <LanguageSwitch />
      </div>

      <div className="px-6 space-y-5 max-w-2xl mx-auto">
        <PremiumGlassCard padding="p-8" className="text-center">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-3">{t('dashboard.smokeFreeFor')}</p>
          <div className="flex justify-center items-end gap-3 font-num">
            <TimeBlock value={d} label={i18n.language === 'ar' ? 'يوم' : 'd'} />
            <TimeBlock value={h} label={i18n.language === 'ar' ? 'سا' : 'h'} />
            <TimeBlock value={m} label={i18n.language === 'ar' ? 'د' : 'm'} />
            <TimeBlock value={s} label={i18n.language === 'ar' ? 'ث' : 's'} />
          </div>
        </PremiumGlassCard>

        <div className="grid grid-cols-2 gap-4">
          <PremiumGlassCard padding="p-5">
            <p className="text-xs text-white/40 mb-1">{t('dashboard.moneySaved')}</p>
            <SpringCounter value={moneySaved} decimals={2} prefix="$" className="font-num text-2xl text-mint font-semibold" />
            <MiniSparkline color="#30D158" />
          </PremiumGlassCard>

          <PremiumGlassCard padding="p-5">
            <p className="text-xs text-white/40 mb-1">{t('dashboard.cigsAvoided')}</p>
            <SpringCounter value={cigsAvoided} decimals={0} className="font-num text-2xl text-white font-semibold" />
            <div className="mt-2 flex gap-1 flex-wrap">
              {Array.from({ length: Math.min(12, Math.floor(cigsAvoided)) }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30" />
              ))}
            </div>
          </PremiumGlassCard>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <PremiumGlassCard padding="p-5" className="flex flex-col items-center">
            <RiskGauge value={risk} color={tokens.color} />
            <p className="text-xs text-white/40 mt-2">{t('dashboard.riskLevel')}: <span className="text-white/80">{riskLabel}</span></p>
          </PremiumGlassCard>

          <PremiumGlassCard padding="p-5" className="flex flex-col items-center justify-center">
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="text-4xl">
              🔥
            </motion.div>
            <p className="font-num text-xl text-white mt-1">{streakDays}</p>
            <p className="text-xs text-white/40">{t('dashboard.streak')}</p>
          </PremiumGlassCard>
        </div>

        <PremiumGlassCard padding="p-5">
          <MonthlyCalendar logs={logs} quitDate={profile?.quitDate} />
        </PremiumGlassCard>

        <PremiumGlassCard padding="p-5">
          <QuitPlanCard cigsPerDay={cigsPerDay} streakDays={streakDays} />
        </PremiumGlassCard>

        <PremiumGlassCard padding="p-5" interactive>
          <p className="text-xs text-white/40 mb-1">{t('dashboard.todayChallenge')}</p>
          <p className="text-white text-sm">{t('dashboard.todaysChallengeText')}</p>
        </PremiumGlassCard>

        {wallet && (
          <PremiumGlassCard padding="p-4" className="flex items-center justify-between">
            <span className="text-xs text-white/40">{t('wallet.balance')}</span>
            <span className="font-num text-white">${(wallet.balance ?? 0).toFixed(2)}</span>
          </PremiumGlassCard>
        )}
      </div>

      <motion.button
        onClick={() => navigate('/craving')}
        className="fixed bottom-20 inset-x-6 mx-auto max-w-2xl rounded-2xl py-4 font-semibold text-black z-20"
        style={{ background: `linear-gradient(135deg, ${tokens.color}, ${tokens.dim})`, boxShadow: `0 0 40px -8px ${tokens.color}` }}
        animate={{ boxShadow: [`0 0 30px -10px ${tokens.color}`, `0 0 55px -8px ${tokens.color}`, `0 0 30px -10px ${tokens.color}`] }}
        transition={{ repeat: Infinity, duration: 2.2 }}
        whileTap={{ scale: 0.97 }}
      >
        {t('dashboard.craving')}
      </motion.button>
{showCheckin && <DailyCheckinModal onDone={() => setShowCheckin(false)} />}
      <BottomNav />
    </div>
  )
}

function TimeBlock({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl text-white tabular-nums">{String(value).padStart(2, '0')}</span>
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  )
}

function MiniSparkline({ color }) {
  const points = '0,18 10,14 20,16 30,9 40,11 50,4 60,7 70,2'
  return (
    <svg viewBox="0 0 70 20" className="w-full h-6 mt-2">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}

function RiskGauge({ value, color }) {
  const r = 28, c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
      <motion.circle
        cx="36" cy="36" r={r} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="41" textAnchor="middle" fill="white" fontSize="16" fontFamily="JetBrains Mono">
        {Math.round(value)}
      </text>
    </svg>
  )
}
