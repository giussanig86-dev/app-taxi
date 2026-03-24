import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  Receipt, FileText, Wallet, Car, Landmark,
  Users, CheckSquare, MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

const clienteTabs = [
  { to: '/corrispettivi', label: 'Incassi', icon: Receipt },
  { to: '/fatture', label: 'Fatture', icon: FileText },
  { to: '/costi', label: 'Costi', icon: Wallet },
  { to: '/chilometri', label: 'Km', icon: Car },
  { to: '/versamenti', label: 'Versamenti', icon: Landmark },
]

const consulenteTabs = [
  { to: '/consulente', label: 'Home', icon: Users },
  { to: '/consulente/clienti', label: 'Clienti', icon: Users },
  { to: '/consulente/approvazioni', label: 'Approva', icon: CheckSquare },
  { to: '/consulente/impostazioni', label: 'Altro', icon: MoreHorizontal },
]

export default function MobileNav() {
  const { isCliente } = useAuth()
  const tabs = isCliente ? clienteTabs : consulenteTabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border lg:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/consulente'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[52px]',
                  isActive ? 'text-primary' : 'text-text-secondary'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">{tab.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
