import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRedirect } from './RoleRedirect'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import ClienteDashboard from '@/pages/cliente/DashboardPage'
import CorrispettiviPage from '@/pages/cliente/CorrispettiviPage'
import FatturePage from '@/pages/cliente/FatturePage'
import CostiPage from '@/pages/cliente/CostiPage'
import VersamentiPage from '@/pages/cliente/VersamentiPage'
import ChilometriPage from '@/pages/cliente/ChilometriPage'
import ProfiloPage from '@/pages/cliente/ProfiloPage'
import ConsDashboard from '@/pages/consulente/DashboardPage'
import ClientiPage from '@/pages/consulente/ClientiPage'
import ClienteDetailPage from '@/pages/consulente/ClienteDetailPage'
import ApprovazioniPage from '@/pages/consulente/ApprovazioniPage'
import ImpostazioniPage from '@/pages/consulente/ImpostazioniPage'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RoleRedirect /> },

      // Cliente routes
      { path: 'dashboard', element: <ClienteDashboard /> },
      { path: 'corrispettivi', element: <CorrispettiviPage /> },
      { path: 'fatture', element: <FatturePage /> },
      { path: 'costi', element: <CostiPage /> },
      { path: 'versamenti', element: <VersamentiPage /> },
      { path: 'chilometri', element: <ChilometriPage /> },
      { path: 'profilo', element: <ProfiloPage /> },

      // Consulente routes
      { path: 'consulente', element: <ConsDashboard /> },
      { path: 'consulente/clienti', element: <ClientiPage /> },
      { path: 'consulente/clienti/:id', element: <ClienteDetailPage /> },
      { path: 'consulente/approvazioni', element: <ApprovazioniPage /> },
      { path: 'consulente/impostazioni', element: <ImpostazioniPage /> },
    ],
  },
])

export default router
