import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { cn } from '@/lib/utils'

/**
 * Bottone microfono da affiancare a un campo input
 * @param {Object} props
 * @param {Function} props.onResult - Callback con il testo riconosciuto
 * @param {string} props.className - Classi aggiuntive
 * @param {'field'|'standalone'} props.variant - Stile del bottone
 */
export default function VoiceInput({ onResult, className, variant = 'field' }) {
  const { isSupported, isListening, transcript, start, stop } = useVoiceRecognition({
    onResult: (text) => {
      if (onResult) onResult(text)
    },
  })

  if (!isSupported) return null

  const handleClick = () => {
    if (isListening) {
      stop()
    } else {
      start()
    }
  }

  if (variant === 'standalone') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          className
        )}
      >
        {isListening ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {transcript ? <span className="max-w-[150px] truncate">{transcript}</span> : 'Ascoltando...'}
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" /> Voce
          </>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isListening ? 'Ferma registrazione' : 'Dettatura vocale'}
      className={cn(
        'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all',
        isListening
          ? 'bg-red-500 text-white animate-pulse'
          : 'text-gray-400 hover:text-primary hover:bg-primary/5',
        className
      )}
    >
      {isListening ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  )
}
