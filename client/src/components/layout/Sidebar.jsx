import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, Receipt, FileText, Wallet, Calendar,
  Gauge, User, Users, CheckSquare, Settings, X, Car, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

const clienteLinks = [
  { to: '/dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/corrispettivi',  label: 'Corrispettivi', icon: Receipt },
  { to: '/fatture',        label: 'Fatture',       icon: FileText },
  { to: '/costi',          label: 'Costi',         icon: Wallet },
  { to: '/versamenti',     label: 'Versamenti',    icon: Calendar },
  { to: '/chilometri',     label: 'Chilometri',    icon: Gauge },
  { to: '/profilo',        label: 'Profilo',       icon: User },
]

const consulenteLinks = [
  { to: '/consulente',               label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/consulente/clienti',       label: 'Clienti',      icon: Users },
  { to: '/consulente/approvazioni',  label: 'Approvazioni', icon: CheckSquare },
  { to: '/consulente/impostazioni',  label: 'Impostazioni', icon: Settings },
]

const adminLinks = [
  { to: '/admin',            label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/admin/consulenti', label: 'Consulenti',  icon: Users },
]

const RUOLO_LABEL = {
  cliente:     'Tassista',
  consulente:  'Consulente',
  super_admin: 'Super Admin',
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, isCliente, isConsulente, isSuperAdmin } = useAuth()

  const links = isSuperAdmin
    ? adminLinks
    : isConsulente
      ? consulenteLinks
      : clienteLinks

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 bg-bg-sidebar text-white transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-light rounded-lg flex items-center justify-center">
              {isSuperAdmin ? <ShieldCheck className="w-5 h-5 text-white" /> : <Car className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">CalcoloTaxi</h1>
              <p className="text-[11px] text-white/50">
                {isSuperAdmin ? 'Amministrazione' : 'Forfettario SaaS'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-3 border-b border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            {RUOLO_LABEL[user?.ruolo] || user?.ruolo}
          </p>
          <p className="text-sm font-medium text-white/90 truncate">
            {user?.nome} {user?.cognome}
          </p>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1 flex-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/dashboard' || link.to === '/consulente' || link.to === '/admin'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-light text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  )
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {link.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[10px] text-white/30 text-center">
            Calcolatore Forfettario v1.0
          </p>
        </div>
      </aside>
    </>
  )
}
