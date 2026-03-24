import { useState, useEffect } from 'react'
import { Save, Car, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import { formatNumero, cn, MESI } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useOutletContext } from 'react-router-dom'

export default function ChilometriPage() {
  const { anno } = useOutletContext()
  const [chilometri, setChilometri] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({})
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
  }, [anno])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await api.get('/chilometri', { params: { anno } })
      const data = res.data.data?.chilometri || []
      setChilometri(data)
      // Prepopola i 12 mesi
      const edit = {}
      for (let m = 1; m <= 12; m++) {
        const existing = data.find(d => d.mese === m)
        edit[m] = {
          kmInizio: existing?.kmInizio || '',
          kmFine: existing?.kmFine || '',
          kmPersonali: existing?.kmPersonali || '',
          _id: existing?._id || null,
        }
      }
      setEditData(edit)
    } catch (err) {
      console.error('Errore caricamento chilometri:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(mese, field, value) {
    setEditData(prev => ({
      ...prev,
      [mese]: { ...prev[mese], [field]: value },
    }))
  }

  async function handleSave(mese) {
    setSaving(true)
    setSuccess('')
    try {
      const d = editData[mese]
      await api.post('/chilometri', {
        anno,
        mese,
        kmInizio: d.kmInizio ? parseInt(d.kmInizio) : 0,
        kmFine: d.kmFine ? parseInt(d.kmFine) : 0,
        kmPersonali: d.kmPersonali ? parseInt(d.kmPersonali) : 0,
      })
      setSuccess(`${MESI[mese - 1]} salvato`)
      setTimeout(() => setSuccess(''), 2000)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAll() {
    setSaving(true)
    setSuccess('')
    try {
      for (let m = 1; m <= 12; m++) {
        const d = editData[m]
        if (d.kmInizio || d.kmFine) {
          await api.post('/chilometri', {
            anno,
            mese: m,
            kmInizio: d.kmInizio ? parseInt(d.kmInizio) : 0,
            kmFine: d.kmFine ? parseInt(d.kmFine) : 0,
            kmPersonali: d.kmPersonali ? parseInt(d.kmPersonali) : 0,
          })
        }
      }
      setSuccess('Tutti i mesi salvati!')
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  // Calcoli totali
  const totaleLavorativi = Object.values(editData).reduce((s, d) => {
    const inizio = parseInt(d.kmInizio) || 0
    const fine = parseInt(d.kmFine) || 0
    const pers = parseInt(d.kmPersonali) || 0
    const totMese = fine - inizio
    return s + Math.max(0, totMese - pers)
  }, 0)

  const totalePersonali = Object.values(editData).reduce((s, d) => s + (parseInt(d.kmPersonali) || 0), 0)
  const totaleComplessivo = Object.values(editData).reduce((s, d) => {
    return s + Math.max(0, (parseInt(d.kmFine) || 0) - (parseInt(d.kmInizio) || 0))
  }, 0)

  const percentualeLav = totaleComplessivo > 0 ? ((totaleLavorativi / totaleComplessivo) * 100).toFixed(1) : 0

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro Chilometri"
        subtitle={`Anno ${anno} · Compila mese per mese i km del contachilometri`}
      />

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Save className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Riepilogo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <Car className="w-6 h-6 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{formatNumero(totaleComplessivo)}</p>
          <p className="text-xs text-gray-500">Km Totali</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{formatNumero(totaleLavorativi)}</p>
          <p className="text-xs text-gray-500">Km Lavorativi</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{formatNumero(totalePersonali)}</p>
          <p className="text-xs text-gray-500">Km Personali</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-primary">{percentualeLav}%</p>
          <p className="text-xs text-gray-500">% Lavorativo</p>
        </div>
      </div>

      {/* Tabella mesi */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Mese</th>
                <th className="px-4 py-3 font-medium">Km Inizio</th>
                <th className="px-4 py-3 font-medium">Km Fine</th>
                <th className="px-4 py-3 font-medium">Km Personali</th>
                <th className="px-4 py-3 font-medium">Km Lavorativi</th>
                <th className="px-4 py-3 font-medium text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mese) => {
                const d = editData[mese] || {}
                const kmTot = Math.max(0, (parseInt(d.kmFine) || 0) - (parseInt(d.kmInizio) || 0))
                const kmLav = Math.max(0, kmTot - (parseInt(d.kmPersonali) || 0))
                return (
                  <tr key={mese} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{MESI[mese - 1]}</td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={d.kmInizio}
                        onChange={(e) => handleChange(mese, 'kmInizio', e.target.value)}
                        className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="0" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={d.kmFine}
                        onChange={(e) => handleChange(mese, 'kmFine', e.target.value)}
                        className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="0" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={d.kmPersonali}
                        onChange={(e) => handleChange(mese, 'kmPersonali', e.target.value)}
                        className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="0" />
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">{formatNumero(kmLav)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleSave(mese)} disabled={saving}
                        className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50">
                        <Save className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSaveAll} disabled={saving}
          className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Salvataggio...' : 'Salva tutti i mesi'}
        </button>
      </div>
    </div>
  )
}
