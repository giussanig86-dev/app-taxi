import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, TrendingUp, Receipt, FileText, Landmark, Car, Calculator, Clock, Upload } from 'lucide-react'
import ImportRegistroIvaModal from '@/components/shared/ImportRegistroIvaModal'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '@/lib/api'
import { formatEuro, formatData, cn, MESI } from '@/lib/utils'
import { CATEGORIE_COSTI, TIPI_VERSAMENTO } from '@/lib/constants'
import StatCard from '@/components/shared/StatCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import StatusBadge from '@/components/shared/StatusBadge'
import { useOutletContext } from 'react-router-dom'

export default function ClienteDetailPage() {
  const { id } = useParams()
  const { anno } = useOutletContext()
  const [cliente, setCliente] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('panoramica')
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id, anno])

  async function fetchData() {
    setLoading(true)
    try {
      const [clienteRes, dashRes] = await Promise.all([
        api.get(`/users/clienti/${id}`),
        api.get(`/dashboard/cliente`, { params: { anno, clienteId: id } }),
      ])
      setCliente(clienteRes.data.data)
      setDashboard(dashRes.data.data)
    } catch (err) {
      console.error('Errore caricamento dettaglio cliente:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!cliente) return <div className="text-center text-gray-500 py-10">Cliente non trovato</div>

  const d = dashboard || {}
  const tabs = [
    { key: 'panoramica', label: 'Panoramica', icon: TrendingUp },
    { key: 'corrispettivi', label: 'Corrispettivi', icon: Receipt },
    { key: 'costi', label: 'Costi', icon: Receipt },
    { key: 'fatture', label: 'Fatture', icon: FileText },
    { key: 'versamenti', label: 'Versamenti', icon: Landmark },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/consulente/clienti" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
            {cliente.nome?.charAt(0)}{cliente.cognome?.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cliente.nome} {cliente.cognome}</h1>
            <p className="text-sm text-gray-500">{cliente.email} · Anno {anno}</p>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ricavi" value={formatEuro(d.totaleRicavi || 0)} icon={TrendingUp} color="success" />
        <StatCard title="Costi" value={formatEuro(d.totaleCosti || 0)} icon={Receipt} color="danger" />
        <StatCard title="Imposta" value={formatEuro(d.calcoloFiscale?.impostaSostitutiva || d.calcoloFiscale?.irpefNetta || 0)} icon={Calculator} color="warning" />
        <StatCard title="INPS" value={formatEuro(d.calcoloFiscale?.contributiINPS || 0)} icon={Landmark} color="primary" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Panoramica */}
      {activeTab === 'panoramica' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Andamento mensile */}
          {d.andamentoMensile && d.andamentoMensile.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Andamento Mensile Ricavi</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={d.andamentoMensile.map(m => ({ ...m, mese: MESI[m.mese - 1]?.substring(0, 3) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatEuro(v)} />
                  <Bar dataKey="totale" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Calcolo fiscale */}
          {d.calcoloFiscale && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Dettaglio Calcolo Fiscale</h3>
              <div className="space-y-3">
                {[
                  { label: 'Ricavi lordi', value: d.calcoloFiscale.ricaviLordi },
                  { label: `Reddito imponibile (${d.calcoloFiscale.coefficiente || 67}%)`, value: d.calcoloFiscale.redditoImponibile },
                  { label: 'Contributi INPS (24,48%)', value: d.calcoloFiscale.contributiINPS },
                  { label: 'Reddito netto', value: d.calcoloFiscale.redditoNetto },
                  { label: d.calcoloFiscale.impostaSostitutiva != null ? 'Imposta Sostitutiva' : 'IRPEF Netta', value: d.calcoloFiscale.impostaSostitutiva || d.calcoloFiscale.irpefNetta },
                  { label: 'Totale imposte + INPS', value: d.calcoloFiscale.totaleImposte },
                ].filter(r => r.value != null).map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{row.label}</span>
                    <span className="text-sm font-semibold">{formatEuro(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Corrispettivi */}
      {activeTab === 'corrispettivi' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Importo</th>
                  <th className="px-4 py-3 font-medium">Metodo</th>
                  <th className="px-4 py-3 font-medium">Numerazione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(d.corrispettivi || []).map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">{formatData(c.data)}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatEuro(c.importo)}</td>
                    <td className="px-4 py-3">{c.metodoPagamento}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.numerazione || '-'}</td>
                  </tr>
                ))}
                {(!d.corrispettivi || d.corrispettivi.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nessun corrispettivo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Costi */}
      {activeTab === 'costi' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Costi</span>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Importa Registro IVA
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Descrizione</th>
                  <th className="px-4 py-3 font-medium">Importo</th>
                  <th className="px-4 py-3 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(d.costi || []).map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">{formatData(c.data)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORIE_COSTI[c.categoria]?.color }} />
                        {CATEGORIE_COSTI[c.categoria]?.label || c.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3">{c.descrizione}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{formatEuro(c.importo)}</td>
                    <td className="px-4 py-3">{c.statoApprovazione}</td>
                  </tr>
                ))}
                {(!d.costi || d.costi.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessun costo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Fatture */}
      {activeTab === 'fatture' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Importo</th>
                  <th className="px-4 py-3 font-medium">Stato SDI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(d.fatture || []).map((f) => (
                  <tr key={f._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs">{f.numero}</td>
                    <td className="px-4 py-3">{formatData(f.data)}</td>
                    <td className="px-4 py-3">{f.cliente?.denominazione || '-'}</td>
                    <td className="px-4 py-3 font-semibold">{formatEuro(f.importoNetto)}</td>
                    <td className="px-4 py-3"><StatusBadge status={f.statoSdi} type="sdi" /></td>
                  </tr>
                ))}
                {(!d.fatture || d.fatture.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessuna fattura</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Versamenti */}
      {activeTab === 'versamenti' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Scadenza</th>
                  <th className="px-4 py-3 font-medium">Importo</th>
                  <th className="px-4 py-3 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(d.versamenti || []).map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">{TIPI_VERSAMENTO[v.tipo] || v.tipo}</td>
                    <td className="px-4 py-3">{formatData(v.dataScadenza)}</td>
                    <td className="px-4 py-3 font-semibold">{formatEuro(v.importo)}</td>
                    <td className="px-4 py-3">
                      {v.pagato ? (
                        <span className="text-green-600 text-xs font-medium">Pagato {formatData(v.dataPagamento)}</span>
                      ) : (
                        <span className="text-amber-600 text-xs font-medium">Da pagare</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!d.versamenti || d.versamenti.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nessun versamento</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && (
        <ImportRegistroIvaModal
          clienteId={id}
          anno={anno}
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); fetchData() }}
        />
      )}
    </div>
  )
}
