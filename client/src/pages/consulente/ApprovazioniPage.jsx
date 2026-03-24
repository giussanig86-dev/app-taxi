import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Search, Filter, AlertCircle } from 'lucide-react'
import api from '@/lib/api'
import { formatEuro, formatData, cn } from '@/lib/utils'
import { CATEGORIE_COSTI } from '@/lib/constants'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

export default function ApprovazioniPage() {
  const [costi, setCosti] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // { id, action, descrizione }
  const [motivoRifiuto, setMotivoRifiuto] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchCosti()
  }, [])

  async function fetchCosti() {
    setLoading(true)
    try {
      const res = await api.get('/costi/da-approvare')
      setCosti(res.data.data?.costi || [])
    } catch (err) {
      console.error('Errore caricamento costi da approvare:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprova(id) {
    setProcessing(true)
    try {
      await api.patch(`/costi/${id}/approva`)
      fetchCosti()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore approvazione')
    } finally {
      setProcessing(false)
    }
  }

  async function handleRifiuta() {
    if (!confirmAction) return
    setProcessing(true)
    try {
      await api.patch(`/costi/${confirmAction.id}/rifiuta`, { motivo: motivoRifiuto })
      setConfirmAction(null)
      setMotivoRifiuto('')
      fetchCosti()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore rifiuto')
    } finally {
      setProcessing(false)
    }
  }

  async function handleApprovaAll() {
    if (!confirm('Approvare tutti i costi in attesa?')) return
    setProcessing(true)
    try {
      for (const c of filtered) {
        await api.patch(`/costi/${c._id}/approva`)
      }
      fetchCosti()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore approvazione multipla')
    } finally {
      setProcessing(false)
    }
  }

  const filtered = costi.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.descrizione?.toLowerCase().includes(q) ||
           c.fornitore?.toLowerCase().includes(q) ||
           c.userId?.nome?.toLowerCase().includes(q) ||
           c.userId?.cognome?.toLowerCase().includes(q)
  })

  const totalePendente = filtered.reduce((s, c) => s + c.importo, 0)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvazioni Costi"
        subtitle={`${filtered.length} costi in attesa · Totale ${formatEuro(totalePendente)}`}
      />

      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per descrizione, fornitore o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <button onClick={handleApprovaAll} disabled={processing}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Approva tutti
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Nessun costo da approvare"
          description="Tutti i costi dei tuoi clienti sono stati revisionati."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c._id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (CATEGORIE_COSTI[c.categoria]?.color || '#6b7280') + '15' }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: CATEGORIE_COSTI[c.categoria]?.color || '#6b7280' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{c.descrizione}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.userId?.nome} {c.userId?.cognome} · {CATEGORIE_COSTI[c.categoria]?.label || c.categoria} · {formatData(c.data)}
                      </p>
                      {c.fornitore && <p className="text-xs text-gray-400 mt-0.5">Fornitore: {c.fornitore}</p>}
                      {c.note && <p className="text-xs text-gray-400 mt-1 italic">"{c.note}"</p>}
                    </div>
                    <p className="font-semibold text-red-600 whitespace-nowrap">{formatEuro(c.importo)}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => handleApprova(c._id)} disabled={processing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50">
                      <CheckCircle className="w-3.5 h-3.5" /> Approva
                    </button>
                    <button onClick={() => setConfirmAction({ id: c._id, action: 'rifiuta', descrizione: c.descrizione })}
                      disabled={processing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" /> Rifiuta
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal rifiuto con motivo */}
      {confirmAction?.action === 'rifiuta' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-lg text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Rifiuta Costo
              </h3>
              <p className="text-sm text-gray-500 mt-1">"{confirmAction.descrizione}"</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del rifiuto</label>
                <textarea
                  value={motivoRifiuto}
                  onChange={(e) => setMotivoRifiuto(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 resize-none"
                  placeholder="Specifica il motivo del rifiuto..."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setConfirmAction(null); setMotivoRifiuto('') }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Annulla
                </button>
                <button onClick={handleRifiuta} disabled={processing}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
                  {processing ? 'Rifiutando...' : 'Conferma Rifiuto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
