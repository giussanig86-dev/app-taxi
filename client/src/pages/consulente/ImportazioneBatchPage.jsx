/**
 * Importazione Batch Registro IVA
 * Il consulente seleziona un file Excel per uno o più clienti e importa tutto in un click.
 */
import { useState, useEffect, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, X, Users } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function ImportazioneBatchPage() {
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)

  // fileMap: { [clienteId]: File }
  const [fileMap, setFileMap] = useState({})
  const [importing, setImporting] = useState(false)
  const [risultati, setRisultati] = useState(null)
  const [erroreGlobale, setErroreGlobale] = useState('')

  const inputRefs = useRef({})

  useEffect(() => {
    api.get('/users/clienti')
      .then(r => setClienti(r.data.data.clienti || []))
      .catch(() => setClienti([]))
      .finally(() => setLoading(false))
  }, [])

  function handleFileSelect(clienteId, file) {
    if (!file) return
    const ext = file.name.toLowerCase().replace(/.*\./, '')
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('Formato non supportato. Usa .xlsx, .xls o .csv')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File troppo grande. Massimo 5 MB.')
      return
    }
    setFileMap(prev => ({ ...prev, [clienteId]: file }))
  }

  function removeFile(clienteId) {
    setFileMap(prev => {
      const next = { ...prev }
      delete next[clienteId]
      return next
    })
    if (inputRefs.current[clienteId]) inputRefs.current[clienteId].value = ''
  }

  async function handleImportaBatch() {
    const entries = Object.entries(fileMap)
    if (entries.length === 0) {
      setErroreGlobale('Seleziona almeno un file.')
      return
    }
    setImporting(true)
    setErroreGlobale('')
    setRisultati(null)

    try {
      const fd = new FormData()
      entries.forEach(([clienteId, file]) => {
        fd.append('files', file)
        fd.append('clienteIds', clienteId)
      })

      const res = await api.post('/costi/import/batch', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setRisultati(res.data.data.risultati || [])
      setFileMap({})
    } catch (err) {
      setErroreGlobale(
        err.response?.data?.message || err.response?.data?.messaggio || 'Errore durante l\'importazione.'
      )
    } finally {
      setImporting(false)
    }
  }

  const nFileSelezionati = Object.keys(fileMap).length

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importazione Batch Registro IVA"
        subtitle="Carica il registro IVA acquisti per più clienti contemporaneamente"
      />

      {/* Istruzioni */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Come funziona</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>Seleziona il file Excel (o CSV) del registro IVA per ogni cliente</li>
          <li>Le colonne vengono rilevate automaticamente (data, importo, fornitore, n. fattura)</li>
          <li>Clicca "Importa Selezionati" per avviare l'importazione di tutti i file in una volta</li>
          <li>Formato accettato: <strong>.xlsx, .xls, .csv</strong> · Max 5 MB per file</li>
        </ul>
      </div>

      {/* Risultati */}
      {risultati && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-gray-800">Risultati Importazione</h3>
          </div>
          <ul className="divide-y divide-gray-50">
            {risultati.map((r, i) => (
              <li key={i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.nome}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.importati} righe importate su {r.totaleRighe || '?'} totali
                    </p>
                    {r.errori?.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {r.errori.slice(0, 5).map((e, j) => (
                          <li key={j} className="text-xs text-red-500">{e}</li>
                        ))}
                        {r.errori.length > 5 && (
                          <li className="text-xs text-red-400">…e altri {r.errori.length - 5} errori</li>
                        )}
                      </ul>
                    )}
                  </div>
                  <span className={cn(
                    'shrink-0 text-xs font-semibold px-2 py-1 rounded-full',
                    r.importati > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  )}>
                    {r.importati > 0 ? `+${r.importati}` : 'Nessuna'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Errore globale */}
      {erroreGlobale && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {erroreGlobale}
        </div>
      )}

      {/* Lista clienti */}
      {clienti.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nessun cliente trovato</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Clienti ({clienti.length})
            </h3>
          </div>

          <ul className="divide-y divide-gray-50">
            {clienti.map((c) => {
              const file = fileMap[c._id]
              return (
                <li key={c._id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/40 transition-colors">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {c.nome?.charAt(0)}{c.cognome?.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {c.nome} {c.cognome}
                      {c.codiceCliente && (
                        <span className="ml-2 text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.codiceCliente}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{c.email}</p>
                  </div>

                  {/* File selector */}
                  <div className="shrink-0 flex items-center gap-2">
                    {file ? (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-medium text-green-700 max-w-[120px] truncate">{file.name}</span>
                        <button
                          onClick={() => removeFile(c._id)}
                          className="text-green-500 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => inputRefs.current[c._id]?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Seleziona file
                      </button>
                    )}
                    <input
                      ref={el => { inputRefs.current[c._id] = el }}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => handleFileSelect(c._id, e.target.files?.[0])}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Footer con bottone importa */}
          <div className="px-5 py-4 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              {nFileSelezionati === 0
                ? 'Nessun file selezionato'
                : `${nFileSelezionati} file selezionat${nFileSelezionati === 1 ? 'o' : 'i'}`}
            </p>
            <button
              onClick={handleImportaBatch}
              disabled={importing || nFileSelezionati === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importazione in corso...' : `Importa Selezionati (${nFileSelezionati})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
