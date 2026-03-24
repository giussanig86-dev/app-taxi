import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Trash2, Edit3, X, Save, Eye, CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import { formatEuro, formatData, formatDataInput, cn } from '@/lib/utils'
import { STATI_SDI } from '@/lib/constants'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import StatusBadge from '@/components/shared/StatusBadge'
import VoiceInput from '@/components/shared/VoiceInput'
import { useOutletContext } from 'react-router-dom'

const INITIAL_FORM = {
  numero: '',
  data: formatDataInput(new Date()),
  cliente: { denominazione: '', partitaIva: '', codiceFiscale: '', indirizzo: '' },
  importoNetto: '',
  aliquotaIva: 0,
  descrizione: '',
  note: '',
}

export default function FatturePage() {
  const { anno } = useOutletContext()
  const [fatture, setFatture] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [search, setSearch] = useState('')
  const [statoFilter, setStatoFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [anno])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await api.get('/fatture', { params: { anno } })
      setFatture(res.data.data?.fatture || [])
    } catch (err) {
      console.error('Errore caricamento fatture:', err)
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setForm(INITIAL_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(f) {
    setForm({
      numero: f.numero || '',
      data: formatDataInput(f.data),
      cliente: {
        denominazione: f.cliente?.denominazione || '',
        partitaIva: f.cliente?.partitaIva || '',
        codiceFiscale: f.cliente?.codiceFiscale || '',
        indirizzo: f.cliente?.indirizzo || '',
      },
      importoNetto: f.importoNetto,
      aliquotaIva: f.aliquotaIva || 0,
      descrizione: f.descrizione || '',
      note: f.note || '',
    })
    setEditingId(f._id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        importoNetto: parseFloat(form.importoNetto),
        aliquotaIva: parseFloat(form.aliquotaIva),
      }
      if (editingId) {
        await api.put(`/fatture/${editingId}`, payload)
      } else {
        await api.post('/fatture', payload)
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
      await api.delete(`/fatture/${deleteId}`)
      setDeleteId(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore eliminazione')
    }
  }

  async function marcaPagata(id) {
    try {
      await api.patch(`/fatture/${id}/pagata`)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore')
    }
  }

  const filtered = fatture.filter((f) => {
    if (search) {
      const q = search.toLowerCase()
      if (!f.numero?.toLowerCase().includes(q) &&
          !f.cliente?.denominazione?.toLowerCase().includes(q) &&
          !f.descrizione?.toLowerCase().includes(q)) return false
    }
    if (statoFilter && f.statoSdi !== statoFilter) return false
    return true
  })

  const totale = filtered.reduce((s, f) => s + (f.importoNetto || 0), 0)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fatture Attive"
        subtitle={`Anno ${anno} · ${filtered.length} fatture · Totale ${formatEuro(totale)}`}
        actionLabel="Nuova Fattura"
        actionIcon={Plus}
        onAction={openNew}
      />

      {/* Filtri */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per numero, cliente o descrizione..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={statoFilter}
          onChange={(e) => setStatoFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATI_SDI).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessuna fattura"
          description="Inizia creando la tua prima fattura attiva."
        />
      ) : (
        <>
          {/* Card layout mobile */}
          <div className="lg:hidden space-y-2">
            {filtered.map((f) => (
              <div key={f._id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-semibold text-gray-700">{f.numero}</span>
                      <StatusBadge status={f.statoSdi} type="sdi" />
                    </div>
                    <p className="text-sm font-medium truncate">{f.cliente?.denominazione || '-'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatData(f.data)}</p>
                    <div className="mt-1.5">
                      {f.pagata ? (
                        <span className="text-green-600 text-xs font-medium">✓ Pagata</span>
                      ) : (
                        <button onClick={() => marcaPagata(f._id)}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Marca pagata
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-base font-bold text-gray-800">{formatEuro(f.importoNetto)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(f)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(f._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
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
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Importo</th>
                  <th className="px-4 py-3 font-medium">Stato SDI</th>
                  <th className="px-4 py-3 font-medium">Pagata</th>
                  <th className="px-4 py-3 font-medium text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((f) => (
                  <tr key={f._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{f.numero}</td>
                    <td className="px-4 py-3">{formatData(f.data)}</td>
                    <td className="px-4 py-3 font-medium">{f.cliente?.denominazione || '-'}</td>
                    <td className="px-4 py-3 font-semibold">{formatEuro(f.importoNetto)}</td>
                    <td className="px-4 py-3"><StatusBadge status={f.statoSdi} type="sdi" /></td>
                    <td className="px-4 py-3">
                      {f.pagata ? (
                        <span className="text-green-600 text-xs font-medium">✓ Pagata</span>
                      ) : (
                        <button onClick={() => marcaPagata(f._id)}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Marca pagata
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(f)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(f._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-lg">
                {editingId ? 'Modifica Fattura' : 'Nuova Fattura'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero *</label>
                  <input type="text" required value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="001/2026" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input type="date" required value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>

              <fieldset className="border border-gray-200 rounded-lg p-4 space-y-3">
                <legend className="text-sm font-medium text-gray-600 px-2">Dati Cliente</legend>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Denominazione *</label>
                  <input type="text" required value={form.cliente.denominazione}
                    onChange={(e) => setForm({ ...form, cliente: { ...form.cliente, denominazione: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">P.IVA</label>
                    <input type="text" value={form.cliente.partitaIva}
                      onChange={(e) => setForm({ ...form, cliente: { ...form.cliente, partitaIva: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">C.F.</label>
                    <input type="text" value={form.cliente.codiceFiscale}
                      onChange={(e) => setForm({ ...form, cliente: { ...form.cliente, codiceFiscale: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importo Netto (€) *</label>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" required value={form.importoNetto}
                      onChange={(e) => setForm({ ...form, importoNetto: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    <VoiceInput onResult={(text) => {
                      const num = text.match(/\d+[.,]?\d*/)?.[0]?.replace(',', '.')
                      if (num) setForm(f => ({ ...f, importoNetto: parseFloat(num) }))
                    }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aliquota IVA %</label>
                  <select value={form.aliquotaIva}
                    onChange={(e) => setForm({ ...form, aliquotaIva: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value={0}>Esente (Forfettario)</option>
                    <option value={10}>10%</option>
                    <option value={22}>22%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <div className="relative">
                  <textarea value={form.descrizione}
                    onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    placeholder="Servizio di trasporto..." />
                  <VoiceInput className="top-3 -translate-y-0" onResult={(text) => setForm(f => ({ ...f, descrizione: text }))} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Annulla
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvataggio...' : editingId ? 'Aggiorna' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Elimina Fattura"
        message="Sei sicuro di voler eliminare questa fattura? L'azione non può essere annullata."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        variant="danger"
      />
    </div>
  )
}
