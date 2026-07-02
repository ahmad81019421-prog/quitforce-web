import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Award, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import PremiumGlassCard from '../components/PremiumGlassCard'
import BottomNav from '../components/BottomNav'
import { useStage } from '../hooks/useStage'
import { useAuth } from '../lib/AuthContext'
import { watchUserProfile, watchWallet, watchCravingLogs } from '../lib/firestore'

export default function PassportPage() {
  const { t } = useTranslation()
  const { tokens } = useStage()
  const { user, profile: authProfile, streakDays: authStreakDays } = useAuth()

  const [profile, setProfile] = useState(authProfile)
  const [wallet, setWallet] = useState(null)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    if (!user) return
    // The AuthContext already subscribes to the profile, but keep a local
    // subscription too so this page stays self-contained if it ever gets
    // visited without AuthProvider (defensive — should never happen).
    const unsubP = watchUserProfile(user.uid, setProfile)
    const unsubW = watchWallet(user.uid, setWallet)
    const unsubL = watchCravingLogs(user.uid, setLogs)
    return () => { unsubP(); unsubW(); unsubL() }
  }, [user])

  const streakDays = profile?.quitDate
    ? Math.floor((Date.now() - new Date(profile.quitDate).getTime()) / 86400000)
    : authStreakDays
  const cigsAvoided = Math.floor(streakDays * (profile?.cigsPerDay ?? 0))
  const moneySaved = cigsAvoided * ((profile?.pricePerPack ?? 0) / 20)
  const resistedCount = logs.filter((l) => l.outcome === 'resisted').length

  const trophies = []
  if (streakDays >= 1) trophies.push('🥇')
  if (streakDays >= 7) trophies.push('🔥')
  if (moneySaved >= 20) trophies.push('💰')
  if (resistedCount >= 1) trophies.push('🛡️')
  if (streakDays >= 30) trophies.push('🌅')

  function handleExportPDF() {
    const doc = new jsPDF()
    const lng = (profile?.commitmentSignature?.signedAt ? 'en' : 'en')

    doc.setFontSize(22)
    doc.setTextColor(20)
    doc.text('QuitForce — Recovery Passport', 20, 24)

    doc.setDrawColor(255, 215, 0)
    doc.setLineWidth(0.8)
    doc.line(20, 28, 190, 28)

    doc.setFontSize(12)
    doc.setTextColor(60)
    let y = 44
    const line = (label, value) => {
      doc.setFont(undefined, 'bold')
      doc.text(`${label}:`, 20, y)
      doc.setFont(undefined, 'normal')
      doc.text(String(value ?? '—'), 70, y)
      y += 10
    }

    line('Smoke-free since', profile?.quitDate ? new Date(profile.quitDate).toLocaleDateString() : '—')
    line('Total smoke-free days', streakDays)
    line('Cigarettes avoided', cigsAvoided)
    line('Total saved ($)', `$${moneySaved.toFixed(2)}`)
    line('Resisted cravings', resistedCount)
    line('Wallet balance ($)', `$${(wallet?.balance ?? 0).toFixed(2)}`)
    line('Trophies earned', trophies.join('  '))

    if (profile?.commitmentSignature?.signedAt) {
      y += 6
      doc.setFont(undefined, 'bold')
      doc.text('Commitment contract:', 20, y)
      y += 8
      doc.setFont(undefined, 'normal')
      doc.text(`Signed on ${new Date(profile.commitmentSignature.signedAt).toLocaleDateString()}`, 20, y)
      y += 8
      doc.text(`Method: ${profile.commitmentSignature.method || 'signature-canvas'}`, 20, y)
    }

    doc.save('quitforce-passport.pdf')
  }

  return (
    <div className="min-h-screen w-full bg-black pb-28">
      <div className="px-6 pt-6 max-w-2xl mx-auto space-y-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 16 }}
          className="rounded-3xl p-8 text-center border border-white/10 relative overflow-hidden"
          style={{ background: `radial-gradient(circle at 50% 0%, ${tokens.color}33, #000 70%)` }}
        >
          <p className="text-xs uppercase tracking-widest text-white/40 mb-2">{t('passport.title')}</p>
          <h1 className="font-display text-2xl font-bold text-white mb-1">{t('passport.subtitle')}</h1>
          <p className="text-white/50 text-sm font-num">
            {t('passport.since')}: {profile?.quitDate ? new Date(profile.quitDate).toLocaleDateString() : '—'}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <PremiumGlassCard padding="p-5">
            <p className="text-xs text-white/40 mb-1">{t('passport.totalSaved')}</p>
            <p className="font-num text-2xl text-mint font-semibold">${moneySaved.toFixed(2)}</p>
          </PremiumGlassCard>
          <PremiumGlassCard padding="p-5">
            <p className="text-xs text-white/40 mb-1">{t('passport.totalAvoided')}</p>
            <p className="font-num text-2xl text-white font-semibold">{cigsAvoided}</p>
          </PremiumGlassCard>
        </div>

        <PremiumGlassCard padding="p-5">
          <p className="text-sm text-white/60 mb-3 flex items-center gap-1"><Award size={14} /> {t('passport.trophies')}</p>
          <div className="flex gap-3 flex-wrap">
            {trophies.length === 0 && <p className="text-white/30 text-xs">—</p>}
            {trophies.map((emoji, i) => (
              <motion.div key={i} whileHover={{ scale: 1.1 }} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                {emoji}
              </motion.div>
            ))}
          </div>
        </PremiumGlassCard>

        {profile?.commitmentSignature?.dataUrl && (
          <PremiumGlassCard padding="p-5">
            <p className="text-xs text-white/40 mb-2">{t('passport.commitmentContract')}</p>
            <img
              src={profile.commitmentSignature.dataUrl}
              alt="Your commitment signature"
              className="w-full h-24 object-contain"
            />
            {profile.commitmentSignature.signedAt && (
              <p className="text-xs text-white/40 mt-2 font-num">
                {t('passport.signedOn')}: {new Date(profile.commitmentSignature.signedAt).toLocaleDateString()}
              </p>
            )}
          </PremiumGlassCard>
        )}

        <button
          onClick={handleExportPDF}
          className="w-full rounded-xl py-3 text-sm font-semibold text-black flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${tokens.color}, ${tokens.dim})` }}
        >
          <Download size={16} /> {t('passport.export')}
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
