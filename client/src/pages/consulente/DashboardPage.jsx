import { useState, useEffect } from 'react'
import { Users, TrendingUp, AlertTriangle, Clock, Eye, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { formatEuro, formatData, cn, MESI } from '@/lib/utils'
import { COLORI_GRAFICO, PIANI_SAAS } from '@/lib/constants'
import StatCard from '@/components/shared/StatCard'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useOutletContext } from 'react-router-dom'

export default function ConsDashboardPage() {
  const { user } = useAuth()
  const { anno } = useOutletContext()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [anno])

  async function fetchDashboard() {
    setLoading(true)
    try {
      const res = await api.get('/dashboard/consulente', { params: { anno } })
      setData(res.data.data)
    } catch (err) {
      console.error('Errore dashboard consulente:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!data) return <div className="text-center text-gray-500 py-10">Errore caricamento dashboard</div>

  const piano = PIANI_SAAS[user?.piano?.tipo] || PIANI_SAAS.free
  const clientiUsati = data.totaleClienti || 0
  const clientiMax = piano.maxClienti
  const percentualeClienti = Math.min(100, (clientiUsati / clientiMax) * 100)

  // Prepara dati per grafici
  const fatturatoPer = data.clientiSummary?.map(c => ({
    nome: `${c.nome} ${c.cognome?.charAt(0) || ''}.`,
    fatturato: c.totaleCorrispettivi || 0,
  })).sort((a, b) => b.fatturato - a.fatturato).slice(0, 10) || []

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ciao ${user?.nome || 'Consulente'}`}
        subtitle={`Dashboard consulente · Anno ${anno} · Piano ${piano.label}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Clienti Attivi"
          value={clientiUsati}
          icon={Users}
          subtitle={`su ${clientiMax} disponibili`}
          color="primary"
        />
        <StatCard
          title="Fatturato Totale"
          value={formatEuro(data.fatturato?.totale || 0)}
          icon={TrendingUp}
          subtitle="tutti i clienti"
          color="success"
        />
        <StatCard
          title="Costi da Approvare"
          value={data.costiDaApprovare || 0}
          icon={Clock}
          subtitle="in attesa di revisione"
          color="warning"
        />
        <StatCard
          title="Scadenze Vicine"
          value={data.scadenzeVicine || 0}
          icon={AlertTriangle}
          subtitle="prossimi 30 giorni"
          color="danger"
        />
      </div>

      {/* Barra utilizzo piano */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Utilizzo Piano {piano.label}</p>
          <p className="text-sm text-gray-500">{clientiUsati}/{clientiMax} clienti</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              percentualeClienti >= 90 ? 'bg-red-500' : percentualeClienti >= 70 ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${percentualeClienti}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico fatturato per cliente */}
        {fatturatoPer.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Fatturato per Cliente</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fatturatoPer} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatEuro(v)} />
                <Bar dataKey="fatturato" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Lista clienti con alert */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Clienti Recenti</h3>
            <Link to="/consulente/clienti" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
              Vedi tutti <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {(data.clientiSummary || []).slice(0, 8).map((c) => (
              <Link
                key={c._id}
                to={`/consulente/clienti/${c._id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {c.nome?.charAt(0)}{c.cognome?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.nome} {c.cognome}</p>
                  <p className="text-xs text-gray-500">
                    Fatturato: {formatEuro(c.totaleCorrispettivi || 0)}
                    {c.costiPendenti > 0 && (
                      <span className="ml-2 text-amber-500 font-medium">· {c.costiPendenti} costi da approvare</span>
                    )}
                  </p>
                </div>
                <Eye className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Costi da approvare */}
      {data.costiPendenti && data.costiPendenti.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-amber-700 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Costi in Attesa di Approvazione
            </h3>
            <Link to="/consulente/approvazioni" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
              Gestisci tutti <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {data.costiPendenti.slice(0, 5).map((c) => (
              <div key={c._id} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{c.descrizione}</p>
                  <p className="text-xs text-gray-500">{c.clienteNome} · {formatData(c.data)}</p>
                </div>
                <p className="font-semibold text-sm">{formatEuro(c.importo)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
