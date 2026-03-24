import { useState } from 'react'
import { Mic, X, Check, Loader2, AlertCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useVoiceRecognition, parseVoiceCommand } from '@/hooks/useVoiceRecognition'
import { formatEuro, cn } from '@/lib/utils'
import { METODI_PAGAMENTO, CATEGORIE_COSTI, TIPI_VERSAMENTO } from '@/lib/constants'
import api from '@/lib/api'

// --- Parser costo vocale ---
// Es: "cinquanta euro carburante" → { importo: 50, categoria: 'carburante' }
function parseVoiceCommandCosto(text) {
  const lower = text.toLowerCase()

  // Estrai importo (numerico o parole)
  const cmd = parseVoiceCommand(lower)
  if (!cmd || !cmd.importo) return null

  // Rileva categoria
  let categoria = 'altro'
  if (/carburante|benzina|gasolio|diesel|rifornimento/.test(lower)) categoria = 'carburante'
  else if (/manutenzione|riparazione|officina|meccanico/.test(lower)) categoria = 'manutenzione'
  else if (/assicurazione|polizza|rca/.test(lower)) categoria = 'assicurazione'
  else if (/bollo/.test(lower)) categoria = 'bollo'
  else if (/pedaggio|autostrada|casello/.test(lower)) categoria = 'pedaggi'
  else if (/parcheggio|sosta/.test(lower)) categoria = 'parcheggi'

  return {
    importo: cmd.importo,
    categoria,
    descrizione: CATEGORIE_COSTI[categoria]?.label || 'Altro',
    data: cmd.data,
    metodoPagamento: cmd.metodoPagamento,
  }
}

// --- Parser versamento vocale ---
// Es: "mille euro IRPEF" → { importo: 1000, categoria: 'irpef', tipo: 'irpef_acconto' }
function parseVoiceCommandVersamento(text) {
  const lower = text.toLowerCase()

  const cmd = parseVoiceCommand(lower)
  if (!cmd || !cmd.importo) return null

  let categoria = 'irpef'
  let tipo = 'irpef_acconto'

  if (/inps/.test(lower)) {
    categoria = 'inps'
    tipo = /saldo/.test(lower) ? 'inps_saldo' : 'inps_acconto'
  } else if (/sostitutiva|sostituti/.test(lower)) {
    categoria = 'imposta_sostitutiva'
    tipo = /saldo/.test(lower) ? 'imposta_sostitutiva_saldo' : 'imposta_sostitutiva_acconto'
  } else if (/irpef/.test(lower)) {
    categoria = 'irpef'
    tipo = /saldo/.test(lower) ? 'irpef_saldo' : 'irpef_acconto'
  }

  // Data scadenza default: oggi
  const oggi = new Date().toISOString().split('T')[0]

  return {
    importo: cmd.importo,
    categoria,
    tipo,
    dataScadenza: oggi,
  }
}

// Config per pagina
const PAGE_CONFIG = {
  '/corrispettivi': {
    label: 'corrispettivo',
    hint: '"centocinquanta euro contante"',
    color: 'bg-primary',
    parse: parseVoiceCommand,
    save: (parsed) => api.post('/corrispettivi', {
      data: parsed.data,
      importo: parsed.importo,
      metodoPagamento: parsed.metodoPagamento,
    }),
    preview: (parsed) => (
      <div className="bg-primary/5 rounded-xl p-3 mb-3">
        <p className="text-2xl font-bold text-primary text-center">{formatEuro(parsed.importo)}</p>
        <p className="text-sm text-center text-gray-500 mt-1">
          {METODI_PAGAMENTO[parsed.metodoPagamento]} · Oggi
        </p>
      </div>
    ),
  },
  '/costi': {
    label: 'costo',
    hint: '"cinquanta euro carburante"',
    color: 'bg-orange-500',
    parse: parseVoiceCommandCosto,
    save: (parsed) => api.post('/costi', {
      data: parsed.data,
      importo: parsed.importo,
      categoria: parsed.categoria,
      descrizione: parsed.descrizione,
      metodoPagamento: parsed.metodoPagamento || 'carta',
      tipoCosto: 'costo_manuale',
    }),
    preview: (parsed) => (
      <div className="bg-orange-50 rounded-xl p-3 mb-3">
        <p className="text-2xl font-bold text-orange-600 text-center">{formatEuro(parsed.importo)}</p>
        <p className="text-sm text-center text-gray-500 mt-1">
          {CATEGORIE_COSTI[parsed.categoria]?.label || parsed.categoria} · Oggi
        </p>
      </div>
    ),
  },
  '/versamenti': {
    label: 'versamento',
    hint: '"mille euro IRPEF" oppure "cinquecento INPS"',
    color: 'bg-amber-600',
    parse: parseVoiceCommandVersamento,
    save: (parsed) => api.post('/versamenti', {
      importo: parsed.importo,
      categoria: parsed.categoria,
      tipo: parsed.tipo,
      dataScadenza: parsed.dataScadenza,
    }),
    preview: (parsed) => (
      <div className="bg-amber-50 rounded-xl p-3 mb-3">
        <p className="text-2xl font-bold text-amber-700 text-center">{formatEuro(parsed.importo)}</p>
        <p className="text-sm text-center text-gray-500 mt-1">
          {TIPI_VERSAMENTO[parsed.tipo]} · scad. oggi
        </p>
      </div>
    ),
  },
}

export default function VoiceFAB({ onSaved }) {
  const location = useLocation()
  const config = PAGE_CONFIG[location.pathname]

  const [state, setState] = useState('idle')
  const [parsed, setParsed] = useState(null)
  const [rawText, setRawText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { isSupported, isListening, transcript, start, stop } = useVoiceRecognition({
    onResult: (text) => {
      setRawText(text)
      const result = config?.parse(text)
      if (result) {
        setParsed(result)
        setState('preview')
      } else {
        setErrorMsg(`Non ho capito "${text}". Prova: ${config?.hint}`)
        setState('error')
        setTimeout(() => setState('idle'), 4000)
      }
    },
  })

  // Mostra solo sulle pagine supportate
  if (!isSupported || !config) return null

  function handleMicClick() {
    if (state === 'listening') {
      stop()
    } else {
      setParsed(null)
      setRawText('')
      setErrorMsg('')
      setState('listening')
      start()
    }
  }

  async function handleConfirm() {
    if (!parsed) return
    setState('saving')
    try {
      await config.save(parsed)
      setState('success')
      if (onSaved) onSaved()
      setTimeout(() => setState('idle'), 2500)
    } catch (err) {
      setErrorMsg(err.response?.data?.messaggio || err.response?.data?.message || 'Errore salvataggio')
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  function handleCancel() {
    stop()
    setParsed(null)
    setState('idle')
  }

  if (state === 'idle') {
    return (
      <button
        onClick={handleMicClick}
        className={cn(
          'fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40 active:scale-95',
          config.color
        )}
        title={`Inserimento rapido ${config.label} vocale`}
      >
        <Mic className="w-6 h-6" />
      </button>
    )
  }

  if (state === 'listening') {
    return (
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 flex flex-col items-end gap-3">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-72">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Sto ascoltando...</p>
              <p className="text-xs text-gray-400 capitalize">{config.label}</p>
            </div>
          </div>
          {transcript && (
            <div className="bg-gray-50 rounded-lg p-2 mb-3">
              <p className="text-sm text-gray-600 italic">"{transcript}"</p>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mb-3">Es: {config.hint}</p>
          <button onClick={handleCancel}
            className="w-full px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> Annulla
          </button>
        </div>
      </div>
    )
  }

  if (state === 'preview' && parsed) {
    return (
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 flex flex-col items-end gap-3">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-72">
          <p className="text-xs text-gray-500 mb-2">Hai detto: "{rawText}"</p>
          {config.preview(parsed)}
          <div className="flex gap-2">
            <button onClick={handleCancel}
              className="flex-1 px-3 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
              <X className="w-4 h-4" /> No
            </button>
            <button onClick={handleConfirm}
              className="flex-1 px-3 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1">
              <Check className="w-4 h-4" /> Salva
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'saving') {
    return (
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-72 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Salvataggio in corso...</p>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40">
        <div className="bg-green-50 rounded-2xl shadow-xl border border-green-200 p-4 w-72 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-green-700 capitalize">{config.label} salvato!</p>
          {parsed && <p className="text-xs text-green-600 mt-1">{formatEuro(parsed.importo)}</p>}
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40">
        <div className="bg-red-50 rounded-2xl shadow-xl border border-red-200 p-4 w-72 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{errorMsg}</p>
        </div>
      </div>
    )
  }

  return null
}
