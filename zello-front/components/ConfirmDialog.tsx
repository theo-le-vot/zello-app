'use client'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  message?: string
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, message }: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">Confirmation</h2>
        <p className="text-sm text-gray-700 mb-6">{message || "Êtes-vous sûr de vouloir continuer ?"}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}
