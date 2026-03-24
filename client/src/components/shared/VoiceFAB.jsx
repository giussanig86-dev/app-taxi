import { useState } from 'react'
import { Mic, MicOff, X, Check, Loader2, AlertCircle } from 'lucide-react'
import { useVoiceRecognition, parseVoiceCommand } from '@/hooks/useVoiceRecognition'
import { formatEuro, cn } from '@/lib/utils'
import { METODI_PAGAMENTO } from '@/lib/constants'
import api from '@/lib/api'

/**
 * Floating Action Button per inserimento rapido corrispettivo vocale
 * Il tassista preme il microfono, detta "centocinquanta euro contante" e il corrispettivo viene salvato
 */
export default function VoiceFAB({ onSaved }) {
  const [state, setState] = useState('idle') // idle | listening | preview | saving | success | error
  const [parsed, setParsed] = useState(null)
  const [rawText, setRawText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { isSupported, isListening, transcript, start, stop } = useVoiceRecognition({
    onResult: (text) => {
      setRawText(text)
      const result = parseVoiceCommand(text)
      if (result) {
        setParsed(result)
        setState('preview')
      } else {
        setErrorMsg(`Non ho capito "${text}". Prova: "centocinquanta euro contante"`)
        setState('error')
        setTimeout(() => setState('idle'), 4000)
      }
    },
    onEnd: () => {
      if (state === 'listening' && !parsed) {
        // Se finisce senza risultato
      }
    },
  })

  if (!isSupported) return null

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
      await api.post('/corrispettivi', {
        data: parsed.data,
        importo: parsed.importo,
        metodoPagamento: parsed.metodoPagamento,
      })
      setState('success')
      if (onSaved) onSaved()
      setTimeout(() => setState('idle'), 2500)
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Errore salvataggio')
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  function handleCancel() {
    stop()
    setParsed(null)
    setState('idle')
  }

  // Bottone principale FAB
  if (state === 'idle') {
    return (
      <button
        onClick={handleMicClick}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all flex items-center justify-center z-40 active:scale-95"
        title="Inserimento rapido vocale"
      >
        <Mic className="w-6 h-6" />
      </button>
    )
  }

  // Stato ascolto
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
              <p className="text-xs text-gray-400">Dì l'importo e il metodo</p>
            </div>
          </div>
          {transcript && (
            <div className="bg-gray-50 rounded-lg p-2 mb-3">
              <p className="text-sm text-gray-600 italic">"{transcript}"</p>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mb-3">Es: "centocinquanta euro contante" oppure "220 carta"</p>
          <button
            onClick={handleCancel}
            className="w-full px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> Annulla
          </button>
        </div>
      </div>
    )
  }

  // Anteprima con conferma
  if (state === 'preview' && parsed) {
    return (
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 flex flex-col items-end gap-3">
        <div className="bg-white rounded-2xl shadow-xl border border-primary/20 p-4 w-72">
          <p className="text-xs text-gray-500 mb-1">Hai detto: "{rawText}"</p>
          <div className="bg-primary/5 rounded-xl p-3 mb-3">
            <p className="text-2xl font-bold text-primary text-center">{formatEuro(parsed.importo)}</p>
            <p className="text-sm text-center text-gray-500 mt-1">
              {METODI_PAGAMENTO[parsed.metodoPagamento]} · Oggi
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
            >
              <X className="w-4 h-4" /> No
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-3 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> Salva
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Salvataggio
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

  // Successo
  if (state === 'success') {
    return (
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40">
        <div className="bg-green-50 rounded-2xl shadow-xl border border-green-200 p-4 w-72 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-green-700">Corrispettivo salvato!</p>
          {parsed && <p className="text-xs text-green-600 mt-1">{formatEuro(parsed.importo)} · {METODI_PAGAMENTO[parsed.metodoPagamento]}</p>}
        </div>
      </div>
    )
  }

  // Errore
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
