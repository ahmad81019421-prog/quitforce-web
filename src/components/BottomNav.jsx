import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Wallet, Map, BarChart3, Users, Award, LogOut } from 'lucide-react'
import { useStage } from '../hooks/useStage'
import { useAuth } from '../lib/AuthContext'

const USER_ITEMS = [
  { to: '/dashboard', icon: LayoutGrid, key: 'dashboard' },
  { to: '/wallet', icon: Wallet, key: 'wallet' },
  { to: '/journey', icon: Map, key: 'journey' },
  { to: '/stats', icon: BarChart3, key: 'stats' },
  { to: '/community', icon: Users, key: 'community' },
  { to: '/passport', icon: Award, key: 'passport' }
]

const ADMIN_ITEMS = [
  { to: '/admin', icon: LayoutGrid, key: 'admin' },
  { to: '/wallet', icon: Wallet, key: 'wallet' }
]

export default function BottomNav() {
  const { t } = useTranslation()
  const { tokens } = useStage()
  const { logout, role } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/auth', { replace: true })
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-black/80 backdrop-blur-2xl">
      <div className="max-w-2xl mx-auto grid grid-cols-7">
        {(role === 'admin' ? ADMIN_ITEMS : USER_ITEMS).map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center gap-1 py-2.5 text-[10px]"
            style={({ isActive }) => ({ color: isActive ? tokens.color : 'rgba(255,255,255,0.4)' })}
          >
            <Icon size={18} strokeWidth={2} />
            <span className="truncate">{t(`nav.${key}`)}</span>
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-white/40 hover:text-stage-early transition-colors"
          aria-label={t('nav.logout')}
        >
          <LogOut size={18} strokeWidth={2} />
          <span className="truncate">{t('nav.logout')}</span>
        </button>
      </div>
    </nav>
  )
}
