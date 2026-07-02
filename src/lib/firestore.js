import {
  doc, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot, increment, serverTimestamp,
  collection, addDoc, query, orderBy, limit, onSnapshot as onCollectionSnapshot,
  arrayUnion, arrayRemove, getDocs, writeBatch, where
} from 'firebase/firestore'
import { db } from './firebase'
import { ADMIN_UID } from './adminConfig'
/* ───────────────────────── User profile ───────────────────────── */

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: serverTimestamp()
  }, { merge: true })
}



export async function withdrawFromWallet(uid, amount) {
  const walletRef = doc(db, 'wallets', uid)
  const snap = await getDoc(walletRef)
  if (!snap.exists()) throw new Error('No wallet found')
  const balance = snap.data().balance || 0
  if (amount > balance) throw new Error('Insufficient balance')

  const batch = writeBatch(db)
  batch.update(walletRef, { balance: increment(-amount) })
  batch.set(doc(collection(db, 'wallets', uid, 'transactions')), {
    type: 'withdrawal',
    amount: -amount,
    createdAt: serverTimestamp()
  })
  await batch.commit()
}





export function watchUserProfile(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), data)
}

/* Saves onboarding answers + the user's signature + starts the quit clock
   + creates the wallet doc — all in a single batch so a failure rolls back
   every change (no orphan wallet without a profile, no signed contract
   without a quitDate, etc.). */
export async function completeOnboarding(uid, {
  cigsPerDay, yearsSmoking, pricePerPack, trigger, profileType,
  depositAmount, signatureDataUrl
}) {
  const batch = writeBatch(db)

  batch.set(doc(db, 'users', uid), {
    cigsPerDay, yearsSmoking, pricePerPack, trigger, profileType,
    depositAmount,
    quitDate: new Date().toISOString(),
    onboardingComplete: true,
    commitmentSignature: {
      dataUrl: signatureDataUrl,
      signedAt: new Date().toISOString(),
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    }
  }, { merge: true })

  batch.set(doc(db, 'wallets', uid), {
    balance: depositAmount,
    lockedAmount: depositAmount,
    createdAt: serverTimestamp()
  }, { merge: true })

  if (depositAmount > 0) {
    batch.set(doc(collection(db, 'wallets', uid, 'transactions')), {
      type: 'deposit',
      amount: depositAmount,
      method: 'initial-commitment',
      createdAt: serverTimestamp()
    })
  }

  await batch.commit()
}

/* ───────────────────────── Wallet ───────────────────────── */

export function watchWallet(uid, callback) {
  return onSnapshot(doc(db, 'wallets', uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : { balance: 0, lockedAmount: 0 })
  })
}

export function watchTransactions(uid, callback) {
  const q = query(collection(db, 'wallets', uid, 'transactions'), orderBy('createdAt', 'desc'), limit(30))
  return onCollectionSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function depositToWallet(uid, amount, method) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'wallets', uid), { balance: increment(amount) }, { merge: true })
  batch.set(doc(collection(db, 'wallets', uid, 'transactions')), {
    type: 'deposit', amount, method, createdAt: serverTimestamp()
  })
  await batch.commit()
}

export async function applyWalletReward(uid, amount, reason) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'wallets', uid), { balance: increment(amount) }, { merge: true })
  batch.set(doc(collection(db, 'wallets', uid, 'transactions')), {
    type: 'reward', amount, reason, createdAt: serverTimestamp()
  })
  await batch.commit()
}

/* ───────────────────────── Craving logs ───────────────────────── */

export async function logCraving(uid, { outcome, count = null, reason = null }) {
  await addDoc(collection(db, 'users', uid, 'cravingLogs'), {
    outcome, count, reason, createdAt: serverTimestamp()
  })
}

export function watchCravingLogs(uid, callback, max = 100) {
  const q = query(collection(db, 'users', uid, 'cravingLogs'), orderBy('createdAt', 'desc'), limit(max))
  return onCollectionSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

/* Escalating penalty rate: 5% on the 1st over-limit event, 10% on the 2nd, 20% on the 3rd+. */
export function penaltyRateFor(priorPenaltyCount) {
  if (priorPenaltyCount >= 2) return 0.20
  if (priorPenaltyCount === 1) return 0.10
  return 0.05
}

/* Helper: today's date as YYYY-MM-DD (local time), used to track how many
   cigarettes the user has already logged today against their current weekly
   reduction target. */
function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getReductionWeeks(cigsPerDay) {
  if (cigsPerDay <= 5) return 4
  if (cigsPerDay <= 10) return 5
  if (cigsPerDay <= 15) return 6
  if (cigsPerDay <= 20) return 7
  return 8
}

export function buildReductionPlan(cigsPerDay) {
  const totalWeeks = getReductionWeeks(cigsPerDay)
  return Array.from({ length: totalWeeks }, (_, index) => {
    const week = index + 1
    return {
      week,
      target: Math.max(0, Math.round(cigsPerDay * (1 - week / totalWeeks)))
    }
  })
}

export function getCurrentReductionTarget(cigsPerDay, quitDate) {
  if (!cigsPerDay || !quitDate) return cigsPerDay
  const totalWeeks = getReductionWeeks(cigsPerDay)
  const days = Math.max(0, Math.floor((Date.now() - new Date(quitDate).getTime()) / 86400000))
  const currentWeek = Math.min(totalWeeks, Math.floor(days / 7) + 1)
  return Math.max(0, Math.round(cigsPerDay * (1 - currentWeek / totalWeeks)))
}

/* New single entry point when the user reports smoking.
   - If today's running total (including this log) stays within the current
     week's reduction target: no wallet penalty, no streak reset.
   - If it goes over the current target: applies the escalating penalty
     (capped at the current wallet balance so it can never go negative), bumps
     penaltyCount, but does NOT touch quitDate. The caller (UI) must call
     restartStreak() separately, and only if the user explicitly confirms.
*/
export async function recordSmoke(uid, { count, reason }) {
  const [userSnap, walletSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'wallets', uid))
  ])
  const u = userSnap.exists() ? userSnap.data() : {}
  const limit = getCurrentReductionTarget(u.cigsPerDay || 0, u.quitDate || null)
  const today = todayKey()
  const countedToday = u.todaySmokedDate === today ? (u.todaySmokedCount || 0) : 0
  const newTotal = countedToday + count
  const overLimit = newTotal > limit

  const batch = writeBatch(db)

  batch.set(doc(collection(db, 'users', uid, 'cravingLogs')), {
    outcome: overLimit ? 'smoked-over-limit' : 'smoked-within-limit',
    count, reason, totalToday: newTotal, limit, createdAt: serverTimestamp()
  })

 batch.set(doc(db, 'users', uid), {
    todaySmokedDate: today,
    todaySmokedCount: newTotal,
    lastCheckinDate: today
  }, { merge: true })

  let rate = 0
  let amount = 0

  if (overLimit) {
    const priorPenaltyCount = u.penaltyCount || 0
    const balance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0
    rate = penaltyRateFor(priorPenaltyCount)
    amount = Math.min(Math.round(balance * rate * 100) / 100, balance)

  if (amount > 0) {
      batch.update(doc(db, 'wallets', uid), { balance: increment(-amount) })
      batch.set(doc(db, 'wallets', ADMIN_UID), { balance: increment(amount) }, { merge: true })
      batch.set(doc(collection(db, 'wallets', uid, 'transactions')), {
        type: 'penalty', amount: -amount, reason: `over-limit-${reason}`, rate, createdAt: serverTimestamp()
      })
      batch.set(doc(collection(db, 'wallets', ADMIN_UID, 'transactions')), {
        type: 'penalty-collected', amount, fromUid: uid, reason: `over-limit-${reason}`, rate, createdAt: serverTimestamp()
      })
    }

    batch.update(doc(db, 'users', uid), { penaltyCount: increment(1) })
  }

  await batch.commit()

  return { overLimit, rate, amount, totalToday: newTotal, limit }
}

/* Only called if the user explicitly chooses to restart their quit streak
   after breaking their daily limit. Does NOT touch the wallet. */
export async function restartStreak(uid) {
  await setDoc(doc(db, 'users', uid), { quitDate: new Date().toISOString() }, { merge: true })
}


/* ─────────── Daily check-in (يُسأل مرة واحدة كل يوم عند فتح التطبيق) ─────────── */

// هل المستخدم لسا ما جاوب سؤال اليوم؟
export function needsDailyCheckin(profile) {
  if (!profile?.onboardingComplete) return false
  return profile.lastCheckinDate !== todayKey()
}

/* يُستدعى لما يجاوب "لا، ما دخّنت اليوم" */
export async function recordNoSmoke(uid) {
  const batch = writeBatch(db)
  batch.set(doc(collection(db, 'users', uid, 'cravingLogs')), {
    outcome: 'no-smoke-checkin', count: 0, reason: null, createdAt: serverTimestamp()
  })
  batch.set(doc(db, 'users', uid), { lastCheckinDate: todayKey() }, { merge: true })
  await batch.commit()
}





/* ───────────────────────── Activity heartbeat (for the inactivity cron job) ───────────────────────── */

export async function pingActive(uid) {
  await setDoc(doc(db, 'users', uid), { lastActiveAt: serverTimestamp() }, { merge: true })
}

export async function saveFcmToken(uid, token) {
  await setDoc(doc(db, 'users', uid), { fcmToken: token }, { merge: true })
}

/* ───────────────────────── Community ───────────────────────── */

export function watchPosts(callback, max = 30) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(max))
  return onCollectionSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function createPost(uid, name, text, achievement = null) {
  await addDoc(collection(db, 'posts'), {
    uid, name, text, achievement,
    likedBy: [],
    commentsCount: 0,
    createdAt: serverTimestamp()
  })
}

export async function toggleLike(postId, uid, currentlyLiked) {
  await updateDoc(doc(db, 'posts', postId), {
    likedBy: currentlyLiked ? arrayRemove(uid) : arrayUnion(uid)
  })
}
/* ─────────── إشعارات الأدمن للمستخدم ─────────── */

export async function pushNotification(uid, { title, body, kind = 'info' }) {
  await addDoc(collection(db, 'users', uid, 'notifications'), {
    title, body, kind, read: false, createdAt: serverTimestamp()
  })
}

export function watchNotifications(uid, callback) {
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(10)
  )
  return onCollectionSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function markNotificationRead(uid, notifId) {
  await updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true })
}

/* ─────────── إجراءات الأدمن (كلها بتبعت إشعار للمستخدم المتأثر) ─────────── */

export async function adminUpdateUser(uid, changes) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid), changes)
  batch.set(doc(collection(db, 'users', uid, 'notifications')), {
    title: 'تحديث من الإدارة',
    body: 'تم تعديل بيانات حسابك من قبل فريق QuitForce.',
    // prefer client-side i18n key when available
    i18nKey: 'admin.notifications.userUpdated',
    i18nParams: {},
    kind: 'info', read: false, createdAt: serverTimestamp()
  })
  await batch.commit()
}

export async function adminResetStreak(uid) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid), { quitDate: new Date().toISOString(), penaltyCount: 0 })
  batch.set(doc(collection(db, 'users', uid, 'notifications')), {
    title: 'تمت إعادة عدّاد الأيام',
    body: 'أعاد فريق الإدارة عدّاد أيامك النظيفة إلى الصفر.',
    kind: 'warning', read: false, createdAt: serverTimestamp()
  })
  await batch.commit()
}

export async function adminDeleteUser(uid) {
  await deleteDoc(doc(db, 'users', uid))
  await deleteDoc(doc(db, 'wallets', uid))
}

/* تحويل حقيقي بين محفظة الأدمن ومحفظة المستخدم.
   op='add'      → من محفظة الأدمن إلى محفظة المستخدم
   op='subtract' → من محفظة المستخدم إلى محفظة الأدمن
   بيرفض العملية إذا الطرف المصدر ما عنده رصيد كافي. */
export async function adminTransferWallet(uid, amount, op) {
  const [userWalletSnap, adminWalletSnap] = await Promise.all([
    getDoc(doc(db, 'wallets', uid)),
    getDoc(doc(db, 'wallets', ADMIN_UID))
  ])
  const userBalance = userWalletSnap.exists() ? (userWalletSnap.data().balance || 0) : 0
  const adminBalance = adminWalletSnap.exists() ? (adminWalletSnap.data().balance || 0) : 0

  if (op === 'add' && amount > adminBalance) {
    throw new Error('رصيد محفظة الأدمن غير كافٍ لإتمام هذا التحويل')
  }
  if (op === 'subtract' && amount > userBalance) {
    throw new Error('رصيد المستخدم غير كافٍ لخصم هذا المبلغ')
  }

  const batch = writeBatch(db)

  if (op === 'add') {
    batch.set(doc(db, 'wallets', uid), { balance: increment(amount) }, { merge: true })
    batch.set(doc(db, 'wallets', ADMIN_UID), { balance: increment(-amount) }, { merge: true })
  } else {
    batch.set(doc(db, 'wallets', uid), { balance: increment(-amount) }, { merge: true })
    batch.set(doc(db, 'wallets', ADMIN_UID), { balance: increment(amount) }, { merge: true })
  }

  batch.set(doc(collection(db, 'wallets', uid, 'transactions')), {
    type: op === 'add' ? 'admin-deposit' : 'admin-withdrawal',
    amount: op === 'add' ? amount : -amount,
    reason: 'admin-adjustment', createdAt: serverTimestamp()
  })

  batch.set(doc(collection(db, 'users', uid, 'notifications')), {
    title: op === 'add' ? 'تم إيداع مبلغ بمحفظتك' : 'تم خصم مبلغ من محفظتك',
    body: op === 'add'
      ? `أضاف فريق الإدارة $${amount.toFixed(2)} لمحفظتك.`
      : `خصم فريق الإدارة $${amount.toFixed(2)} من محفظتك.`,
    // client will prefer these i18n values if present
    i18nKey: op === 'add' ? 'admin.notifications.walletDeposited' : 'admin.notifications.walletDeducted',
    i18nParams: { amount: amount.toFixed(2) },
    kind: op === 'add' ? 'success' : 'warning',
    read: false, createdAt: serverTimestamp()
  })

  await batch.commit()
}
/* ───────────────────────── Admin aggregates ─────────────────────────
   Demo-scale only: reads onboarded users client-side (filtered + capped
   at 500 to keep cost predictable). For a real production admin panel
   with many users, move this to a Callable Cloud Function / scheduled
   aggregation job instead — see README.md "Known simplifications". */

export async function fetchAdminOverview() {
  const usersSnap = await getDocs(
    query(collection(db, 'users'),
      where('onboardingComplete', '==', true),
      limit(500))
  )
  const users = usersSnap.docs
    .filter(d => d.id !== ADMIN_UID)
    .map((d) => ({ id: d.id, ...d.data() }))

  const totalUsers = users.length
  const freedomUsers = users.filter((u) => {
    if (!u.quitDate) return false
    const days = (Date.now() - new Date(u.quitDate).getTime()) / 86400000
    return days >= 30
  }).length
  const successRate = totalUsers ? Math.round((freedomUsers / totalUsers) * 100) : 0

  const riskBuckets = { low: 0, medium: 0, high: 0 }
  users.forEach((u) => {
    if (!u.quitDate) return
    const days = (Date.now() - new Date(u.quitDate).getTime()) / 86400000
    const risk = Math.max(8, 70 - days * 4)
    if (risk > 60) riskBuckets.high += 1
    else if (risk > 30) riskBuckets.medium += 1
    else riskBuckets.low += 1
  })

  return { totalUsers, successRate, riskBuckets }
}