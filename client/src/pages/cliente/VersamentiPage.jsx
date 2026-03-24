import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Edit3, X, Save, Landmark, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'
import { formatEuro, formatData, formatDataInput, giorniDaOggi, cn } from '@/lib/utils'
import { TIPI_VERSAMENTO, CATEGORIE_FISCALI } from '@/lib/constants'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useOutletContext } from 'react-router-dom'

const INITIAL_FORM = {
  tipo: 'irpef_acconto',
  categoria: 'irpef',
  importo: '',
  dataScadenza: '',
  dataPagamento: '',
  riferimentoPeriodo: '',
  note: '',
}

export default function VersamentiPage() {
  const { anno } = useOutletContext()
  const [versamenti, setVersamenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [anno])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await api.get('/versamenti', { params: { anno } })
      setVersamenti(res.data.data?.versamenti || [])
    } catch (err) {
      console.error('Errore caricamento versamenti:', err)
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setForm(INITIAL_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(v) {
    setForm({
      tipo: v.tipo,
      categoria: v.categoria,
      importo: v.importo,
      dataScadenza: formatDataInput(v.dataScadenza),
      dataPagamento: v.dataPagamento ? formatDataInput(v.dataPagamento) : '',
      riferimentoPeriodo: v.riferimentoPeriodo || '',
      note: v.note || '',
    })
    setEditingId(v._id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        importo: parseFloat(form.importo),
        dataPagamento: form.dataPagamento || undefined,
      }
      if (editingId) {
        await api.put(`/versamenti/${editingId}`, payload)
      } else {
        await api.post('/versamenti', payload)
      }
      setShowForm(false)
      setEditingId(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/versamenti/${deleteId}`)
      setDeleteId(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore eliminazione')
    }
  }

  async function marcaPagato(id) {
    try {
      await api.patch(`/versamenti/${id}/pagato`, { dataPagamento: new Date().toISOString() })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore')
    }
  }

  const filtered = versamenti.filter((v) => {
    if (catFilter && v.categoria !== catFilter) return false
    return true
  })

  // Dividi in scaduti, prossimi, pagati
  const now = new Date()
  const scaduti = filtered.filter(v => !v.pagato && new Date(v.dataScadenza) < now)
  const prossimi = filtered.filter(v => !v.pagato && new Date(v.dataScadenza) >= now)
  const pagati = filtered.filter(v => v.pagato)

  const totaleVersato = pagati.reduce((s, v) => s + v.importo, 0)
  const totaleDaVersare = [...scaduti, ...prossimi].reduce((s, v) => s + v.importo, 0)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Versamenti Fiscali"
        subtitle={`Anno ${anno} · Versato ${formatEuro(totaleVersato)} · Da versare ${formatEuro(totaleDaVersare)}`}
        actionLabel="Nuovo Versamento"
        actionIcon={Plus}
        onAction={openNew}
      />

      {/* Filtri categoria */}
      <div className="flex gap-2">
        {[
          { key: '', label: 'Tutti' },
          ...Object.entries(CATEGORIE_FISCALI).map(([k, v]) => ({ key: k, label: v })),
        ].map((c) => (
          <button
            key={c.key}
            onClick={() => setCatFilter(c.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              catFilter === c.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Scaduti */}
      {scaduti.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600 mb-3">
            <AlertTriangle className="w-4 h-4" /> Scaduti ({scaduti.length})
          </h3>
          <div className="space-y-2">
            {scaduti.map((v) => (
              <VersamentoCard key={v._id} v={v} onEdit={openEdit} onDelete={setDeleteId} onPaga={marcaPagato} isScaduto />
            ))}
          </div>
        </div>
      )}

      {/* Prossimi */}
      {prossimi.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-600 mb-3">
            <Clock className="w-4 h-4" /> Prossime scadenze ({prossimi.length})
          </h3>
          <div className="space-y-2">
            {prossimi.map((v) => (
              <VersamentoCard key={v._id} v={v} onEdit={openEdit} onDelete={setDeleteId} onPaga={marcaPagato} />
            ))}
          </div>
        </div>
      )}

      {/* Pagati */}
      {pagati.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-green-600 mb-3">
            <CheckCircle className="w-4 h-4" /> Pagati ({pagati.length})
          </h3>
          <div className="space-y-2">
            {pagati.map((v) => (
              <VersamentoCard key={v._id} v={v} onEdit={openEdit} onDelete={setDeleteId} isPagato />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <EmptyState icon={Landmark} title="Nessun versamento" description="Registra i tuoi versamenti fiscali per monitorare le scadenze." />
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-lg">{editingId ? 'Modifica Versamento' : 'Nuovo Versamento'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {Object.entries(TIPI_VERSAMENTO).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                  <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {Object.entries(CATEGORIE_FISCALI).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€) *</label>
                <input type="number" step="0.01" min="0" required value={form.importo}
                  onChange={(e) => setForm({ ...form, importo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza *</label>
                  <input type="date" required value={form.dataScadenza}
                    onChange={(e) => setForm({ ...form, dataScadenza: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagamento</label>
                  <input type="date" value={form.dataPagamento}
                    onChange={(e) => setForm({ ...form, dataPagamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periodo di riferimento</label>
                <input type="text" value={form.riferimentoPeriodo}
                  onChange={(e) => setForm({ ...form, riferimentoPeriodo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Es. 1° semestre 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annulla</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />{saving ? 'Salvataggio...' : editingId ? 'Aggiorna' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} title="Elimina Versamento"
        message="Sei sicuro di voler eliminare questo versamento?"
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} variant="danger" />
    </div>
  )
}

function VersamentoCard({ v, onEdit, onDelete, onPaga, isScaduto, isPagato }) {
  const giorni = giorniDaOggi(v.dataScadenza)
  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 flex items-center gap-4 transition-all hover:shadow-sm',
      isScaduto ? 'border-red-200 bg-red-50/30' : isPagato ? 'border-green-200 bg-green-50/30' : 'border-gray-100'
    )}>
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        isScaduto ? 'bg-red-100' : isPagato ? 'bg-green-100' : 'bg-amber-100'
      )}>
        <Landmark className={cn('w-5 h-5', isScaduto ? 'text-red-600' : isPagato ? 'text-green-600' : 'text-amber-600')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{TIPI_VERSAMENTO[v.tipo] || v.tipo}</p>
        <p className="text-xs text-gray-500">
          Scadenza: {formatData(v.dataScadenza)}
          {giorni !== null && !isPagato && (
            <span className={cn('ml-2', giorni < 0 ? 'text-red-500 font-medium' : giorni <= 30 ? 'text-amber-500' : '')}>
              ({giorni < 0 ? `${Math.abs(giorni)}gg fa` : `tra ${giorni}gg`})
            </span>
          )}
        </p>
        {v.riferimentoPeriodo && <p className="text-xs text-gray-400">{v.riferimentoPeriodo}</p>}
      </div>
      <p className="font-semibold text-sm whitespace-nowrap">{formatEuro(v.importo)}</p>
      <div className="flex items-center gap-1">
        {!isPagato && onPaga && (
          <button onClick={() => onPaga(v._id)}
            className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Marca come pagato">
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => onEdit(v)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
          <Edit3 className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(v._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
