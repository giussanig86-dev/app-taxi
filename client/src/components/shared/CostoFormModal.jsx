/**
 * COSTO FORM MODAL
 * Crea o modifica un singolo costo (usato dal consulente nel pannello cliente)
 */

import { useState } from 'react'
import { X, Save, RefreshCw, Receipt } from 'lucide-react'
import api from '@/lib/api'
import { formatDataInput } from '@/lib/utils'
import { CATEGORIE_COSTI } from '@/lib/constants'

const CATEGORIE = Object.entries(CATEGORIE_COSTI)

const TIPI_COSTO = [
  { value: 'fattura_passiva', label: 'Fattura passiva' },
  { value: 'costo_manuale',   label: 'Costo manuale' },
]

const INITIAL = {
  data: formatDataInput(new Date()),
  importo: '',
  categoria: 'altro',
  tipoCosto: 'fattura_passiva',
  descrizione: '',
}

export default function CostoFormModal({ clienteId, costo, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    costo
      ? {
          data:        costo.data        ? formatDataInput(costo.data) : formatDataInput(new Date()),
          importo:     costo.importo     ?? '',
          categoria:   costo.categoria   || 'altro',
          tipoCosto:   costo.tipoCosto   || 'fattura_passiva',
          descrizione: costo.descrizione || '',
        }
      : INITIAL
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEdit = !!costo

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        data:        form.data,
        importo:     parseFloat(form.importo),
        categoria:   form.categoria,
        tipoCosto:   form.tipoCosto,
        descrizione: form.descrizione || undefined,
      }
      if (isEdit) {
        await api.put(`/costi/${costo._id}?userId=${clienteId}`, payload)
      } else {
        await api.post(`/costi?userId=${clienteId}`, payload)
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

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-gray-900">
              {isEdit ? 'Modifica Costo' : 'Nuovo Costo'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input
                type="date" required value={form.data}
                onChange={e => set('data', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€) *</label>
              <input
                type="number" step="0.01" min="0.01" required
                value={form.importo} onChange={e => set('importo', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIE.map(([k, meta]) => (
                <button
                  key={k} type="button"
                  onClick={() => set('categoria', k)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    form.categoria === k
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <div className="flex gap-2">
              {TIPI_COSTO.map(t => (
                <button
                  key={t.value} type="button"
                  onClick={() => set('tipoCosto', t.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    form.tipoCosto === t.value
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <input
              type="text" value={form.descrizione}
              onChange={e => set('descrizione', e.target.value)}
              placeholder="Es. Fornitore, numero fattura..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Annulla
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
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
