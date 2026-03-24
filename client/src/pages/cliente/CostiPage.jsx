import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Edit3, X, Save, Receipt, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import api from '@/lib/api'
import { formatEuro, formatData, formatDataInput, cn, MESI } from '@/lib/utils'
import { CATEGORIE_COSTI, METODI_PAGAMENTO } from '@/lib/constants'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import VoiceInput from '@/components/shared/VoiceInput'
import { useOutletContext } from 'react-router-dom'

const INITIAL_FORM = {
  data: formatDataInput(new Date()),
  categoria: 'carburante',
  tipoCosto: 'costo_manuale',
  descrizione: '',
  importo: '',
  fornitore: '',
  numeroDocumento: '',
  metodoPagamento: 'carta',
  note: '',
}

export default function CostiPage() {
  const { anno, refreshKey } = useOutletContext()
  const [costi, setCosti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statoFilter, setStatoFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [anno, refreshKey])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await api.get('/costi', { params: { anno } })
      setCosti(res.data.data?.costi || [])
    } catch (err) {
      console.error('Errore caricamento costi:', err)
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
      categoria: c.categoria,
      tipoCosto: c.tipoCosto || 'costo_manuale',
      descrizione: c.descrizione || '',
      importo: c.importo,
      fornitore: c.fornitore || '',
      numeroDocumento: c.numeroDocumento || '',
      metodoPagamento: c.metodoPagamento || 'carta',
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
        await api.put(`/costi/${editingId}`, payload)
      } else {
        await api.post('/costi', payload)
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
      await api.delete(`/costi/${deleteId}`)
      setDeleteId(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore eliminazione')
    }
  }

  const statoIcon = (stato) => {
    switch (stato) {
      case 'approvato': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rifiutato': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <AlertCircle className="w-4 h-4 text-amber-500" />
    }
  }

  const statoLabel = (stato) => {
    switch (stato) {
      case 'approvato': return 'Approvato'
      case 'rifiutato': return 'Rifiutato'
      default: return 'In attesa'
    }
  }

  const filtered = costi.filter((c) => {
    if (search) {
      const q = search.toLowerCase()
      if (!c.descrizione?.toLowerCase().includes(q) &&
          !c.fornitore?.toLowerCase().includes(q)) return false
    }
    if (catFilter && c.categoria !== catFilter) return false
    if (statoFilter && c.statoApprovazione !== statoFilter) return false
    return true
  })

  const totale = filtered.reduce((s, c) => s + c.importo, 0)
  const byCategoria = filtered.reduce((acc, c) => {
    acc[c.categoria] = (acc[c.categoria] || 0) + c.importo
    return acc
  }, {})

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Costi / Spese"
        subtitle={`Anno ${anno} · ${filtered.length} costi · Totale ${formatEuro(totale)}`}
        actionLabel="Nuovo Costo"
        actionIcon={Plus}
        onAction={openNew}
      />

      {/* Riepilogo per categoria */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(CATEGORIE_COSTI).map(([key, cat]) => (
          <div
            key={key}
            onClick={() => setCatFilter(catFilter === key ? '' : key)}
            className={cn(
              'bg-white rounded-lg border p-3 text-center cursor-pointer transition-all hover:shadow-sm',
              catFilter === key ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100'
            )}
          >
            <div className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center" style={{ backgroundColor: cat.color + '15' }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
            </div>
            <p className="text-xs text-gray-500">{cat.label}</p>
            <p className="text-sm font-semibold mt-0.5">{formatEuro(byCategoria[key] || 0)}</p>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per descrizione o fornitore..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select value={statoFilter} onChange={(e) => setStatoFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Tutti gli stati</option>
          <option value="in_attesa">In attesa</option>
          <option value="approvato">Approvato</option>
          <option value="rifiutato">Rifiutato</option>
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Nessun costo" description="Inizia registrando la tua prima spesa." />
      ) : (
        <>
          {/* Card layout mobile */}
          <div className="lg:hidden space-y-2">
            {filtered.map((c) => (
              <div key={c._id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORIE_COSTI[c.categoria]?.color }} />
                        {CATEGORIE_COSTI[c.categoria]?.label || c.categoria}
                      </span>
                      <span className="text-xs text-gray-400">{formatData(c.data)}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{c.descrizione || '-'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        {statoIcon(c.statoApprovazione)}
                        {statoLabel(c.statoApprovazione)}
                      </span>
                      {c.fornitore && <span className="text-xs text-gray-400 truncate">{c.fornitore}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-base font-bold text-red-600">{formatEuro(c.importo)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(c._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabella desktop */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Descrizione</th>
                  <th className="px-4 py-3 font-medium">Importo</th>
                  <th className="px-4 py-3 font-medium">Stato</th>
                  <th className="px-4 py-3 font-medium">Fornitore</th>
                  <th className="px-4 py-3 font-medium text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">{formatData(c.data)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORIE_COSTI[c.categoria]?.color }} />
                        {CATEGORIE_COSTI[c.categoria]?.label || c.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{c.descrizione || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{formatEuro(c.importo)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        {statoIcon(c.statoApprovazione)}
                        {statoLabel(c.statoApprovazione)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.fornitore || '-'}</td>
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
        </>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-lg">{editingId ? 'Modifica Costo' : 'Nuovo Costo'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input type="date" required value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                  <select value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {Object.entries(CATEGORIE_COSTI).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
                <div className="relative">
                  <input type="text" required value={form.descrizione}
                    onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Es. Rifornimento gasolio" />
                  <VoiceInput onResult={(text) => setForm(f => ({ ...f, descrizione: text }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€) *</label>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" required value={form.importo}
                      onChange={(e) => setForm({ ...form, importo: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    <VoiceInput onResult={(text) => {
                      const num = text.match(/\d+[.,]?\d*/)?.[0]?.replace(',', '.')
                      if (num) setForm(f => ({ ...f, importo: parseFloat(num) }))
                    }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento</label>
                  <select value={form.metodoPagamento}
                    onChange={(e) => setForm({ ...form, metodoPagamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {Object.entries(METODI_PAGAMENTO).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore</label>
                <input type="text" value={form.fornitore}
                  onChange={(e) => setForm({ ...form, fornitore: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Es. Eni Station" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° Documento</label>
                <input type="text" value={form.numeroDocumento}
                  onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <div className="relative">
                  <textarea value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
                  <VoiceInput className="top-3 -translate-y-0" onResult={(text) => setForm(f => ({ ...f, note: text }))} />
                </div>
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

      <ConfirmDialog open={!!deleteId} title="Elimina Costo"
        message="Sei sicuro di voler eliminare questo costo? L'azione non può essere annullata."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} variant="danger" />
    </div>
  )
}
