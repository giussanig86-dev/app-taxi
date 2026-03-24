import { useState, useEffect } from 'react'
import { Plus, Search, Calendar, CreditCard, Banknote, Trash2, Edit3, X, Save, Filter } from 'lucide-react'
import api from '@/lib/api'
import { formatEuro, formatData, formatDataInput, cn, MESI } from '@/lib/utils'
import { METODI_PAGAMENTO } from '@/lib/constants'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import VoiceInput from '@/components/shared/VoiceInput'
import { useOutletContext } from 'react-router-dom'

const INITIAL_FORM = {
  data: formatDataInput(new Date()),
  importo: '',
  metodoPagamento: 'contante',
  numerazione: '',
  note: '',
}

export default function CorrispettiviPage() {
  const { anno, refreshKey } = useOutletContext()
  const [corrispettivi, setCorrispettivi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [search, setSearch] = useState('')
  const [meseFilter, setMeseFilter] = useState('')
  const [metodoFilter, setMetodoFilter] = useState('')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchData()
  }, [anno, refreshKey])

  async function fetchData() {
    setLoading(true)
    try {
      const [corrRes, statsRes] = await Promise.all([
        api.get('/corrispettivi', { params: { anno } }),
        api.get('/corrispettivi/stats/andamento', { params: { anno } }),
      ])
      setCorrispettivi(corrRes.data.data?.corrispettivi || [])
      setStats(statsRes.data.data || null)
    } catch (err) {
      console.error('Errore caricamento corrispettivi:', err)
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setForm(INITIAL_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(c) {
    setForm({
      data: formatDataInput(c.data),
      importo: c.importo,
      metodoPagamento: c.metodoPagamento,
      numerazione: c.numerazione || '',
      note: c.note || '',
    })
    setEditingId(c._id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        importo: parseFloat(form.importo),
      }
      if (editingId) {
        await api.put(`/corrispettivi/${editingId}`, payload)
      } else {
        await api.post('/corrispettivi', payload)
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
      await api.delete(`/corrispettivi/${deleteId}`)
      setDeleteId(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore eliminazione')
    }
  }

  const filtered = corrispettivi.filter((c) => {
    if (search && !c.numerazione?.toLowerCase().includes(search.toLowerCase()) &&
        !c.note?.toLowerCase().includes(search.toLowerCase())) return false
    if (meseFilter && new Date(c.data).getMonth() !== parseInt(meseFilter)) return false
    if (metodoFilter && c.metodoPagamento !== metodoFilter) return false
    return true
  })

  const totale = filtered.reduce((s, c) => s + c.importo, 0)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corrispettivi"
        subtitle={`Anno ${anno} · ${filtered.length} registrazioni · Totale ${formatEuro(totale)}`}
        actionLabel="Nuovo Corrispettivo"
        actionIcon={Plus}
        onAction={openNew}
      />

      {/* Filtri */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per numerazione o note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={meseFilter}
          onChange={(e) => setMeseFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tutti i mesi</option>
          {MESI.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={metodoFilter}
          onChange={(e) => setMetodoFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tutti i metodi</option>
          {Object.entries(METODI_PAGAMENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Riepilogo mensile */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.mese} className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-500">{MESI[s.mese - 1]?.substring(0, 3)}</p>
              <p className="text-sm font-semibold mt-1">{formatEuro(s.totale)}</p>
              <p className="text-xs text-gray-400">{s.count} reg.</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="Nessun corrispettivo"
          description="Inizia registrando il tuo primo corrispettivo giornaliero."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Numerazione</th>
                  <th className="px-4 py-3 font-medium">Importo</th>
                  <th className="px-4 py-3 font-medium">Metodo</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Note</th>
                  <th className="px-4 py-3 font-medium text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">{formatData(c.data)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.numerazione || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatEuro(c.importo)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        c.metodoPagamento === 'contante' ? 'bg-green-50 text-green-700' :
                        c.metodoPagamento === 'pos' || c.metodoPagamento === 'carta' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-50 text-gray-700'
                      )}>
                        {c.metodoPagamento === 'contante' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {METODI_PAGAMENTO[c.metodoPagamento]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-[200px] truncate">{c.note || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(c._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-lg">
                {editingId ? 'Modifica Corrispettivo' : 'Nuovo Corrispettivo'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€) *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.importo}
                    onChange={(e) => setForm({ ...form, importo: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Es. 250.00"
                  />
                  <VoiceInput onResult={(text) => {
                    const num = text.match(/\d+[.,]?\d*/)?.[0]?.replace(',', '.')
                    if (num) setForm(f => ({ ...f, importo: parseFloat(num) }))
                  }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodo Pagamento</label>
                <select
                  value={form.metodoPagamento}
                  onChange={(e) => setForm({ ...form, metodoPagamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {Object.entries(METODI_PAGAMENTO).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numerazione</label>
                <input
                  type="text"
                  value={form.numerazione}
                  onChange={(e) => setForm({ ...form, numerazione: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Es. 001/2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <div className="relative">
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    placeholder="Note opzionali..."
                  />
                  <VoiceInput className="top-3 -translate-y-0" onResult={(text) => setForm(f => ({ ...f, note: text }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvataggio...' : editingId ? 'Aggiorna' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteId}
        title="Elimina Corrispettivo"
        message="Sei sicuro di voler eliminare questo corrispettivo? L'azione non può essere annullata."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        variant="danger"
      />
    </div>
  )
}
