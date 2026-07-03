import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PremiumGlassCard from '../components/PremiumGlassCard'
import SpringCounter from '../components/SpringCounter'
import BottomNav from '../components/BottomNav'
import LanguageSwitch from '../components/LanguageSwitch'
import { useStage } from '../hooks/useStage'
import { useAuth } from '../lib/AuthContext'
import { watchWallet, watchTransactions, depositToWallet, withdrawFromWallet } from '../lib/firestore'

// ── Demo card numbers per method ─────────────────────────────────────────────
const DEMO_CARDS = {
  card:   { number: '4242 4242 4242 4242', expiry: '12/27', cvv: '•••', holder: 'AHMAD USER',  network: 'VISA' },
  paypal: { email: 'demo@quitforce.app',   pass: '••••••••' },
  bank:   { iban: 'LB62 0999 0000 0001 0019 0122 9114', swift: 'BYBLOSBBXXX', name: 'QuitForce Savings' },
  wish:   { code: 'QUIT-DEMO-2025-FREE' },
}

const METHOD_ICONS = {
  card:   '💳',
  paypal: '🅿',
  bank:   '🏦',
  wish:   '🎁',
}

const METHOD_LABELS = {
  card:   'Credit / Debit Card',
  paypal: 'PayPal',
  bank:   'Bank Transfer',
  wish:   'Gift Card',
}

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtCard(v) {
  return v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim()
}
function fmtExpiry(v) {
  const d = v.replace(/\D/g,'').slice(0,4)
  return d.length > 2 ? d.slice(0,2) + ' / ' + d.slice(2) : d
}
function genRef() {
  return 'QF' + Math.random().toString(36).slice(2,10).toUpperCase()
}
function fmtTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

// ── sub-components ───────────────────────────────────────────────────────────

function Stepper({ step }) {
  const steps = ['Method', 'Details', 'Confirm', 'Done']
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
            ${i < step ? 'bg-green-500 text-black' : i === step ? 'bg-white text-black' : 'bg-white/10 text-white/30'}`}>
            {i < step ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 transition-colors ${i < step ? 'bg-green-500/60' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, type='text', maxLength, hint, readOnly, mono }) {
  return (
    <div>
      <label className="text-white/40 text-xs mb-1 block">{label}</label>
      <input
        type={type} value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none
          focus:border-white/30 placeholder:text-white/20 transition-colors
          ${readOnly ? 'opacity-60 cursor-default' : ''}
          ${mono ? 'font-num tracking-wider' : ''}`}
      />
      {hint && <p className="text-white/25 text-[10px] mt-1">{hint}</p>}
    </div>
  )
}

// ── main ─────────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const { t } = useTranslation()
  const { tokens, stage } = useStage()
  const { user } = useAuth()

  const [wallet, setWallet]           = useState(null)
  const [transactions, setTransactions] = useState([])
  const [amount, setAmount]           = useState(20)
  const [method, setMethod]           = useState('card')
  const [tilt, setTilt]               = useState({ x: 0, y: 0 })
  const [depositing, setDepositing]   = useState(false)
  const [step, setStep]               = useState(0)   // 0=method 1=details 2=confirm 3=done
  const [showHistory, setShowHistory] = useState(false)
  const [processingDots, setProcessingDots] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  // card form state
  const [cardNum, setCardNum]   = useState('')
  const [expiry, setExpiry]     = useState('')
  const [cvv, setCvv]           = useState('')
  const [holder, setHolder]     = useState('')
  const [ppEmail, setPpEmail]   = useState('')
  const [ppPass, setPpPass]     = useState('')
  const [giftCode, setGiftCode] = useState('')
  const [txRef, setTxRef]       = useState('')

  useEffect(() => {
    if (!user) return
    const u1 = watchWallet(user.uid, setWallet)
    const u2 = watchTransactions(user.uid, setTransactions)
    return () => { u1(); u2() }
  }, [user])

  // keep withdrawAmount in sync with balance when wallet loads
  useEffect(() => {
    if (wallet && typeof wallet.balance === 'number') setWithdrawAmount(Number(wallet.balance.toFixed(2)))
  }, [wallet])

  // animate processing dots
  useEffect(() => {
    if (!depositing) return
    const id = setInterval(() => setProcessingDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(id)
  }, [depositing])

  function handleCardMove(e) {
    const r  = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left)  / r.width  - 0.5
    const py = (e.clientY - r.top)   / r.height - 0.5
    setTilt({ x: py * -10, y: px * 14 })
  }

  function fillDemo() {
    const d = DEMO_CARDS[method]
    if (method === 'card')   { setCardNum(d.number); setExpiry(d.expiry); setCvv(d.cvv); setHolder(d.holder) }
    if (method === 'paypal') { setPpEmail(d.email); setPpPass(d.pass) }
    if (method === 'wish')   { setGiftCode(d.code) }
  }

  function canProceed() {
    if (step === 0) return true
    if (step === 1) {
      if (method === 'card')   return cardNum.replace(/\s/g,'').length === 16 && expiry.length >= 4 && cvv.length >= 3 && holder.length > 2
      if (method === 'paypal') return ppEmail.includes('@') && ppPass.length >= 4
      if (method === 'bank')   return true
      if (method === 'wish')   return giftCode.length >= 4
    }
    if (step === 2) return amount > 0 && Number.isFinite(amount)
    return true
  }

  async function handleNext() {
    if (step < 2) { setStep(s => s + 1); return }
    // step 2 → confirm → deposit
    const ref = genRef()
    setTxRef(ref)
    setDepositing(true)
    setStep(3)
    try {
      await depositToWallet(user.uid, amount, method)
    } catch (err) {
      console.error('Deposit failed:', err)
    } finally {
      setDepositing(false)
    }
  }

  function handleReset() {
    setStep(0); setCardNum(''); setExpiry(''); setCvv(''); setHolder('')
    setPpEmail(''); setPpPass(''); setGiftCode('')
  }

  const balance = wallet?.balance ?? 0
  const loading = wallet === null

  return (
    <div className="ambient-bg min-h-screen w-full pb-28">
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div />
          <LanguageSwitch />
        </div>

        {/* ── Credit card ── */}
        {loading ? (
          <div className="h-48 rounded-3xl bg-white/[0.04] border border-white/10 animate-pulse" />
        ) : (
          <motion.div
            onMouseMove={handleCardMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            animate={{ rotateX: tilt.x, rotateY: tilt.y }}
            transition={{ type: 'spring', stiffness: 150, damping: 14 }}
            style={{ perspective: 800 }}
            className="relative h-48 rounded-3xl p-6 overflow-hidden border border-white/10 select-none"
          >
            {/* gradient bg */}
            <div aria-hidden className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${tokens.dim} 0%, #000 55%, ${tokens.color}44 100%)` }} />
            {/* holographic lines */}
            <div aria-hidden className="absolute inset-0 opacity-20"
              style={{ background: 'repeating-linear-gradient(115deg,transparent 0 20px,rgba(255,255,255,0.08) 20px 22px)' }} />
            {/* chip */}
            <div aria-hidden className="absolute top-6 right-6 w-8 h-6 rounded-md border border-white/20 bg-gradient-to-br from-yellow-300/40 to-yellow-600/20" />

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center justify-between">
                <span className="font-display text-white/80 text-sm tracking-widest">QUITFORCE</span>
                <span className="text-white/60 text-xs font-semibold tracking-wider">
                  {METHOD_LABELS[method] === 'Credit / Debit Card' ? (cardNum ? DEMO_CARDS.card.network : 'VISA') : METHOD_LABELS[method].toUpperCase()}
                </span>
              </div>

              {/* card number display */}
              <div className="font-num text-lg text-white/80 tracking-[0.2em]">
                {method === 'card'
                  ? (cardNum || '•••• •••• •••• ••••')
                  : method === 'paypal'
                    ? (ppEmail || 'demo@quitforce.app')
                    : method === 'bank'
                      ? 'IBAN ••••••••••'
                      : (giftCode || 'GIFT-CODE-••••')}
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/30 text-[9px] uppercase tracking-widest mb-0.5">{t('wallet.balance')}</p>
                  <SpringCounter value={balance} decimals={2} prefix="$"
                    className="font-num text-2xl text-white font-semibold" />
                </div>
                {method === 'card' && (
                  <div className="text-right">
                    <p className="text-white/30 text-[9px] uppercase tracking-widest mb-0.5">Expires</p>
                    <p className="font-num text-sm text-white/70">{expiry || '••/••'}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* demo notice */}
        <p className="text-center text-[11px] text-white/25 flex items-center justify-center gap-1.5">
          <span>🔒</span> Demo mode — no real money moves
        </p>

        {/* ── Deposit flow ── */}
        <PremiumGlassCard padding="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-semibold text-sm">Deposit Funds</p>
            {step > 0 && step < 3 && (
              <button onClick={handleReset} className="text-white/30 text-xs hover:text-white transition-colors">
                ← Start over
              </button>
            )}
          </div>

          <Stepper step={step} />

          <AnimatePresence mode="wait">

            {/* STEP 0 — choose method */}
            {step === 0 && (
              <motion.div key="step0" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
                <p className="text-white/40 text-xs mb-3">Select payment method</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Object.entries(METHOD_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => setMethod(key)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm transition-all
                        ${method === key
                          ? 'border-white/50 bg-white/8 text-white'
                          : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'}`}>
                      <span className="text-lg">{METHOD_ICONS[key]}</span>
                      <span className="font-medium text-xs">{label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={fillDemo}
                  className="w-full text-[11px] text-white/25 hover:text-white/50 transition-colors py-1">
                  ✦ Fill with demo data
                </button>
              </motion.div>
            )}

            {/* STEP 1 — payment details */}
            {step === 1 && (
              <motion.div key="step1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
                className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span>{METHOD_ICONS[method]}</span>
                  <p className="text-white/50 text-xs">{METHOD_LABELS[method]}</p>
                  <button onClick={fillDemo}
                    className="ml-auto text-[10px] text-white/25 hover:text-white/50 transition-colors">
                    ✦ Demo fill
                  </button>
                </div>

                {method === 'card' && <>
                  <InputField label="Card Number" value={cardNum}
                    onChange={v => setCardNum(fmtCard(v))}
                    placeholder="0000 0000 0000 0000" maxLength={19} mono />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Expiry" value={expiry}
                      onChange={v => setExpiry(fmtExpiry(v))}
                      placeholder="MM / YY" maxLength={7} mono />
                    <InputField label="CVV" value={cvv}
                      onChange={v => setCvv(v.replace(/\D/g,'').slice(0,4))}
                      placeholder="•••" type="password" maxLength={4} />
                  </div>
                  <InputField label="Cardholder Name" value={holder}
                    onChange={v => setHolder(v.toUpperCase())}
                    placeholder="FULL NAME" mono />
                </>}

                {method === 'paypal' && <>
                  <InputField label="PayPal Email" value={ppEmail}
                    onChange={setPpEmail} placeholder="you@email.com" type="email" />
                  <InputField label="Password" value={ppPass}
                    onChange={setPpPass} placeholder="••••••••" type="password" />
                  <p className="text-white/20 text-[10px] text-center">🔒 Secured by PayPal — Demo Mode</p>
                </>}

                {method === 'bank' && <>
                  <InputField label="IBAN" value={DEMO_CARDS.bank.iban} readOnly mono
                    hint="Demo bank account — pre-filled" />
                  <InputField label="SWIFT / BIC" value={DEMO_CARDS.bank.swift} readOnly mono />
                  <InputField label="Account Name" value={DEMO_CARDS.bank.name} readOnly />
                  <p className="text-white/20 text-[10px] text-center mt-1">Bank transfers typically take 1-3 business days</p>
                </>}

                {method === 'wish' && <>
                  <InputField label="Gift Card Code" value={giftCode}
                    onChange={v => setGiftCode(v.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX" mono />
                  <p className="text-white/20 text-[10px] text-center">
                    Try: <span className="text-white/40 font-num">QUIT-DEMO-2025-FREE</span>
                  </p>
                </>}
              </motion.div>
            )}

            {/* STEP 2 — amount & confirm */}
            {step === 2 && (
              <motion.div key="step2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
                <p className="text-white/40 text-xs mb-3">Choose amount to deposit</p>

                {/* quick amounts */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[10, 20, 50, 100].map(v => (
                    <button key={v} onClick={() => setAmount(v)}
                      className={`rounded-xl py-2 text-sm font-num font-semibold border transition-all
                        ${amount === v ? 'border-white/50 bg-white/10 text-white' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                      ${v}
                    </button>
                  ))}
                </div>

                <InputField label="Custom amount ($)" type="number"
                  value={amount} onChange={v => setAmount(Number(v))} />

                {/* summary box */}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-xs">
                  <Row label="Method" value={`${METHOD_ICONS[method]} ${METHOD_LABELS[method]}`} />
                  <Row label="Amount" value={`$${Number(amount).toFixed(2)}`} bold color="text-green-400" />
                  <Row label="Fee" value="$0.00 (Demo)" />
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <Row label="You receive" value={`$${Number(amount).toFixed(2)}`} bold color="text-white" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — processing / done */}
            {step === 3 && (
              <motion.div key="step3" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                className="text-center py-4">
                {depositing ? (
                  <>
                    <div className="w-12 h-12 mx-auto rounded-full border-2 border-white/20 border-t-white animate-spin mb-4" />
                    <p className="text-white font-semibold mb-1">Processing{processingDots}</p>
                    <p className="text-white/40 text-xs">Connecting to {METHOD_LABELS[method]}</p>
                  </>
                ) : (
                  <>
                    <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:200,damping:10}}
                      className="w-14 h-14 mx-auto rounded-full bg-green-500/20 border border-green-500/40
                        flex items-center justify-center text-2xl mb-4">
                      ✓
                    </motion.div>
                    <p className="text-white font-semibold mb-1">Deposit Successful</p>
                    <p className="text-green-400 font-num text-lg font-bold mb-3">+${Number(amount).toFixed(2)}</p>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-left space-y-1.5 text-xs mb-4">
                      <Row label="Reference" value={txRef} mono />
                      <Row label="Method" value={METHOD_LABELS[method]} />
                      <Row label="Status" value="Completed ✓" color="text-green-400" />
                      <Row label="New Balance" value={`$${balance.toFixed(2)}`} bold color="text-white" />
                    </div>
                    <button onClick={handleReset}
                      className="w-full rounded-xl py-2.5 border border-white/10 text-white/60 text-sm hover:text-white hover:border-white/20 transition-colors">
                      Make another deposit
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* next button */}
          {step < 3 && (
            <motion.button
              onClick={handleNext}
              disabled={!canProceed() || depositing}
              className="w-full rounded-xl py-3 mt-5 text-sm font-semibold text-black disabled:opacity-30 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${tokens.color}, ${tokens.dim})` }}
              whileTap={{ scale: 0.98 }}>
              {step === 0 ? 'Continue →'
                : step === 1 ? 'Review Amount →'
                : 'Confirm Deposit'}
            </motion.button>
          )}
        </PremiumGlassCard>

        {/* ── Withdraw (available at Freedom stage) ── */}
        {stage === 'freedom' && (
          <PremiumGlassCard padding="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-semibold text-sm">Withdraw Funds</p>
              <p className="text-white/30 text-xs">Available after 30 days smoke-free</p>
            </div>

            <p className="text-white/40 text-xs mb-3">You may withdraw funds from your wallet now.</p>

            <div className="space-y-3">
              <div>
                <label className="text-white/40 text-xs mb-1 block">Amount ($)</label>
                <input type="number" value={withdrawAmount}
                  onChange={e => setWithdrawAmount(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                />
              </div>

              {withdrawSuccess ? (
                <div className="text-center">
                  <p className="text-green-400 font-semibold">Withdrawal successful</p>
                </div>
              ) : (
                <button onClick={async () => {
                  if (!user) return
                  if (!withdrawAmount || withdrawAmount <= 0) return
                  if (withdrawAmount > (wallet?.balance || 0)) return
                  setWithdrawing(true)
                  try {
                    await withdrawFromWallet(user.uid, Number(withdrawAmount))
                    setWithdrawSuccess(true)
                  } catch (err) {
                    console.error('Withdraw failed:', err)
                    // TODO: show user-facing error
                  } finally {
                    setWithdrawing(false)
                  }
                }}
                disabled={withdrawing || !(withdrawAmount > 0 && withdrawAmount <= (wallet?.balance || 0))}
                className="w-full rounded-xl py-3 text-sm font-semibold text-black transition-opacity"
                style={{ background: `linear-gradient(135deg, ${tokens.color}, ${tokens.dim})` }}>
                  {withdrawing ? 'Processing…' : 'Confirm Withdraw'}
                </button>
              )}
            </div>
          </PremiumGlassCard>
        )}

        {/* ── Transaction history ── */}
        <PremiumGlassCard padding="p-5">
          <button onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between">
            <p className="text-sm text-white/60">Transaction History</p>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs">{transactions.length} records</span>
              <span className="text-white/40 text-xs">{showHistory ? '▲' : '▼'}</span>
            </div>
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                className="overflow-hidden">
                <div className="mt-4 space-y-2">
                  {transactions.length === 0 && (
                    <p className="text-white/20 text-xs text-center py-4">No transactions yet</p>
                  )}
                  {transactions.map((tx) => {
                    const isPos   = tx.amount > 0
                    const icon    = tx.type === 'deposit' ? '↓' : tx.type === 'penalty' ? '⚠' : '★'
                    const label   = tx.type === 'deposit' ? 'Deposit'
                                  : tx.type === 'penalty' ? 'Inactivity Penalty'
                                  : 'Milestone Reward'
                    const subLabel = tx.type === 'deposit'
                                  ? (tx.method ? METHOD_LABELS[tx.method] || tx.method : 'Manual')
                                  : tx.type === 'penalty'
                                  ? `Rate: ${tx.rate ? (tx.rate*100).toFixed(0) : '5'}%`
                                  : ''
                    return (
                      <div key={tx.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0
                          ${isPos ? 'bg-green-500/15 text-green-400' : tx.type === 'penalty' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{label}</p>
                          <p className="text-white/30 text-[10px] truncate">
                            {subLabel && <span className="mr-2">{subLabel}</span>}
                            {fmtTime(tx.createdAt)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-num font-semibold text-sm ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                            {isPos ? '+' : ''}{tx.amount?.toFixed(2)}
                          </p>
                          <p className="text-white/20 text-[10px]">USD</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PremiumGlassCard>

      </div>
      <BottomNav />
    </div>
  )
}

// ── tiny helpers ──────────────────────────────────────────────────────────────
function Row({ label, value, bold, color, mono }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/40">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${color || 'text-white/70'} ${mono ? 'font-num' : ''}`}>
        {value}
      </span>
    </div>
  )
}
