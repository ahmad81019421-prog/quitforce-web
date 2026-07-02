import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import PremiumGlassCard from '../components/PremiumGlassCard'
import LanguageSwitch from '../components/LanguageSwitch'
import { fetchAdminOverview, adminUpdateUser, adminTransferWallet, adminResetStreak, adminDeleteUser, depositToWallet, withdrawFromWallet } from '../lib/firestore'
import { ADMIN_UID } from '../lib/adminConfig'
import { db } from '../lib/firebase'
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore'
import { useAuth } from '../lib/AuthContext'

// ── helpers ──────────────────────────────────────────────────────────────────

function daysSince(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function stageOf(days) {
  if (days === null) return { labelKey: 'none', color: '#666' }
  if (days < 7)  return { labelKey: 'early',    color: '#FF3B30' }
  if (days < 30) return { labelKey: 'progress', color: '#BF5AF2' }
  return               { labelKey: 'freedom',   color: '#FFD60A' }
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

// ── sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#fff' }) {
  return (
    <PremiumGlassCard glow="none" padding="p-4">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="font-num text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </PremiumGlassCard>
  )
}

function Badge({ label, color }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: color + '22', color }}>
      {label}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
<div className="bg-[#0a0a0a] border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [overview, setOverview]   = useState(null)
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [modal, setModal]         = useState(null) // 'edit' | 'wallet' | 'relapse' | 'delete'
  const [editForm, setEditForm]   = useState({})
  const [walletAmount, setWalletAmount] = useState('')
  const [walletOp, setWalletOp]   = useState('add')
  const [adminWalletOpen, setAdminWalletOpen] = useState(false)
  const [adminAmount, setAdminAmount] = useState(20)
  const [adminMethod, setAdminMethod] = useState('card')
  const [adminProcessing, setAdminProcessing] = useState(false)
  const [adminTransactions, setAdminTransactions] = useState([])
  const [actionMsg, setActionMsg] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [tab, setTab]             = useState('users') // 'users' | 'stats'

  // ── load ──────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ovData, usersSnap, walletsSnap] = await Promise.all([
        fetchAdminOverview(),
        getDocs(query(collection(db, 'users'), where('onboardingComplete', '==', true), limit(500))),
        getDocs(collection(db, 'wallets'))
      ])

      const walletMap = {}
      walletsSnap.docs.forEach(d => { walletMap[d.id] = d.data().balance || 0 })

      const usersData = usersSnap.docs
        .filter(d => d.id !== ADMIN_UID)
        .map(d => ({
          id: d.id,
          ...d.data(),
          balance: walletMap[d.id] ?? 0,
          days: daysSince(d.data().quitDate)
        }))

      // include admin wallet balance in overview for UI
      setOverview({ ...ovData, adminBalance: walletMap[ADMIN_UID] ?? 0 })
      setUsers(usersData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // load admin transactions when wallet modal opens
  useEffect(() => {
    if (!adminWalletOpen) return
    let mounted = true
    ;(async () => {
      try {
        const txSnap = await getDocs(query(collection(db, 'wallets', ADMIN_UID, 'transactions'), orderBy('createdAt', 'desc'), limit(50)))
        if (!mounted) return
        setAdminTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error('failed loading admin tx', e)
      }
    })()
    return () => { mounted = false }
  }, [adminWalletOpen])

  // ── derived ───────────────────────────────────────────────────────────────

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(search.toLowerCase())
    const stage = stageOf(u.days).labelKey
    const matchStage = stageFilter === 'all' || stage === stageFilter
    return matchSearch && matchStage
  })

  const totalBalance = users.reduce((s, u) => s + u.balance, 0)
  const avgDays      = users.length
    ? Math.round(users.filter(u => u.days !== null).reduce((s, u) => s + (u.days || 0), 0) / users.length)
    : 0

  const stageData = [
    { name: t('admin.stage.early'),    value: users.filter(u => stageOf(u.days).labelKey === 'early').length,    fill: '#FF3B30' },
    { name: t('admin.stage.progress'), value: users.filter(u => stageOf(u.days).labelKey === 'progress').length, fill: '#BF5AF2' },
    { name: t('admin.stage.freedom'),  value: users.filter(u => stageOf(u.days).labelKey === 'freedom').length,  fill: '#FFD60A' },
  ]

  const triggerData = ['stress','habit','social','boredom'].map((triggerKey) => ({
    name: t(`onboarding.triggers.${triggerKey}`),
    value: users.filter(u => u.trigger === triggerKey).length
  }))

  // ── actions ───────────────────────────────────────────────────────────────
async function handleEditSave() {
  setActionLoading(true)
  try {
    await adminUpdateUser(selectedUser.id, {
      ...(editForm.quitDate && { quitDate: new Date(editForm.quitDate).toISOString() }),
      ...(editForm.cigsPerDay && { cigsPerDay: Number(editForm.cigsPerDay) }),
      ...(editForm.pricePerPack && { pricePerPack: Number(editForm.pricePerPack) }),
    })
    setActionMsg(`✓ ${t('admin.messages.userUpdated')}`)
    await loadAll()
    setModal(null)
  } catch (e) { setActionMsg(`✗ ${t('admin.messages.actionFailed', { message: e.message })}`) }
  setActionLoading(false)
}

async function handleWallet() {
  setActionLoading(true)
  try {
    const amt = parseFloat(walletAmount)
    await adminTransferWallet(selectedUser.id, amt, walletOp)
    setActionMsg(`✓ ${t('admin.messages.walletUpdated')}`)
    await loadAll()
    setModal(null)
  } catch (e) { setActionMsg(`✗ ${t('admin.messages.actionFailed', { message: e.message })}`) }
  setActionLoading(false)
}

async function handleResetStreak() {
  setActionLoading(true)
  try {
    await adminResetStreak(selectedUser.id)
    setActionMsg(`✓ ${t('admin.messages.streakReset')}`)
    await loadAll()
    setModal(null)
  } catch (e) { setActionMsg(`✗ ${t('admin.messages.actionFailed', { message: e.message })}`) }
  setActionLoading(false)
}

async function handleDeleteUser() {
  setActionLoading(true)
  try {
    await adminDeleteUser(selectedUser.id)
    setActionMsg(`✓ ${t('admin.messages.userDeleted')}`)
    setModal(null)
    setSelectedUser(null)
    await loadAll()
  } catch (e) { setActionMsg(`✗ ${t('admin.messages.actionFailed', { message: e.message })}`) }
  setActionLoading(false)
}

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full bg-black text-white">

      {/* ── header ── */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">🛡</div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-none">{t('admin.title')}</h1>
            <p className="text-white/30 text-xs mt-0.5">{t('admin.loggedInAs')} {user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll}
            className="text-xs text-white/40 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
            {t('admin.refresh')}
          </button>
          <button onClick={() => setAdminWalletOpen(true)}
            className="text-xs text-white/40 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
            {t('admin.adminWallet')}
          </button>
          <LanguageSwitch />
          <button onClick={async () => { try { await logout(); navigate('/auth') } catch (e) { console.error(e) } }}
            className="text-xs text-white/40 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
            {t('nav.logout')}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── stat cards ── */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label={t('admin.totalUsers')} value={overview.totalUsers} sub={t('admin.avgDaysSmokeFree', { days: avgDays })} />
            <StatCard label={t('admin.freedomUsers')} value={`${overview.successRate}%`} color="#FFD60A" sub={t('admin.reached30Days')} />
            <StatCard label={t('admin.totalInWallets')} value={`$${totalBalance.toFixed(2)}`} color="#30D158" sub={t('admin.acrossAllUsers')} />
            <StatCard label={t('admin.highRisk')} value={overview.riskBuckets.high} color="#FF3B30" sub={t('admin.needAttention')} />
          </div>
        )}

        {/* ── tabs ── */}
        <div className="flex gap-2 mb-5">
          {['users','stats'].map((tabKey) => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
                ${tab === tabKey ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
              {t(`admin.tab.${tabKey}`)}
            </button>
          ))}
        </div>

        {loading && <p className="text-white/30 text-sm py-12 text-center">{t('admin.loading')}</p>}
        {error   && <p className="text-red-400 text-sm py-4">{t('admin.error')}: {error}</p>}
        {actionMsg && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70">
            {actionMsg}
          </div>
        )}

        {/* ════════════════ USERS TAB ════════════════ */}
        {!loading && !error && tab === 'users' && (
          <>
            {/* filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                placeholder={t('admin.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/20 outline-none"
              />
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                className="bg-slate-950 text-white border border-white/10 rounded-xl px-3 py-2 text-sm outline-none appearance-none">
                <option className="bg-slate-950 text-white" value="all">{t('admin.allStages')}</option>
                <option className="bg-slate-950 text-white" value="early">{t('admin.stage.early')}</option>
                <option className="bg-slate-950 text-white" value="progress">{t('admin.stage.progress')}</option>
                <option className="bg-slate-950 text-white" value="freedom">{t('admin.stage.freedom')}</option>
              </select>
              <span className="text-white/30 text-sm self-center">{t('admin.filteredUsers', { count: filtered.length })}</span>
            </div>

            {/* table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    {[
                      ['user', t('admin.table.user')],
                      ['stage', t('admin.table.stage')],
                      ['days', t('admin.table.days')],
                      ['cigsday', t('admin.table.cigsday')],
                      ['wallet', t('admin.table.wallet')],
                      ['penalties', t('admin.table.penalties')],
                      ['lastactive', t('admin.table.lastactive')],
                      ['actions', t('admin.table.actions')],
                    ].map(([key, label]) => (
                      <th key={key} className="text-left px-4 py-3 text-white/40 text-xs font-medium">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const stage = stageOf(u.days)
                    const lastActive = u.lastActiveAt?.toDate?.() || (u.lastActiveAt ? new Date(u.lastActiveAt) : null)
                    const lastActiveDays = lastActive
                      ? Math.floor((Date.now() - lastActive.getTime()) / 86400000)
                      : null
                    return (
                      <tr key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={`border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors
                          ${selectedUser?.id === u.id ? 'bg-white/[0.04]' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium truncate max-w-[140px]">
                            {u.displayName || u.email || '—'}
                          </p>
                          <p className="text-white/30 text-xs truncate max-w-[140px]">{u.id}</p>
                        </td>
                        <td className="px-4 py-3"><Badge label={t(`admin.stage.${stage.labelKey}`)} color={stage.color} /></td>
                        <td className="px-4 py-3 font-num text-white/70">{u.days ?? '—'}</td>
                        <td className="px-4 py-3 font-num text-white/70">{u.cigsPerDay ?? '—'}</td>
                        <td className="px-4 py-3 font-num text-green-400 font-semibold">${u.balance.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-num ${(u.penaltyCount||0) > 0 ? 'text-red-400' : 'text-white/30'}`}>
                            {u.penaltyCount || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/40 text-xs">
                          {lastActiveDays === null ? '—'
                            : lastActiveDays === 0 ? t('admin.lastActive.today')
                            : lastActiveDays === 1 ? t('admin.lastActive.yesterday')
                            : t('admin.lastActive.daysAgo', { count: lastActiveDays })}
                          {lastActiveDays !== null && lastActiveDays > 2 && (
                            <span className="ml-1 text-red-400">⚠</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <ActionBtn color="#BF5AF2" onClick={() => { setSelectedUser(u); setEditForm({ quitDate: u.quitDate?.slice(0,10), cigsPerDay: u.cigsPerDay, pricePerPack: u.pricePerPack }); setModal('edit') }}>{t('admin.edit')}</ActionBtn>
                            <ActionBtn color="#30D158" onClick={() => { setSelectedUser(u); setWalletAmount(''); setModal('wallet') }}>{t('admin.walletShort')}</ActionBtn>
                            <ActionBtn color="#FF9F0A" onClick={() => { setSelectedUser(u); setModal('relapse') }}>{t('admin.reset')}</ActionBtn>
                            <ActionBtn color="#FF3B30" onClick={() => { setSelectedUser(u); setModal('delete') }}>{t('admin.deleteShort')}</ActionBtn>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-white/30 text-sm text-center py-10">{t('admin.noUsersFound')}</p>
              )}
            </div>

            {/* selected user detail panel */}
            {selectedUser && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <PremiumGlassCard glow="none" padding="p-5">
                  <p className="text-white/40 text-xs mb-3 uppercase tracking-widest">{t('admin.userDetails')}</p>
                  <div className="space-y-2 text-sm">
                    {[
                      ['uid',           selectedUser.id],
                      ['email',         selectedUser.email || '—'],
                      ['name',          selectedUser.displayName || '—'],
                      ['quitDate',      fmtDate(selectedUser.quitDate)],
                      ['daysClean',     selectedUser.days ?? '—'],
                      ['cigsPerDay',    selectedUser.cigsPerDay ?? '—'],
                      ['yrsSmoking',    selectedUser.yearsSmoking ?? '—'],
                      ['pricePerPack',  selectedUser.pricePerPack ? `$${selectedUser.pricePerPack}` : '—'],
                      ['trigger',       selectedUser.trigger || '—'],
                      ['profileType',   selectedUser.profileType || '—'],
                      ['penaltyCount',  selectedUser.penaltyCount || 0],
                      ['wallet',        `$${selectedUser.balance.toFixed(2)}`],
                      ['stage',         t(`admin.stage.${stageOf(selectedUser.days).labelKey}`)],
                    ].map(([k,v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-white/40">{t(`admin.fields.${k}`)}</span>
                        <span className="text-white font-medium text-right max-w-[200px] truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </PremiumGlassCard>

                <PremiumGlassCard glow="none" padding="p-5">
                  <p className="text-white/40 text-xs mb-3 uppercase tracking-widest">{t('admin.quickActions')}</p>
                  <div className="space-y-2">
                    <ActionFull color="#BF5AF2" onClick={() => { setEditForm({ quitDate: selectedUser.quitDate?.slice(0,10), cigsPerDay: selectedUser.cigsPerDay, pricePerPack: selectedUser.pricePerPack }); setModal('edit') }}>
                      {t('admin.editUserData')}
                    </ActionFull>
                    <ActionFull color="#30D158" onClick={() => { setWalletAmount(''); setModal('wallet') }}>
                      {t('admin.adjustWalletBalance')}
                    </ActionFull>
                    <ActionFull color="#FF9F0A" onClick={() => setModal('relapse')}>
                      {t('admin.resetStreak')}
                    </ActionFull>
                    <ActionFull color="#FF3B30" onClick={() => setModal('delete')}>
                      {t('admin.deleteUser')}
                    </ActionFull>
                  </div>
                </PremiumGlassCard>
              </div>
            )}
          </>
        )}

        {/* ════════════════ STATS TAB ════════════════ */}
        {!loading && !error && tab === 'stats' && overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <PremiumGlassCard glow="none" padding="p-5">
              <p className="text-sm text-white/50 mb-4">{t('admin.usersByStage')}</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData} layout="vertical">
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.2)" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.2)" fontSize={11} width={60} />
                    <Tooltip contentStyle={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', fontSize:12 }} />
                    <Bar dataKey="value" radius={[0,6,6,0]}>
                      {stageData.map((s,i) => (
                        <rect key={i} fill={s.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PremiumGlassCard>

            <PremiumGlassCard glow="none" padding="p-5">
              <p className="text-sm text-white/50 mb-4">{t('admin.usersByTriggerType')}</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={triggerData} layout="vertical">
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.2)" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.2)" fontSize={11} width={60} />
                    <Tooltip contentStyle={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', fontSize:12 }} />
                    <Bar dataKey="value" fill="#BF5AF2" radius={[0,6,6,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PremiumGlassCard>

            <PremiumGlassCard glow="none" padding="p-5">
              <p className="text-sm text-white/50 mb-4">{t('admin.riskDistribution')}</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { level: 'Low',    value: overview.riskBuckets.low },
                    { level: 'Medium', value: overview.riskBuckets.medium },
                    { level: 'High',   value: overview.riskBuckets.high },
                  ]} layout="vertical">
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.2)" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="level" type="category" stroke="rgba(255,255,255,0.2)" fontSize={11} width={50} />
                    <Tooltip contentStyle={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', fontSize:12 }} />
                    <Bar dataKey="value" fill="#FF3B30" radius={[0,6,6,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PremiumGlassCard>

            <PremiumGlassCard glow="none" padding="p-5">
              <p className="text-sm text-white/50 mb-4">{t('admin.platformSummary')}</p>
              <div className="space-y-3 mt-2">
                {[
                  [t('admin.totalOnboardedUsers'),     users.length,                                              '#fff'],
                  [t('admin.earlyStageSummary'),     stageData[0].value,                                       '#FF3B30'],
                  [t('admin.progressStageSummary'), stageData[1].value,                                       '#BF5AF2'],
                  [t('admin.freedomStageSummary'),   stageData[2].value,                                       '#FFD60A'],
                  [t('admin.totalWalletBalance'),       `$${totalBalance.toFixed(2)}`,                            '#30D158'],
                  [t('admin.avgDaysSmokeFreeSummary'),        avgDays,                                                  '#64D2FF'],
                  [t('admin.usersInactiveSummary'),     users.filter(u => { const la = u.lastActiveAt?.toDate?.() || (u.lastActiveAt ? new Date(u.lastActiveAt) : null); return la && (Date.now()-la.getTime())/86400000 > 2 }).length, '#FF9F0A'],
                ].map(([label, val, color]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-white/40 text-sm">{label}</span>
                    <span className="font-num font-semibold text-sm" style={{ color }}>{val}</span>
                  </div>
                ))}
              </div>
            </PremiumGlassCard>

          </div>
        )}
      </div>

      {/* ════════════════ MODALS ════════════════ */}

      {modal === 'edit' && selectedUser && (
        <Modal title={t('admin.editUserData')} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label={t('admin.quitDate')} type="date" value={editForm.quitDate || ''} onChange={v => setEditForm(p => ({...p, quitDate: v}))} />
            <Field label={t('admin.cigsPerDay')} type="number" value={editForm.cigsPerDay || ''} onChange={v => setEditForm(p => ({...p, cigsPerDay: v}))} />
            <Field label={t('admin.pricePerPack')} type="number" value={editForm.pricePerPack || ''} onChange={v => setEditForm(p => ({...p, pricePerPack: v}))} />
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm">{t('admin.cancel')}</button>
            <button onClick={handleEditSave} disabled={actionLoading}
              className="flex-1 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-sm font-semibold disabled:opacity-50">
              {actionLoading ? t('admin.saving') : t('admin.save')}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'wallet' && selectedUser && (
        <Modal title={t('admin.adjustWalletBalance')} onClose={() => setModal(null)}>
          <p className="text-white/40 text-sm mb-4">
            {t('admin.currentBalance')}: <span className="text-green-400 font-num font-semibold">${selectedUser.balance.toFixed(2)}</span>
          </p>
          <div className="flex gap-2 mb-3">
            {['add','subtract'].map(op => (
              <button key={op} onClick={() => setWalletOp(op)}
                className={`flex-1 py-2 rounded-xl border text-sm capitalize transition-colors
                  ${walletOp === op ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-white/10 text-white/40'}`}>
                {op === 'add' ? t('admin.add') : t('admin.subtract')}
              </button>
            ))}
          </div>
          <Field label={t('admin.amountUsd')} type="number" value={walletAmount} onChange={setWalletAmount} />
          <div className="flex gap-2 mt-5">
            <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm">{t('admin.cancel')}</button>
            <button onClick={handleWallet} disabled={actionLoading || !walletAmount}
              className="flex-1 py-2 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-sm font-semibold disabled:opacity-50">
              {actionLoading ? t('admin.updating') : t('admin.confirm')}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'relapse' && selectedUser && (
        <Modal title={t('admin.resetStreak')} onClose={() => setModal(null)}>
          <p className="text-white/60 text-sm mb-2">
            {t('admin.resetStreakConfirm', { name: selectedUser.displayName || selectedUser.email })}
          </p>
          <p className="text-white/30 text-xs mb-5">{t('admin.walletUnaffected')}</p>
          <div className="flex gap-2">
            <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm">{t('admin.cancel')}</button>
            <button onClick={handleResetStreak} disabled={actionLoading}
              className="flex-1 py-2 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-semibold disabled:opacity-50">
              {actionLoading ? t('admin.resetting') : t('admin.resetToDay0')}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'delete' && selectedUser && (
        <Modal title={t('admin.deleteUser')} onClose={() => setModal(null)}>
          <p className="text-white/60 text-sm mb-1">
            {t('admin.deleteUserConfirm', { name: selectedUser.displayName || selectedUser.email })}
          </p>
          <p className="text-red-400/70 text-xs mb-5">⚠ {t('admin.deleteWarning')}</p>
          <div className="flex gap-2">
            <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 text-sm">{t('admin.cancel')}</button>
            <button onClick={handleDeleteUser} disabled={actionLoading}
              className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-semibold disabled:opacity-50">
              {actionLoading ? t('admin.deleting') : t('admin.delete')}
            </button>
          </div>
        </Modal>
      )}

      {adminWalletOpen && (
        <Modal title={t('admin.adminWallet')} onClose={() => setAdminWalletOpen(false)}>
          <div className="space-y-3">
            <p className="text-white/40 text-sm mb-2">{t('admin.adminCurrentBalance')}: <span className="text-green-400 font-num font-semibold">${overview ? (overview.adminBalance || 0).toFixed(2) : '0.00'}</span></p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {['card','paypal','bank','wish'].map(k => (
                <button key={k} onClick={() => setAdminMethod(k)}
                  className={`py-2 rounded-xl text-sm transition-all ${adminMethod === k ? 'border-white/50 bg-white/8 text-white' : 'border-white/10 text-white/40'}`}>
                  {k === 'card' ? 'Card' : k === 'paypal' ? 'PayPal' : k === 'bank' ? 'Bank' : 'Gift'}
                </button>
              ))}
            </div>

            <div>
              <label className="text-white/40 text-xs mb-1 block">{t('admin.amountUsd')}</label>
              <input type="number" value={adminAmount} onChange={e => setAdminAmount(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={async () => {
                setAdminProcessing(true)
                try {
                  await depositToWallet(ADMIN_UID, Number(adminAmount), adminMethod)
                  setActionMsg(`✓ ${t('admin.messages.walletUpdated')}`)
                  await loadAll()
                  setAdminWalletOpen(false)
                } catch (e) { setActionMsg(`✗ ${t('admin.messages.actionFailed', { message: e.message })}`) }
                setAdminProcessing(false)
              }}
                disabled={adminProcessing}
                className="flex-1 py-2 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-sm font-semibold disabled:opacity-50">
                {adminProcessing ? t('admin.updating') : t('admin.deposit')}
              </button>

              <button onClick={async () => {
                setAdminProcessing(true)
                try {
                  await withdrawFromWallet(ADMIN_UID, Number(adminAmount))
                  setActionMsg(`✓ ${t('admin.messages.userUpdated')}`)
                  await loadAll()
                  setAdminWalletOpen(false)
                } catch (e) { setActionMsg(`✗ ${t('admin.messages.actionFailed', { message: e.message })}`) }
                setAdminProcessing(false)
              }}
                disabled={adminProcessing}
                className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-semibold disabled:opacity-50">
                {adminProcessing ? t('admin.updating') : t('admin.withdraw')}
              </button>
            </div>
            {/* recent transactions */}
            <div className="mt-4 bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs space-y-2">
              <p className="text-white/40 text-sm mb-2">{t('admin.recentTransactions')}</p>
              {adminTransactions.length === 0 && (
                <p className="text-white/30 text-center py-2">{t('admin.noTransactions')}</p>
              )}
              {adminTransactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center">
                  <div className="text-white/40 truncate mr-2">{tx.type || 'Tx'}</div>
                  <div className={`font-num font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.amount?.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── tiny helper components ────────────────────────────────────────────────────

function ActionBtn({ color, onClick, children }) {
  return (
    <button onClick={onClick}
      className="px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
      style={{ background: color + '18', color, border: `1px solid ${color}33` }}>
      {children}
    </button>
  )
}

function ActionFull({ color, onClick, children }) {
  return (
    <button onClick={onClick}
      className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-left transition-colors"
      style={{ background: color + '15', color, border: `1px solid ${color}25` }}>
      {children}
    </button>
  )
}

function Field({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="text-white/40 text-xs mb-1 block">{label}</label>
      <input type={type} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-white/30" />
    </div>
  )
}
