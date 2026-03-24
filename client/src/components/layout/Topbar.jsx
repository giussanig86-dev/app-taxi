import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Menu, LogOut, User, ChevronDown, LayoutDashboard } from 'lucide-react'
import { useNavigate, NavLink } from 'react-router-dom'

export default function Topbar({ onMenuClick, anno, onAnnoChange }) {
  const { user, logout, isCliente } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const currentYear = new Date().getFullYear()
  const anni = [currentYear, currentYear - 1, currentYear - 2]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border px-4 lg:px-6">
      <div className="flex items-center justify-between h-14 relative">
        {/* Left: menu button + year selector */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-text-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Anno selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary hidden sm:block">Anno fiscale:</span>
            <select
              value={anno}
              onChange={(e) => onAnnoChange(parseInt(e.target.value))}
              className="text-sm font-semibold bg-gray-50 border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-light focus:border-transparent"
            >
              {anni.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: home icon (solo cliente, solo mobile) */}
        {isCliente && (
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `absolute left-1/2 -translate-x-1/2 lg:hidden p-2 rounded-lg transition-colors ${
                isActive ? 'text-primary bg-primary/5' : 'text-text-secondary hover:bg-gray-100'
              }`
            }
            title="Dashboard"
          >
            <LayoutDashboard className="w-5 h-5" />
          </NavLink>
        )}

        {/* Right: user menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.nome?.[0]}{user?.cognome?.[0]}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-text-primary leading-none">
                {user?.nome} {user?.cognome}
              </p>
              <p className="text-[11px] text-text-secondary capitalize">{user?.ruolo?.replace('_', ' ')}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={() => { navigate('/profilo'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50"
                >
                  <User className="w-4 h-4" />
                  Profilo
                </button>
                <hr className="my-1 border-border" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Esci
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
