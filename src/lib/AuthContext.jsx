import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, onSnapshot } from 'firebase/firestore'

const AuthContext = createContext({
  user: null,
  loading: true,
  role: 'user',
  profile: null,
  streakDays: 0,
  logout: async () => {}
})

/**
 * Derive the user's smoke-free streak (in whole days) from their Firestore
 * profile. Centralising this here means every page reads the same value
 * and the StageProvider in App.jsx always gets the correct color tokens.
 */
function computeStreakDays(profile) {
  if (!profile?.quitDate) return 0
  const ms = Date.now() - new Date(profile.quitDate).getTime()
  return Math.max(0, Math.floor(ms / 86400000))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('user')
  const [profile, setProfile] = useState(null)

  // Subscribe to the user's profile doc so `streakDays` is always live
  // for every page (Dashboard, Journey, Passport, Craving Guard).
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    })
    return unsub
  }, [user])

  // Refresh the custom-claim role every time the user changes.
  useEffect(() => {
    if (!user) {
      setRole('user')
      return
    }
    user.getIdTokenResult(true).then((r) => setRole(r.claims.role || 'user')).catch(() => setRole('user'))

  }, [user])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const logout = async () => {
    await signOut(auth)
    setProfile(null)
    setRole('user')
  }

  const streakDays = computeStreakDays(profile)

  return (
    <AuthContext.Provider value={{ user, loading, role, profile, streakDays, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
