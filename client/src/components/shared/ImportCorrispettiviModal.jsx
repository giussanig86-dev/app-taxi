/**
 * IMPORT REGISTRO CORRISPETTIVI
 * Modal 3-step: upload → preview+metodo pagamento → risultato
 */

import { useState, useRef, useCallback } from 'react'
import {
  Upload, X, CheckCircle, AlertCircle, ChevronRight,
  FileSpreadsheet, RefreshCw
} from 'lucide-react'
import api from '@/lib/api'
import { formatEuro } from '@/lib/utils'
import { METODI_PAGAMENTO } from '@/lib/constants'

const METODI = Object.entries(METODI_PAGAMENTO)

function calcolaTotale(righe) {
  return righe
    .filter(r => r.inclusa)
    .reduce((acc, r) => acc + (parseFloat(String(r.importo).replace(',', '.')) || 0), 0)
}

function buildRigheFromPreview(previewData) {
  const { rows, mapping } = previewData
  return rows.map(row => ({
    inclusa: true,
    data:    mapping.data    >= 0 ? row[mapping.data]    : '',
    importo: mapping.importo >= 0 ? row[mapping.importo] : '',
    metodoPagamento: mapping.metodo >= 0
      ? detectMetodo(row[mapping.metodo])
      : 'contante',
    note:    mapping.note    >= 0 ? row[mapping.note]    : '',
  }))
}

function detectMetodo(str) {
  if (!str) return 'contante'
  const s = str.toLowerCase()
  if (s.includes('pos') || s.includes('bancomat')) return 'pos'
  if (s.includes('cart')) return 'carta'
  if (s.includes('bonif')) return 'bonifico'
  return 'contante'
}

export default function ImportCorrispettiviModal({ clienteId, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [mapping, setMapping] = useState({})
  const [righe, setRighe] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef()

  const handleFile = useCallback(f => {
    if (!f) return
    const ext = f.name.toLowerCase().replace(/.*\./, '')
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Formato non supportato. Usa .xlsx, .xls o .csv')
      return
    }
    setFile(f)
    setError(null)
  }, [])

  const onDrop = useCallback(e => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(`/corrispettivi/import/preview?userId=${clienteId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const data = res.data.data
      setPreview(data)
      setMapping(data.mapping)
      setRighe(buildRigheFromPreview(data))
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.messaggio || 'Errore nel parsing del file')
    } finally {
      setLoading(false)
    }
  }

  function handleMappingChange(field, colIdx) {
    const idx = parseInt(colIdx)
    const newMap = { ...mapping, [field]: idx }
    setMapping(newMap)
    setRighe(prev => prev.map((r, i) => {
      const val = idx >= 0 ? (preview.rows[i]?.[idx] ?? '') : ''
      const update = { ...r, [field]: val }
      if (field === 'metodo') update.metodoPagamento = detectMetodo(val)
      return update
    }))
  }

  function updateRiga(i, field, value) {
    setRighe(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n })
  }

  function toggleAll(v) {
    setRighe(prev => prev.map(r => ({ ...r, inclusa: v })))
  }

  async function handleConfirm() {
    const sel = righe.filter(r => r.inclusa)
    if (sel.length === 0) { setError('Seleziona almeno una riga.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await api.post(`/corrispettivi/import/confirm?userId=${clienteId}`, {
        corrispettivi: sel
      })
      setResult(res.data.data)
      setStep(3)
      onSuccess?.()
    } catch (err) {
      setError(err.response?.data?.messaggio || 'Errore durante l\'importazione')
    } finally {
      setLoading(false)
    }
  }

  const colonneNonRilevate = preview
    ? Object.entries(mapping).filter(([k, v]) => v < 0 && ['data', 'importo'].includes(k)).map(([k]) => k)
    : []
  const righeIncluse = righe.filter(r => r.inclusa).length
  const totale = calcolaTotale(righe)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Importa Registro Corrispettivi</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          {[{ n: 1, label: 'Carica file' }, { n: 2, label: 'Revisione' }, { n: 3, label: 'Completato' }].map((s, idx) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                step > s.n ? 'bg-green-500 text-white' : step === s.n ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s.n ? <CheckCircle className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-sm hidden sm:block ${step === s.n ? 'font-medium text-gray-800' : 'text-gray-400'}`}>{s.label}</span>
              {idx < 2 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1 */}
          {step === 1 && (
            <div className="max-w-lg mx-auto space-y-5">
              <p className="text-sm text-gray-500">
                Carica il file Excel o CSV del registro corrispettivi esportato dal tuo software.
                Verranno rilevate automaticamente le colonne Data e Importo.
              </p>
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                {file ? (
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Trascina qui il file o clicca per selezionare</p>
                    <p className="text-xs text-gray-400 mt-1">Excel (.xlsx, .xls) o CSV — max 5 MB</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => handleFile(e.target.files[0])} />
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
                </div>
              )}
              <button onClick={handleUpload} disabled={!file || loading}
                className="w-full py-2.5 rounded-lg bg-primary text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analisi...</> : <>Analizza file <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && preview && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <p className="text-sm text-gray-600 flex-1">
                  <span className="font-medium">{preview.totaleRighe} righe</span> trovate.
                  Verifica la mappatura colonne, poi assegna il metodo di pagamento (oppure lascia Contante).
                </p>
                {colonneNonRilevate.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Correggi: {colonneNonRilevate.join(', ')}
                  </div>
                )}
              </div>

              {/* Mappatura colonne */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-800 mb-3">Mappatura colonne</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { field: 'data',    label: 'Data *' },
                    { field: 'importo', label: 'Importo *' },
                    { field: 'metodo',  label: 'Metodo pag.' },
                    { field: 'note',    label: 'Note' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="text-xs text-blue-700 font-medium block mb-1">{label}</label>
                      <select value={mapping[field] ?? -1} onChange={e => handleMappingChange(field, e.target.value)}
                        className="w-full text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                        <option value={-1}>— non usare —</option>
                        {preview.headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabella */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={righe.every(r => r.inclusa)} onChange={e => toggleAll(e.target.checked)} className="rounded" />
                    Tutto
                  </label>
                  <span className="text-xs text-gray-400">{righeIncluse} / {righe.length} selezionate</span>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Data</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Importo</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Metodo</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {righe.map((r, i) => (
                        <tr key={i} className={r.inclusa ? '' : 'opacity-40'}>
                          <td className="px-3 py-1.5">
                            <input type="checkbox" checked={r.inclusa} onChange={e => updateRiga(i, 'inclusa', e.target.checked)} className="rounded" />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="text" value={r.data} onChange={e => updateRiga(i, 'data', e.target.value)}
                              className="w-24 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="text" value={r.importo} onChange={e => updateRiga(i, 'importo', e.target.value)}
                              className="w-20 text-right border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                          </td>
                          <td className="px-3 py-1.5">
                            <select value={r.metodoPagamento} onChange={e => updateRiga(i, 'metodoPagamento', e.target.value)}
                              className="border border-gray-200 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                              {METODI.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="text" value={r.note} onChange={e => updateRiga(i, 'note', e.target.value)}
                              className="w-full min-w-20 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && result && (
            <div className="max-w-md mx-auto text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{result.importati} corrispettivi importati</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {result.totaleInviato - result.importati > 0
                    ? `${result.totaleInviato - result.importati} righe saltate`
                    : 'Tutte le righe selezionate sono state importate'}
                </p>
              </div>
              {result.errori?.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 text-left">
                  <p className="text-xs font-medium text-amber-800 mb-2">Righe non importate ({result.errori.length}):</p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errori.map((e, i) => <li key={i} className="text-xs text-amber-700">• {e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          {step === 1 && <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Annulla</button>}
          {step === 2 && (
            <>
              <button onClick={() => { setStep(1); setPreview(null); setError(null) }} className="text-sm text-gray-500 hover:text-gray-700">← Indietro</button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{righeIncluse}</span> righe ·{' '}
                  <span className="font-semibold text-green-600">{formatEuro(totale)}</span>
                </span>
                <button onClick={handleConfirm} disabled={loading || righeIncluse === 0}
                  className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-primary/90 transition-colors">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importazione...</> : <>Importa {righeIncluse} corrispettivi</>}
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <button onClick={onClose} className="ml-auto px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">
              Chiudi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
