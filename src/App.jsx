
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { StageProvider } from './hooks/useStage'
import { AuthProvider, useAuth } from './lib/AuthContext'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import { lazy, Suspense, useState, useEffect } from 'react'
import NotificationPopup from './components/NotificationPopup'
// Lazy-load every protected page so the initial bundle stays small
// (Firebase + recharts + framer-motion only load on demand).
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CravingGuardPage = lazy(() => import('./pages/CravingGuardPage'))
const WalletPage = lazy(() => import('./pages/WalletPage'))
const JourneyPage = lazy(() => import('./pages/JourneyPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const CommunityPage = lazy(() => import('./pages/CommunityPage'))
const PassportPage = lazy(() => import('./pages/PassportPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function FullScreenSpinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/40" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading, role } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenSpinner />

  if (!user) return <Navigate to="/auth" replace />
  if (role === 'admin' && location.pathname !== '/wallet' && location.pathname !== '/admin') {
    return <Navigate to="/admin" replace />
  }

  return <Suspense fallback={<FullScreenSpinner />}>{children}</Suspense>
}

function AdminRoute({ children }) {
  const { user, loading, role } = useAuth()

  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/auth" replace />
  if (role !== 'admin') return <Navigate to="/dashboard" replace />

  return <Suspense fallback={<FullScreenSpinner />}>{children}</Suspense>
}
function AppRoutes() {
  const { streakDays, user } = useAuth()

  return (
    <StageProvider streakDays={streakDays}>
      {user && <NotificationPopup />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/craving" element={<ProtectedRoute><CravingGuardPage /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
          <Route path="/journey" element={<ProtectedRoute><JourneyPage /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/passport" element={<ProtectedRoute><PassportPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </BrowserRouter>
    </StageProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
