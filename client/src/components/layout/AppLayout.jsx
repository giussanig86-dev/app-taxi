import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import MobileNav from './MobileNav'
import VoiceFAB from '@/components/shared/VoiceFAB'
import { useAuth } from '@/hooks/useAuth'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [refreshKey, setRefreshKey] = useState(0)
  const { user } = useAuth()
  const location = useLocation()

  const isCliente = user?.ruolo === 'cliente'

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          anno={anno}
          onAnnoChange={setAnno}
        />

        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-x-hidden">
          <Outlet context={{ anno, refreshKey }} />
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />

        {/* Voice FAB - solo per clienti */}
        {isCliente && (
          <VoiceFAB onSaved={() => setRefreshKey(k => k + 1)} />
        )}
      </div>
    </div>
  )
}
