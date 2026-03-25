import { useState, useEffect } from 'react'
import {
  Plus, Search, Edit3, Trash2, X, Save, AlertCircle,
  CheckCircle, UserX, UserCheck, KeyRound, Eye, EyeOff
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const PIANI = ['free', 'pro', 'enterprise', 'custom']

const PIANO_BADGE = {
  free:       'bg-gray-100 text-gray-600',
  pro:        'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
  custom:     'bg-amber-100 text-amber-700',
}

const EMPTY_FORM = {
  nome: '', cognome: '', email: '', password: '', telefono: '',
  piano: 'pro', maxClienti: 50, importoMensile: 49,
  dataScadenza: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  abbonamentoPagato: true, nomeStudio: '', indirizzoStudio: '',
}

function Badge({ piano }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold uppercase', PIANO_BADGE[piano] || PIANO_BADGE.free)}>
      {piano}
    </span>
  )
}

export default function ConsulenteListPage() {
  const [consulenti, setConsulenti] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [pianoFilter, setPianoFilter] = useState('')

  const [showModal, setShowModal]   = useState(false)
  const [editId, setEditId]         = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')
  const [showPwd, setShowPwd]       = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [suspendTarget, setSuspendTarget] = useState(null)

  useEffect(() => { fetchConsulenti() }, [search, pianoFilter])

  async function fetchConsulenti() {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (pianoFilter) params.piano = pianoFilter
      const res = await api.get('/admin/consulenti', { params })
      setConsulenti(res.data.data?.consulenti || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setFormError('')
    setShowPwd(false)
    setShowModal(true)
  }

  function openEdit(c) {
    setForm({
      nome:              c.nome || '',
      cognome:           c.cognome || '',
      email:             c.email || '',
      password:          '',
      telefono:          c.telefono || '',
      piano:             c.consulente?.piano || 'pro',
      maxClienti:        c.consulente?.limiti?.maxClienti ?? 50,
      importoMensile:    c.consulente?.billing?.importoMensile ?? 49,
      dataScadenza:      c.consulente?.billing?.dataScadenza
                           ? new Date(c.consulente.billing.dataScadenza).toISOString().split('T')[0]
                           : EMPTY_FORM.dataScadenza,
      abbonamentoPagato: c.consulente?.billing?.abbonamentoPagato ?? true,
      nomeStudio:        c.consulente?.branding?.nomeStudio || '',
      indirizzoStudio:   c.consulente?.branding?.indirizzo || '',
    })
    setEditId(c._id)
    setFormError('')
    setShowPwd(false)
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      if (editId) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await api.put(`/admin/consulenti/${editId}`, payload)
      } else {
        await api.post('/admin/consulenti', form)
      }
      setShowModal(false)
      fetchConsulenti()
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.messaggio || 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/admin/consulenti/${deleteTarget._id}`)
      setDeleteTarget(null)
      fetchConsulenti()
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.messaggio || 'Errore eliminazione')
    }
  }

  async function handleToggleSospensione() {
    try {
      await api.patch(`/admin/consulenti/${suspendTarget._id}/sospensione`)
      setSuspendTarget(null)
      fetchConsulenti()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore')
    }
  }

  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consulenti"
        subtitle={`${consulenti.length} consulenti registrati`}
        actionLabel="Nuovo Consulente"
        actionIcon={Plus}
        onAction={openCreate}
      />

      {/* Filtri */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome, cognome o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={pianoFilter}
          onChange={e => setPianoFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tutti i piani</option>
          {PIANI.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {/* Tabella */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {consulenti.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-sm">Nessun consulente trovato</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Consulente</th>
                    <th className="px-4 py-3 font-medium">Studio</th>
                    <th className="px-4 py-3 font-medium">Piano</th>
                    <th className="px-4 py-3 font-medium">Clienti</th>
                    <th className="px-4 py-3 font-medium">Abbonamento</th>
                    <th className="px-4 py-3 font-medium">Scadenza</th>
                    <th className="px-4 py-3 font-medium">Stato</th>
                    <th className="px-4 py-3 font-medium text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {consulenti.map(c => (
                    <tr key={c._id} className={cn('hover:bg-gray-50/50 transition-colors', c.accountSospeso && 'opacity-60')}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{c.nome} {c.cognome}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                          {c.telefono && <p className="text-xs text-gray-400">{c.telefono}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">
                        {c.consulente?.branding?.nomeStudio || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge piano={c.consulente?.piano || 'free'} />
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {c.consulente?.utilizzo?.clientiAttivi ?? 0}
                        <span className="text-gray-400 font-normal">/{c.consulente?.limiti?.maxClienti ?? '?'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.consulente?.billing?.abbonamentoPagato ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle className="w-3.5 h-3.5" /> Attivo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 text-xs">
                            <AlertCircle className="w-3.5 h-3.5" /> Non pagato
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {c.consulente?.billing?.dataScadenza
                          ? new Date(c.consulente.billing.dataScadenza).toLocaleDateString('it-IT')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {c.accountSospeso ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Sospeso</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Attivo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            title="Modifica"
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSuspendTarget(c)}
                            title={c.accountSospeso ? 'Riattiva' : 'Sospendi'}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              c.accountSospeso
                                ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                            )}
                          >
                            {c.accountSospeso ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            title="Elimina"
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Crea / Modifica */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                {editId ? 'Modifica Consulente' : 'Nuovo Consulente'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">

              {/* Dati anagrafici */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dati Anagrafici</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input type="text" required value={form.nome} onChange={e => f('nome')(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                    <input type="text" required value={form.cognome} onChange={e => f('cognome')(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" required value={form.email} onChange={e => f('email')(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                    <input type="tel" value={form.telefono} onChange={e => f('telefono')(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editId ? '(lascia vuoto per non modificare)' : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required={!editId}
                    minLength={8}
                    value={form.password}
                    onChange={e => f('password')(e.target.value)}
                    placeholder={editId ? '••••••••' : 'Min. 8 caratteri'}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Studio */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Studio</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Studio</label>
                    <input type="text" value={form.nomeStudio} onChange={e => f('nomeStudio')(e.target.value)}
                      placeholder="Es. Studio Rossi"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo Studio</label>
                    <input type="text" value={form.indirizzoStudio} onChange={e => f('indirizzoStudio')(e.target.value)}
                      placeholder="Via Roma 1, Milano"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Piano & billing */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Piano & Abbonamento</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Piano</label>
                    <select value={form.piano} onChange={e => f('piano')(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                      {PIANI.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Clienti</label>
                    <input type="number" min="1" max="9999" value={form.maxClienti}
                      onChange={e => f('maxClienti')(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Importo Mensile (€)</label>
                    <input type="number" min="0" step="0.01" value={form.importoMensile}
                      onChange={e => f('importoMensile')(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza Abbonamento</label>
                    <input type="date" value={form.dataScadenza}
                      onChange={e => f('dataScadenza')(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                </div>

                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={form.abbonamentoPagato}
                    onChange={e => f('abbonamentoPagato')(e.target.checked)}
                    className="w-4 h-4 rounded text-primary" />
                  <span className="text-sm text-gray-700">Abbonamento pagato / attivo</span>
                </label>
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Annulla
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvataggio...' : editId ? 'Aggiorna' : 'Crea Consulente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Sospensione */}
      <ConfirmDialog
        open={!!suspendTarget}
        title={suspendTarget?.accountSospeso ? 'Riattiva Account' : 'Sospendi Account'}
        message={
          suspendTarget?.accountSospeso
            ? `Riattivare l'account di ${suspendTarget?.nome} ${suspendTarget?.cognome}? Potrà tornare ad accedere.`
            : `Sospendere l'account di ${suspendTarget?.nome} ${suspendTarget?.cognome}? Non potrà più accedere finché non viene riattivato.`
        }
        onConfirm={handleToggleSospensione}
        onCancel={() => setSuspendTarget(null)}
        variant={suspendTarget?.accountSospeso ? 'default' : 'danger'}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina Consulente"
        message={`Eliminare definitivamente ${deleteTarget?.nome} ${deleteTarget?.cognome}? L'operazione è irreversibile. Non è possibile eliminare un consulente con clienti associati.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  )
}
