import { useState, useEffect } from 'react'
import { Users, UserCheck, UserX, TrendingUp, Euro } from 'lucide-react'
import api from '@/lib/api'
import { formatEuro } from '@/lib/utils'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

function StatBox({ icon: Icon, label, value, color = 'primary' }) {
  const colors = {
    primary: 'bg-blue-50 text-blue-600',
    success: 'bg-green-50 text-green-600',
    danger:  'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    purple:  'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pannello Amministrazione</h1>
        <p className="text-sm text-gray-500 mt-1">Statistiche piattaforma in tempo reale</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox icon={Users}     label="Consulenti Totali"  value={stats?.totConsulenti ?? '–'} color="primary" />
        <StatBox icon={UserCheck} label="Consulenti Attivi"  value={stats?.consulentiAttivi ?? '–'} color="success" />
        <StatBox icon={UserX}     label="Sospesi"            value={stats?.consulentiSospesi ?? '–'} color="danger" />
        <StatBox icon={TrendingUp} label="Clienti Totali"    value={stats?.totClienti ?? '–'} color="purple" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-xs">
        <p className="text-xs text-gray-500 mb-1">MRR Stimato</p>
        <p className="text-3xl font-bold text-green-600">{formatEuro(stats?.mrr ?? 0)}</p>
        <p className="text-xs text-gray-400 mt-1">da consulenti con abbonamento attivo</p>
      </div>
    </div>
  )
}
