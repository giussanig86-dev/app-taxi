import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, TrendingUp, Receipt, FileText, Landmark,
  Calculator, Plus, Trash2, Edit3, Upload, CheckCircle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '@/lib/api'
import { formatEuro, formatData, cn, MESI } from '@/lib/utils'
import { CATEGORIE_COSTI, TIPI_VERSAMENTO, METODI_PAGAMENTO } from '@/lib/constants'
import StatCard from '@/components/shared/StatCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import StatusBadge from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ImportRegistroIvaModal from '@/components/shared/ImportRegistroIvaModal'
import ImportCorrispettiviModal from '@/components/shared/ImportCorrispettiviModal'
import VersamentoFormModal from '@/components/shared/VersamentoFormModal'
import CorrispettivoFormModal from '@/components/shared/CorrispettivoFormModal'
import { useOutletContext } from 'react-router-dom'

export default function ClienteDetailPage() {
  const { id } = useParams()
  const { anno } = useOutletContext()

  const [cliente, setCliente] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('panoramica')

  const [corrispettivi, setCorrispettivi] = useState(null)
  const [costi, setCosti] = useState(null)
  const [versamenti, setVersamenti] = useState(null)
  const [fatture, setFatture] = useState(null)
  const [tabLoading, setTabLoading] = useState(false)

  const [showImportCosti, setShowImportCosti] = useState(false)
  const [showImportCorrispettivi, setShowImportCorrispettivi] = useState(false)
  const [showCorrispettivoForm, setShowCorrispettivoForm] = useState(false)
  const [editingCorrispettivo, setEditingCorrispettivo] = useState(null)
  const [showVersamentoForm, setShowVersamentoForm] = useState(false)
  const [editingVersamento, setEditingVersamento] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { fetchDashboard() }, [id, anno])

  useEffect(() => {
    if (activeTab === 'corrispettivi' && corrispettivi === null) loadTab('corrispettivi')
    if (activeTab === 'costi' && costi === null) loadTab('costi')
    if (activeTab === 'versamenti' && versamenti === null) loadTab('versamenti')
    if (activeTab === 'fatture' && fatture === null) loadTab('fatture')
  }, [activeTab, corrispettivi, costi, versamenti, fatture])

  useEffect(() => {
    setCorrispettivi(null); setCosti(null); setVersamenti(null); setFatture(null)
  }, [anno])

  async function fetchDashboard() {
    setLoading(true)
    try {
      const [clienteRes, dashRes] = await Promise.all([
        api.get(`/users/clienti/${id}`),
        api.get('/dashboard/cliente', { params: { anno, userId: id } }),
      ])
      setCliente(clienteRes.data.data)
      setDashboard(dashRes.data.data)
    } catch (err) {
      console.error('Errore caricamento cliente:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadTab(tab) {
    setTabLoading(true)
    try {
      const params = { anno, userId: id, limit: 200 }
      switch (tab) {
        case 'corrispettivi': {
          const r = await api.get('/corrispettivi', { params })
          setCorrispettivi(r.data.data.corrispettivi || [])
          break
        }
        case 'costi': {
          const r = await api.get('/costi', { params })
          setCosti(r.data.data.costi || [])
          break
        }
        case 'versamenti': {
          const r = await api.get('/versamenti', { params })
          setVersamenti(r.data.data.versamenti || [])
          break
        }
        case 'fatture': {
          const r = await api.get('/fatture', { params })
          setFatture(r.data.data.fatture || [])
          break
        }
      }
    } catch (err) {
      console.error(`Errore tab ${tab}:`, err)
    } finally {
      setTabLoading(false)
    }
  }

  function reloadTab(tab) {
    if (tab === 'corrispettivi') setCorrispettivi(null)
    if (tab === 'costi') setCosti(null)
    if (tab === 'versamenti') setVersamenti(null)
    if (tab === 'fatture') setFatture(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const { type, item } = deleteTarget
      const endpoint = type === 'corrispettivo' ? 'corrispettivi' : 'versamenti'
      await api.delete(`/${endpoint}/${item._id}?userId=${id}`)
      reloadTab(type === 'corrispettivo' ? 'corrispettivi' : 'versamenti')
      setDeleteTarget(null)
    } catch (err) {
      alert(err.response?.data?.messaggio || 'Errore eliminazione')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!cliente) return <div className="text-center text-gray-500 py-10">Cliente non trovato</div>

  const riepilogo = dashboard?.riepilogoAnnuale || {}
  const kpiRicavi = riepilogo.ricavoLordo || 0
  const kpiCosti = riepilogo.totaleCosti || 0
  const kpiImposta = riepilogo.impostaSostitutiva ?? riepilogo.irpefLorda ?? 0
  const kpiINPS = riepilogo.contributiINPS || 0
  const andamentoMensile = dashboard?.andamentoMensile || []
  const calcoloFiscale = riepilogo.ricavoLordo != null ? {
    ricaviLordi: riepilogo.ricavoLordo,
    coefficiente: riepilogo.redditoImponibile && riepilogo.ricavoLordo > 0
      ? Math.round((riepilogo.redditoImponibile / riepilogo.ricavoLordo) * 100) : 67,
    redditoImponibile: riepilogo.redditoImponibile,
    contributiINPS: riepilogo.contributiINPS,
    redditoNetto: riepilogo.nettoStimato,
    impostaSostitutiva: riepilogo.impostaSostitutiva,
    irpefNetta: riepilogo.irpefLorda,
    totaleImposte: riepilogo.totaleImposteContributi,
  } : null

  const tabs = [
    { key: 'panoramica',    label: 'Panoramica',    icon: TrendingUp },
    { key: 'corrispettivi', label: 'Corrispettivi', icon: Receipt },
    { key: 'costi',         label: 'Costi',         icon: Receipt },
    { key: 'fatture',       label: 'Fatture',       icon: FileText },
    { key: 'versamenti',    label: 'Versamenti',    icon: Landmark },
  ]

  return (
    <div className="space-y-6">

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ricavi" value={formatEuro(kpiRicavi)} icon={TrendingUp} color="success" />
        <StatCard title="Costi" value={formatEuro(kpiCosti)} icon={Receipt} color="danger" />
        <StatCard title="Imposta" value={formatEuro(kpiImposta)} icon={Calculator} color="warning" />
        <StatCard title="INPS" value={formatEuro(kpiINPS)} icon={Landmark} color="primary" />
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Panoramica */}
      {activeTab === 'panoramica' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {andamentoMensile.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Andamento Mensile Ricavi</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={andamentoMensile.map(m => ({ ...m, mese: MESI[m.mese - 1]?.substring(0, 3) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatEuro(v)} />
                  <Bar dataKey="totale" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {calcoloFiscale && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Dettaglio Calcolo Fiscale</h3>
              <div className="space-y-3">
                {[
                  { label: 'Ricavi lordi', value: calcoloFiscale.ricaviLordi },
                  { label: `Reddito imponibile (${calcoloFiscale.coefficiente || 67}%)`, value: calcoloFiscale.redditoImponibile },
                  { label: 'Contributi INPS (24,48%)', value: calcoloFiscale.contributiINPS },
                  { label: 'Reddito netto stimato', value: calcoloFiscale.redditoNetto },
                  { label: calcoloFiscale.impostaSostitutiva != null ? 'Imposta Sostitutiva' : 'IRPEF Netta', value: calcoloFiscale.impostaSostitutiva ?? calcoloFiscale.irpefNetta },
                  { label: 'Totale imposte + INPS', value: calcoloFiscale.totaleImposte },
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

      {/* Corrispettivi */}
      {activeTab === 'corrispettivi' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Corrispettivi {anno}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowImportCorrispettivi(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Importa Registro
              </button>
              <button onClick={() => { setEditingCorrispettivo(null); setShowCorrispettivoForm(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Nuovo
              </button>
            </div>
          </div>
          {tabLoading && !corrispettivi ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Importo</th>
                    <th className="px-4 py-3 font-medium">Metodo</th>
                    <th className="px-4 py-3 font-medium">Note</th>
                    <th className="px-4 py-3 text-right font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(corrispettivi || []).map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">{formatData(c.data)}</td>
                      <td className="px-4 py-3 font-semibold text-green-600">{formatEuro(c.importo)}</td>
                      <td className="px-4 py-3">{METODI_PAGAMENTO[c.metodoPagamento] || c.metodoPagamento}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{c.note || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditingCorrispettivo(c); setShowCorrispettivoForm(true) }}
                            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget({ type: 'corrispettivo', item: c })}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!corrispettivi || corrispettivi.length === 0) && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessun corrispettivo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Costi */}
      {activeTab === 'costi' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Costi {anno}</span>
            <button onClick={() => setShowImportCosti(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
              <Upload className="w-3.5 h-3.5" /> Importa Registro IVA
            </button>
          </div>
          {tabLoading && !costi ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : (
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
                  {(costi || []).map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">{formatData(c.data)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORIE_COSTI[c.categoria]?.color }} />
                          {CATEGORIE_COSTI[c.categoria]?.label || c.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate">{c.descrizione || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">{formatEuro(c.importo)}</td>
                      <td className="px-4 py-3 text-xs">{c.statoApprovazione || (c.approvato ? 'approvato' : 'in_attesa')}</td>
                    </tr>
                  ))}
                  {(!costi || costi.length === 0) && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessun costo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fatture */}
      {activeTab === 'fatture' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {tabLoading && !fatture ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : (
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
                  {(fatture || []).map((f) => (
                    <tr key={f._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-xs">{f.numero}</td>
                      <td className="px-4 py-3">{formatData(f.data)}</td>
                      <td className="px-4 py-3">{f.cliente?.denominazione || '—'}</td>
                      <td className="px-4 py-3 font-semibold">{formatEuro(f.importoNetto)}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.statoSdi} type="sdi" /></td>
                    </tr>
                  ))}
                  {(!fatture || fatture.length === 0) && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessuna fattura</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Versamenti */}
      {activeTab === 'versamenti' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Versamenti fiscali {anno}</span>
            <button onClick={() => { setEditingVersamento(null); setShowVersamentoForm(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nuovo versamento
            </button>
          </div>
          {tabLoading && !versamenti ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Scadenza</th>
                    <th className="px-4 py-3 font-medium">Importo</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 text-right font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(versamenti || []).map((v) => (
                    <tr key={v._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">{TIPI_VERSAMENTO[v.tipoVersamento] || v.tipoVersamento}</td>
                      <td className="px-4 py-3">{formatData(v.dataScadenza)}</td>
                      <td className="px-4 py-3 font-semibold">{formatEuro(v.importo)}</td>
                      <td className="px-4 py-3">
                        {v.pagato ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Pagato {v.dataVersamento ? formatData(v.dataVersamento) : ''}
                          </span>
                        ) : (
                          <span className="text-amber-600 text-xs font-medium">Da pagare</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditingVersamento(v); setShowVersamentoForm(true) }}
                            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget({ type: 'versamento', item: v })}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!versamenti || versamenti.length === 0) && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessun versamento</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showImportCosti && (
        <ImportRegistroIvaModal
          clienteId={id} anno={anno}
          onClose={() => setShowImportCosti(false)}
          onSuccess={() => { setShowImportCosti(false); reloadTab('costi') }}
        />
      )}

      {showImportCorrispettivi && (
        <ImportCorrispettiviModal
          clienteId={id}
          onClose={() => setShowImportCorrispettivi(false)}
          onSuccess={() => { setShowImportCorrispettivi(false); reloadTab('corrispettivi') }}
        />
      )}

      {showCorrispettivoForm && (
        <CorrispettivoFormModal
          clienteId={id}
          corrispettivo={editingCorrispettivo}
          onClose={() => setShowCorrispettivoForm(false)}
          onSaved={() => reloadTab('corrispettivi')}
        />
      )}

      {showVersamentoForm && (
        <VersamentoFormModal
          clienteId={id}
          versamento={editingVersamento}
          onClose={() => setShowVersamentoForm(false)}
          onSaved={() => reloadTab('versamenti')}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Elimina ${deleteTarget?.type === 'corrispettivo' ? 'Corrispettivo' : 'Versamento'}`}
        message="Sei sicuro di voler eliminare questo record? L'azione non può essere annullata."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  )
}
