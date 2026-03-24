import { useState, useCallback, useRef, useEffect } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

/**
 * Hook per il riconoscimento vocale tramite Web Speech API
 * @param {Object} options
 * @param {string} options.lang - Lingua (default: 'it-IT')
 * @param {boolean} options.continuous - Riconoscimento continuo
 * @param {Function} options.onResult - Callback con il testo riconosciuto
 * @param {Function} options.onEnd - Callback quando il riconoscimento termina
 */
export function useVoiceRecognition({
  lang = 'it-IT',
  continuous = false,
  onResult,
  onEnd,
} = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  const isSupported = !!SpeechRecognition

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Riconoscimento vocale non supportato dal browser')
      return
    }

    setError(null)
    setTranscript('')

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      const text = finalTranscript || interimTranscript
      setTranscript(text)

      if (finalTranscript && onResult) {
        onResult(finalTranscript.trim())
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setError(`Errore: ${event.error}`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (onEnd) onEnd()
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, lang, continuous, onResult, onEnd])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const abort = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }
    setIsListening(false)
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    error,
    start,
    stop,
    abort,
  }
}

/**
 * Parser per interpretare comandi vocali di corrispettivi
 * Es: "centocinquanta euro contante" → { importo: 150, metodoPagamento: 'contante' }
 * Es: "duecento venti carta" → { importo: 220, metodoPagamento: 'carta' }
 */
export function parseVoiceCommand(text) {
  if (!text) return null

  const lower = text.toLowerCase().trim()

  // Estrai metodo pagamento
  let metodoPagamento = 'contante'
  if (lower.includes('carta') || lower.includes('bancomat')) {
    metodoPagamento = 'carta'
  } else if (lower.includes('pos')) {
    metodoPagamento = 'pos'
  } else if (lower.includes('bonifico')) {
    metodoPagamento = 'bonifico'
  }

  // Estrai importo numerico
  let importo = extractNumber(lower)

  if (importo === null) return null

  return {
    importo,
    metodoPagamento,
    data: new Date().toISOString().split('T')[0],
  }
}

function extractNumber(text) {
  // Prova numeri espliciti (es. "150", "250.50", "150,50")
  const numMatch = text.match(/(\d+[.,]?\d*)/)
  if (numMatch) {
    return parseFloat(numMatch[1].replace(',', '.'))
  }

  // Mappa parole italiane → numeri
  const words = {
    zero: 0, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5,
    sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
    undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15,
    sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20,
    trenta: 30, quaranta: 40, cinquanta: 50, sessanta: 60,
    settanta: 70, ottanta: 80, novanta: 90, cento: 100,
    duecento: 200, trecento: 300, quattrocento: 400, cinquecento: 500,
    seicento: 600, settecento: 700, ottocento: 800, novecento: 900,
    mille: 1000, duemila: 2000,
  }

  // Componi numeri composti (es. "centocinquanta" → 100 + 50 = 150)
  let cleaned = text.replace(/euro|contante|carta|pos|bonifico|e|virgola/g, ' ').trim()

  // Prova parole composte comuni
  const compositePatterns = [
    // centoX
    { pattern: /cento(\w+)/, base: 100 },
    { pattern: /duecento(\w+)/, base: 200 },
    { pattern: /trecento(\w+)/, base: 300 },
  ]

  for (const { pattern, base } of compositePatterns) {
    const match = cleaned.match(pattern)
    if (match) {
      const rest = match[1]
      const restVal = words[rest]
      if (restVal !== undefined) {
        return base + restVal
      }
    }
  }

  // Prova parole singole
  const parts = cleaned.split(/\s+/)
  let total = 0
  let found = false

  for (const part of parts) {
    if (words[part] !== undefined) {
      total += words[part]
      found = true
    }
  }

  return found ? total : null
}
