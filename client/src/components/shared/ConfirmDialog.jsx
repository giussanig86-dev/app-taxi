import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Conferma', danger = false }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${danger ? 'bg-danger hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
