/**
 * VERSAMENTO FORM MODAL
 * Crea o modifica un versamento fiscale (usato dal consulente nel pannello cliente)
 */

import { useState } from 'react'
import { X, Save, RefreshCw, Landmark } from 'lucide-react'
import api from '@/lib/api'
import { formatDataInput } from '@/lib/utils'
import { TIPI_VERSAMENTO } from '@/lib/constants'

const TIPO_OPTIONS = Object.entries(TIPI_VERSAMENTO)

const INITIAL = {
  tipoVersamento: 'irpef_acconto',
  importo: '',
  dataScadenza: '',
  note: '',
}

export default function VersamentoFormModal({ clienteId, versamento, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    versamento
      ? {
          tipoVersamento: versamento.tipoVersamento || 'irpef_acconto',
          importo: versamento.importo ?? '',
          dataScadenza: versamento.dataScadenza ? formatDataInput(versamento.dataScadenza) : '',
          note: versamento.note || '',
        }
      : INITIAL
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!versamento

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        tipoVersamento: form.tipoVersamento,
        importo: parseFloat(form.importo),
        dataScadenza: form.dataScadenza,
        note: form.note || undefined,
      }
      if (isEdit) {
        await api.put(`/versamenti/${versamento._id}?userId=${clienteId}`, payload)
      } else {
        await api.post(`/versamenti?userId=${clienteId}`, payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.messaggio || err.response?.data?.message || 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-gray-900">
              {isEdit ? 'Modifica Versamento' : 'Nuovo Versamento'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo versamento *</label>
            <select
              value={form.tipoVersamento}
              onChange={e => set('tipoVersamento', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {TIPO_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.importo}
                onChange={e => set('importo', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza *</label>
              <input
                type="date"
                required
                value={form.dataScadenza}
                onChange={e => set('dataScadenza', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={form.note}
              onChange={e => set('note', e.target.value)}
              rows={2}
              placeholder="Riferimenti, codice tributo F24..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvataggio...</>
                : <><Save className="w-4 h-4" />{isEdit ? 'Aggiorna' : 'Salva'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
